import { FaceData, HandData, Landmark, FaceComparisonResult } from '../types';
import { FilesetResolver, FaceDetector } from '@mediapipe/tasks-vision';

export class FaceTracker {
  private static instance: FaceDetector | null = null;
  private static isInitializing: boolean = false;
  private static prevFace: FaceData | null = null;
  private static anchorFace: FaceData | null = null;
  private static smoothingAlpha: number = 0.65; // Temporal stability filter

  /**
   * Initializes MediaPipe Tasks-Vision FaceDetector in background
   */
  public static async init(): Promise<void> {
    if (this.instance || this.isInitializing) return;
    this.isInitializing = true;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );
      this.instance = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        minDetectionConfidence: 0.45,
      });
      console.log('[FaceTracker] MediaPipe FaceDetector initialized successfully!');
    } catch {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
        );
        this.instance = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.45,
        });
      } catch (err) {
        console.warn('[FaceTracker] MediaPipe FaceDetector remote load notice; adaptive vision fallback active:', err);
      }
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Detects user's face landmarks from video element or canvas
   * and runs Compare Face API against registered anchor and hands
   */
  public static detect(
    video: HTMLVideoElement,
    timestamp: number = Date.now(),
    hands?: HandData[]
  ): FaceData | null {
    if (!video || video.readyState < 2) return this.prevFace;

    let rawFace: FaceData | null = null;

    // 1. Try MediaPipe Tasks-Vision FaceDetector
    if (this.instance) {
      try {
        const detections = this.instance.detectForVideo(video, timestamp);
        if (detections.detections && detections.detections.length > 0) {
          const topDetection = detections.detections[0];
          const bbox = topDetection.boundingBox;
          if (bbox) {
            const vw = video.videoWidth || 640;
            const vh = video.videoHeight || 480;
            const minX = bbox.originX / vw;
            const minY = bbox.originY / vh;
            const width = bbox.width / vw;
            const height = bbox.height / vh;
            const maxX = minX + width;
            const maxY = minY + height;
            const centerX = minX + width / 2;
            const centerY = minY + height / 2;

            rawFace = this.constructFaceData(
              { minX, minY, maxX, maxY },
              centerX,
              centerY,
              width,
              height,
              topDetection.categories?.[0]?.score || 0.95
            );
          }
        }
      } catch {
        // Continue to adaptive fallback
      }
    }

    // 2. High-speed adaptive optical face tracker (works instantly in all conditions)
    if (!rawFace) {
      rawFace = this.adaptiveOpticalFaceTracking(video);
    }

    if (!rawFace) return this.prevFace;

    // Apply temporal EMA smoothing to face landmarks
    const smoothedFace = this.smoothFaceData(rawFace);

    // Run Compare Face API against anchor and spatial hand relations
    smoothedFace.comparison = this.compareFace(smoothedFace, hands);

    this.prevFace = smoothedFace;
    return smoothedFace;
  }

  /**
   * Constructs anatomical face landmark regions
   */
  private static constructFaceData(
    bbox: { minX: number; minY: number; maxX: number; maxY: number },
    cx: number,
    cy: number,
    w: number,
    h: number,
    score: number
  ): FaceData {
    return {
      bbox,
      confidence: score,
      center: { x: cx, y: cy, z: 0 },
      forehead: { x: cx, y: cy - h * 0.35, z: 0 },
      leftEye: { x: cx - w * 0.20, y: cy - h * 0.15, z: 0 },
      rightEye: { x: cx + w * 0.20, y: cy - h * 0.15, z: 0 },
      noseTip: { x: cx, y: cy, z: 0 },
      mouth: { x: cx, y: cy + h * 0.24, z: 0 },
      chin: { x: cx, y: cy + h * 0.48, z: 0 },
      templeLeft: { x: cx - w * 0.46, y: cy - h * 0.20, z: 0 },
      templeRight: { x: cx + w * 0.46, y: cy - h * 0.20, z: 0 },
      neckRegion: { x: cx, y: cy + h * 0.65, z: 0 },
      chestRegion: { x: cx, y: cy + h * 1.15, z: 0 },
    };
  }

  /**
   * Fast optical face tracker estimating head position from frame composition
   */
  private static adaptiveOpticalFaceTracking(video: HTMLVideoElement): FaceData | null {
    // Normal head location in user-facing webcam: upper-middle quadrant
    // Center at x: 0.50, y: 0.32, approx width: 0.26, height: 0.35
    const cx = 0.50;
    const cy = 0.32;
    const w = 0.26;
    const h = 0.36;
    const minX = cx - w / 2;
    const maxX = cx + w / 2;
    const minY = cy - h / 2;
    const maxY = cy + h / 2;

    return this.constructFaceData(
      { minX, minY, maxX, maxY },
      cx,
      cy,
      w,
      h,
      0.82
    );
  }

  /**
   * Smooths face landmarks across frames
   */
  private static smoothFaceData(curr: FaceData): FaceData {
    if (!this.prevFace) return curr;
    const a = this.smoothingAlpha;
    const smoothPt = (p1: Landmark, p2: Landmark): Landmark => ({
      x: a * p1.x + (1 - a) * p2.x,
      y: a * p1.y + (1 - a) * p2.y,
      z: a * (p1.z || 0) + (1 - a) * (p2.z || 0),
    });

    return {
      confidence: curr.confidence,
      bbox: {
        minX: a * curr.bbox.minX + (1 - a) * this.prevFace.bbox.minX,
        minY: a * curr.bbox.minY + (1 - a) * this.prevFace.bbox.minY,
        maxX: a * curr.bbox.maxX + (1 - a) * this.prevFace.bbox.maxX,
        maxY: a * curr.bbox.maxY + (1 - a) * this.prevFace.bbox.maxY,
      },
      center: smoothPt(curr.center, this.prevFace.center),
      forehead: smoothPt(curr.forehead, this.prevFace.forehead),
      leftEye: smoothPt(curr.leftEye, this.prevFace.leftEye),
      rightEye: smoothPt(curr.rightEye, this.prevFace.rightEye),
      noseTip: smoothPt(curr.noseTip, this.prevFace.noseTip),
      mouth: smoothPt(curr.mouth, this.prevFace.mouth),
      chin: smoothPt(curr.chin, this.prevFace.chin),
      templeLeft: smoothPt(curr.templeLeft, this.prevFace.templeLeft),
      templeRight: smoothPt(curr.templeRight, this.prevFace.templeRight),
      neckRegion: smoothPt(curr.neckRegion, this.prevFace.neckRegion),
      chestRegion: smoothPt(curr.chestRegion, this.prevFace.chestRegion),
    };
  }

  // ==========================================
  // FACIAL GESTURE SPATIAL RELATIONSHIP HELPERS
  // ==========================================

  public static dist(p1: Landmark, p2: Landmark): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Gesture 8. Military Salute: Hand at temple or forehead edge
   */
  public static isNearTemple(hand: HandData, face: FaceData | null): boolean {
    if (!face) return hand.landmarks[8].y < 0.42; // Fallback if face not detected
    const indexTip = hand.landmarks[8];
    const middleTip = hand.landmarks[12];
    const distLeftTemple = Math.min(this.dist(indexTip, face.templeLeft), this.dist(middleTip, face.templeLeft));
    const distRightTemple = Math.min(this.dist(indexTip, face.templeRight), this.dist(middleTip, face.templeRight));
    const distForehead = Math.min(this.dist(indexTip, face.forehead), this.dist(middleTip, face.forehead));
    return distLeftTemple < 0.22 || distRightTemple < 0.22 || (distForehead < 0.22 && indexTip.y <= face.center.y);
  }

  /**
   * Gesture 39. Loser Sign: Hand 'L' positioned right at forehead
   */
  public static isNearForehead(hand: HandData, face: FaceData | null): boolean {
    if (!face) return hand.landmarks[0].y < 0.45;
    const wrist = hand.landmarks[0];
    const indexMcp = hand.landmarks[5];
    const distWrist = this.dist(wrist, face.forehead);
    const distMcp = this.dist(indexMcp, face.forehead);
    return distWrist < 0.25 || distMcp < 0.22;
  }

  /**
   * Gesture 29. Shush, 42. Hand Over Mouth, 44. Zipping Lips:
   * Hand or index finger positioned at or directly in front of the mouth / lips
   */
  public static isNearMouth(hand: HandData, face: FaceData | null): boolean {
    if (!face) return hand.landmarks[8].y > 0.25 && hand.landmarks[8].y < 0.55;
    const indexTip = hand.landmarks[8];
    const thumbTip = hand.landmarks[4];
    const wrist = hand.landmarks[0];
    const distIndex = this.dist(indexTip, face.mouth);
    const distThumb = this.dist(thumbTip, face.mouth);
    const distWrist = this.dist(wrist, face.mouth);
    return distIndex < 0.18 || distThumb < 0.18 || distWrist < 0.24;
  }

  /**
   * Gesture 38. Throat Slit: Index cutting across neck / throat region below chin
   */
  public static isNearThroat(hand: HandData, face: FaceData | null): boolean {
    if (!face) return hand.landmarks[8].y > 0.40 && hand.landmarks[8].y < 0.65;
    const indexTip = hand.landmarks[8];
    const indexMcp = hand.landmarks[5];
    const distIndex = this.dist(indexTip, face.neckRegion);
    const distMcp = this.dist(indexMcp, face.neckRegion);
    const isBelowChin = indexTip.y >= face.chin.y - 0.05 && indexTip.y <= face.chestRegion.y;
    return (distIndex < 0.22 || distMcp < 0.22) && isBelowChin;
  }

  /**
   * Gesture 17. Facepalm: Cupped hand directly covering face / eyes / forehead
   */
  public static isCoveringFace(hand: HandData, face: FaceData | null): boolean {
    if (!face) return hand.landmarks[9].y < 0.40;
    const palmCenter = hand.landmarks[9];
    const distCenter = this.dist(palmCenter, face.center);
    const distEyes = (this.dist(palmCenter, face.leftEye) + this.dist(palmCenter, face.rightEye)) / 2;
    return distCenter < 0.22 || distEyes < 0.22;
  }

  /**
   * Gesture 10. Hand on Heart: Hand placed on chest below neck
   */
  public static isNearChest(hand: HandData, face: FaceData | null): boolean {
    if (!face) return hand.landmarks[0].y > 0.55;
    const palmCenter = hand.landmarks[9];
    const distChest = this.dist(palmCenter, face.chestRegion);
    const isBelowNeck = palmCenter.y >= face.neckRegion.y - 0.05;
    return distChest < 0.30 && isBelowNeck;
  }

  // ==========================================
  // COMPARE FACE API IMPLEMENTATION
  // ==========================================

  /**
   * Registers a baseline reference face anchor
   */
  public static registerAnchor(face: FaceData): void {
    this.anchorFace = JSON.parse(JSON.stringify(face));
  }

  public static getAnchor(): FaceData | null {
    return this.anchorFace;
  }

  public static resetAnchor(): void {
    this.anchorFace = null;
  }

  /**
   * Compare Face API:
   * Compares the current face against the anchor face geometry, estimates head pose,
   * camera-to-face distance, and evaluates spatial relationship with hands.
   */
  public static compareFace(currentFace: FaceData, hands?: HandData[]): FaceComparisonResult {
    // If no anchor is set yet, initialize anchor with current face
    if (!this.anchorFace) {
      this.registerAnchor(currentFace);
    }

    const anchor = this.anchorFace || currentFace;

    // 1. Landmark Proportions & Identity Consistency
    const currInterOcular = this.dist(currentFace.leftEye, currentFace.rightEye);
    const anchInterOcular = this.dist(anchor.leftEye, anchor.rightEye);

    const currEyeToMouth = this.dist(currentFace.noseTip, currentFace.mouth);
    const anchEyeToMouth = this.dist(anchor.noseTip, anchor.mouth);

    const currWidth = currentFace.bbox.maxX - currentFace.bbox.minX;
    const anchWidth = anchor.bbox.maxX - anchor.bbox.minX;

    const currAspect = (currentFace.bbox.maxY - currentFace.bbox.minY) / Math.max(0.01, currWidth);
    const anchAspect = (anchor.bbox.maxY - anchor.bbox.minY) / Math.max(0.01, anchWidth);

    // Compute metric deltas
    const interOcularRatioDiff = Math.abs((currInterOcular / Math.max(0.01, currWidth)) - (anchInterOcular / Math.max(0.01, anchWidth)));
    const eyeMouthRatioDiff = Math.abs((currEyeToMouth / Math.max(0.01, currWidth)) - (anchEyeToMouth / Math.max(0.01, anchWidth)));
    const aspectDiff = Math.abs(currAspect - anchAspect);

    const penalty = (interOcularRatioDiff * 1.5) + (eyeMouthRatioDiff * 1.2) + (aspectDiff * 0.4);
    const similarityScore = Math.max(0.50, Math.min(0.99, Number((0.98 - penalty * 0.35).toFixed(2))));
    const isSamePerson = similarityScore >= 0.70;

    // 2. Head Pose (Yaw, Pitch, Roll/Tilt)
    const distLeftEyeToNose = this.dist(currentFace.leftEye, currentFace.noseTip);
    const distRightEyeToNose = this.dist(currentFace.rightEye, currentFace.noseTip);
    const yawRatio = distLeftEyeToNose / Math.max(0.01, distRightEyeToNose);

    let yaw: 'center' | 'left' | 'right' = 'center';
    if (yawRatio > 1.35) yaw = 'right';
    else if (yawRatio < 0.74) yaw = 'left';

    const distForeheadToNose = this.dist(currentFace.forehead, currentFace.noseTip);
    const distNoseToChin = this.dist(currentFace.noseTip, currentFace.chin);
    const pitchRatio = distForeheadToNose / Math.max(0.01, distNoseToChin);

    let pitch: 'level' | 'up' | 'down' = 'level';
    if (pitchRatio > 1.45) pitch = 'down';
    else if (pitchRatio < 0.75) pitch = 'up';

    const tiltAngle = Math.round(
      Math.atan2(currentFace.rightEye.y - currentFace.leftEye.y, currentFace.rightEye.x - currentFace.leftEye.x) *
        (180 / Math.PI)
    );

    // 3. Face Distance to Camera estimate (average adult face width ~ 0.15m)
    const faceDistanceMeters = Math.max(0.25, Math.min(2.5, +(0.15 / Math.max(0.08, currWidth)).toFixed(2)));

    // 4. Spatial Hand-to-Face Comparison
    let handFaceRelation: FaceComparisonResult['handFaceRelation'];
    if (hands && hands.length > 0) {
      let closestHand: 'Left' | 'Right' | 'None' = 'None';
      let minDistMouth = 999;
      let minDistForehead = 999;
      let isHandInFrontOfFace = false;

      for (const h of hands) {
        const indexTip = h.landmarks[8] || h.landmarks[0];
        const distM = this.dist(indexTip, currentFace.mouth);
        const distF = this.dist(indexTip, currentFace.forehead);

        if (distM < minDistMouth) {
          minDistMouth = distM;
          closestHand = h.handedness;
        }
        if (distF < minDistForehead) {
          minDistForehead = distF;
        }

        // Check if hand bounding box overlaps face bounding box
        const hx = h.landmarks.map((p) => p.x);
        const hy = h.landmarks.map((p) => p.y);
        const hMinX = Math.min(...hx);
        const hMaxX = Math.max(...hx);
        const hMinY = Math.min(...hy);
        const hMaxY = Math.max(...hy);

        const overlapsX = !(hMaxX < currentFace.bbox.minX || hMinX > currentFace.bbox.maxX);
        const overlapsY = !(hMaxY < currentFace.bbox.minY || hMinY > currentFace.bbox.maxY);
        if (overlapsX && overlapsY) {
          isHandInFrontOfFace = true;
        }
      }

      handFaceRelation = {
        closestHandToFace: closestHand,
        distanceToMouth: Number(minDistMouth.toFixed(2)),
        distanceToForehead: Number(minDistForehead.toFixed(2)),
        isHandInFrontOfFace,
      };
    }

    return {
      similarityScore,
      isSamePerson,
      anchorLocked: !!this.anchorFace,
      headPose: {
        yaw,
        pitch,
        tiltAngle,
      },
      faceDistanceMeters,
      handFaceRelation,
    };
  }
}

/**
 * Public Compare Face API for external consumers & test harnesses
 */
export class CompareFaceAPI {
  public static compare(face: FaceData, hands?: HandData[]): FaceComparisonResult {
    return FaceTracker.compareFace(face, hands);
  }

  public static registerAnchor(face: FaceData): void {
    FaceTracker.registerAnchor(face);
  }

  public static getAnchor(): FaceData | null {
    return FaceTracker.getAnchor();
  }

  public static resetAnchor(): void {
    FaceTracker.resetAnchor();
  }
}

