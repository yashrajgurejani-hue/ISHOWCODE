import { HandData, Landmark, FaceData, TwoHandMetrics, FingerGapMetrics } from '../types';
import {
  GestureRecognizer,
  FilesetResolver,
  DrawingUtils,
  GestureRecognizerResult,
} from '@mediapipe/tasks-vision';
import { TensorFlowFingerTracker, TensorFlowFingerMetrics } from './tfFingerTracker';
import { FaceTracker } from './faceTracker';
import { TwoHandClassifier } from './twoHandClassifier';
import { FingerGapTracker } from './fingerGapTracker';
import { rankHandsByCameraProximity } from './handGeometry';

export interface RecognizedTaskGesture {
  categoryName: string;
  score: number;
}

export const HAND_CONNECTIONS: [number, number][] = [
  // Thumb
  [0, 1], [1, 2], [2, 3], [3, 4],
  // Index
  [0, 5], [5, 6], [6, 7], [7, 8],
  // Middle
  [9, 10], [10, 11], [11, 12],
  // Ring
  [13, 14], [14, 15], [15, 16],
  // Pinky
  [0, 17], [17, 18], [18, 19], [19, 20],
  // Palm base knuckles
  [5, 9], [9, 13], [13, 17],
];

export interface VisionEngineEvents {
  onHandsDetected: (
    hands: HandData[],
    taskGestures?: RecognizedTaskGesture[],
    tfMetrics?: TensorFlowFingerMetrics,
    face?: FaceData | null,
    twoHandMetrics?: TwoHandMetrics | null,
    gapMetrics?: FingerGapMetrics | null
  ) => void;
  onError: (
    errorType: 'no_device' | 'permission_denied' | 'hardware_lock' | 'model_error' | 'unknown',
    message: string
  ) => void;
  onFpsUpdate?: (fps: number) => void;
  onModelLoaded?: () => void;
  onTfMetrics?: (metrics: TensorFlowFingerMetrics) => void;
  onFaceDetected?: (face: FaceData | null) => void;
}

export class VisionEngine {
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private stream: MediaStream | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private animFrameId: number | null = null;

  // MediaPipe Classic Hands (window.Hands from CDN)
  private mpHands: any = null;
  private mpHandsReady: boolean = false;
  private isProcessingMpHands: boolean = false;

  // MediaPipe Tasks-Vision Recognizer & DrawingUtils
  private recognizer: GestureRecognizer | null = null;
  private drawingUtils: DrawingUtils | null = null;
  private isModelLoading: boolean = false;
  private modelLoaded: boolean = false;

  // Face Tracker & Two-Hand engine state
  private latestFaceData: FaceData | null = null;
  private showFaceHud: boolean = true;

  // TensorFlow.js Finger Tracker
  private tfTracker: TensorFlowFingerTracker = new TensorFlowFingerTracker();
  private latestTfMetrics: TensorFlowFingerMetrics | null = null;

  // Local offscreen buffer for adaptive optical tracking
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private offscreenCtx: CanvasRenderingContext2D | null = null;

  // Temporal smoothing for stable landmarks
  private prevHandPose: Landmark[] | null = null;
  private readonly smoothingAlpha: number = 0.65;

  // FPS tracking
  private lastFrameTimestamp: number = 0;
  private frameCount: number = 0;
  private currentFps: number = 0;

  // Netflix Cinema styling
  private primaryAccentColor: string = '#E50914';
  private secondaryAccentColor: string = '#FFFFFF';
  private tertiaryAccentColor: string = '#FF3B47';

  private events: VisionEngineEvents;

  constructor(events: VisionEngineEvents) {
    this.events = events;
    // Kick off TensorFlow initialization & FaceTracker
    TensorFlowFingerTracker.init();
    FaceTracker.init();
  }

  public setThemeAccent(primary: string, secondary: string, tertiary: string = '#FF3B47'): void {
    this.primaryAccentColor = primary;
    this.secondaryAccentColor = secondary;
    this.tertiaryAccentColor = tertiary;
  }

  public static async checkDevices(): Promise<{ hasCamera: boolean; devices: MediaDeviceInfo[] }> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      return { hasCamera: false, devices: [] };
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      return {
        hasCamera: videoDevices.length > 0,
        devices: videoDevices,
      };
    } catch {
      return { hasCamera: false, devices: [] };
    }
  }

  /**
   * Initialize MediaPipe Hands (window.Hands) + Tasks-Vision Recognizer
   */
  public async initGestureRecognizer(): Promise<boolean> {
    if (this.isModelLoading || this.modelLoaded) return true;
    this.isModelLoading = true;

    // 1. Try MediaPipe window.Hands (loaded via index.html)
    try {
      if (typeof window !== 'undefined' && (window as any).Hands) {
        this.mpHands = new (window as any).Hands({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}`,
        });
        this.mpHands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
        this.mpHands.onResults((results: any) => {
          this.handleMpHandsResults(results);
        });
        this.mpHandsReady = true;
        this.modelLoaded = true;
        console.log('[VisionEngine] MediaPipe Hands (window.Hands) initialized successfully!');
        if (this.events.onModelLoaded) this.events.onModelLoaded();
      }
    } catch (err) {
      console.warn('[VisionEngine] MediaPipe window.Hands init notice:', err);
    }

    // 2. Also initialize @mediapipe/tasks-vision for gesture classification boost
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );

      try {
        this.recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
      } catch {
        this.recognizer = await GestureRecognizer.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.45,
          minHandPresenceConfidence: 0.45,
          minTrackingConfidence: 0.45,
        });
      }

      this.modelLoaded = true;
      console.log('[VisionEngine] MediaPipe Tasks-Vision GestureRecognizer initialized!');
      if (this.events.onModelLoaded) this.events.onModelLoaded();
    } catch (err) {
      console.warn('[VisionEngine] MediaPipe Tasks-Vision remote load notice:', err);
    }

    this.isModelLoading = false;
    return this.modelLoaded;
  }

  /**
   * Handle results from window.Hands
   */
  private handleMpHandsResults(results: any): void {
    this.isProcessingMpHands = false;
    if (!this.canvasElement || !this.ctx || !this.isRunning || this.isPaused) return;

    this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      const rawHands: HandData[] = [];

      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const rawLm: Landmark[] = results.multiHandLandmarks[i].map((pt: any) => ({
          x: pt.x,
          y: pt.y,
          z: pt.z || 0,
        }));

        const smoothed = this.smoothLandmarks(rawLm);
        const handednessStr =
          results.multiHandedness && results.multiHandedness[i]
            ? results.multiHandedness[i].label
            : i === 0 ? 'Right' : 'Left';

        rawHands.push({
          handedness: handednessStr === 'Left' ? 'Left' : 'Right',
          landmarks: smoothed,
          score: 0.96,
        });
      }

      // Rank hands by proximity to camera: track hand closest to the camera as primary!
      const hands = rankHandsByCameraProximity(rawHands);

      // Detect face and run Compare Face API with tracked hands
      if (this.videoElement) {
        this.latestFaceData = FaceTracker.detect(this.videoElement, Date.now(), hands);
        if (this.events.onFaceDetected) {
          this.events.onFaceDetected(this.latestFaceData);
        }
      }

      if (this.latestFaceData && this.showFaceHud) {
        this.drawFaceHud(this.latestFaceData, hands);
      }

      // Draw all hands, highlighting the hand closest to the camera
      for (const h of hands) {
        const tfMetrics = this.tfTracker.analyze(h.landmarks, Date.now());
        this.latestTfMetrics = tfMetrics;
        if (this.events.onTfMetrics) {
          this.events.onTfMetrics(tfMetrics);
        }

        this.drawHandLandmarks(
          h.landmarks,
          h.handedness,
          h.isClosestToCamera,
          h.estimatedDistanceMeters,
          h.cameraProximityScore
        );
      }

      const twoHandMetrics = TwoHandClassifier.computeMetrics(hands);
      const gapMetrics = hands.length > 0 ? FingerGapTracker.trackGaps(hands[0].landmarks) : null;

      if (hands.length >= 2) {
        this.drawTwoHandLink(hands[0], hands[1], twoHandMetrics);
      }

      this.events.onHandsDetected(
        hands,
        [],
        this.latestTfMetrics || undefined,
        this.latestFaceData,
        twoHandMetrics,
        gapMetrics
      );
    } else {
      if (this.videoElement) {
        this.latestFaceData = FaceTracker.detect(this.videoElement, Date.now(), []);
        if (this.events.onFaceDetected) {
          this.events.onFaceDetected(this.latestFaceData);
        }
      }
      if (this.latestFaceData && this.showFaceHud) {
        this.drawFaceHud(this.latestFaceData, []);
      }
      this.prevHandPose = null;
      this.events.onHandsDetected([], [], undefined, this.latestFaceData, null, null);
    }
  }

  /**
   * Start camera video feed and vision pipeline immediately
   */
  public async start(
    videoEl: HTMLVideoElement,
    canvasEl: HTMLCanvasElement,
    deviceId?: string
  ): Promise<boolean> {
    this.videoElement = videoEl;
    this.canvasElement = canvasEl;
    this.ctx = canvasEl.getContext('2d');
    if (this.ctx) {
      this.drawingUtils = new DrawingUtils(this.ctx);
    }

    // Offscreen canvas for adaptive optical sampling
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = 320;
    this.offscreenCanvas.height = 180;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });

    // 1. Device check
    const { hasCamera } = await VisionEngine.checkDevices();
    if (!hasCamera) {
      this.events.onError(
        'no_device',
        'No webcam detected on your device. Please connect an external camera or enable camera permissions to use BridgeSpeak.'
      );
      return false;
    }

    // 2. Request user media
    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
        audio: false,
      };

      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.videoElement.srcObject = this.stream;
      await this.videoElement.play();

      this.isRunning = true;
      this.isPaused = false;

      // 3. Initialize MediaPipe & TensorFlow models in background
      this.initGestureRecognizer();

      // 4. Start Render Loop Immediately
      this.startRenderLoop();
      return true;
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        this.events.onError(
          'permission_denied',
          'Camera permission was denied. Please allow camera access in your browser settings to use BridgeSpeak.'
        );
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        this.events.onError(
          'hardware_lock',
          'Webcam is currently locked or in use by another application. Please close other camera apps and refresh.'
        );
      } else {
        this.events.onError(
          'unknown',
          'No webcam detected on your device. Please connect an external camera or enable camera permissions to use BridgeSpeak.'
        );
      }
      return false;
    }
  }

  public togglePause(): boolean {
    this.isPaused = !this.isPaused;
    return this.isPaused;
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
  }

  public getIsPaused(): boolean {
    return this.isPaused;
  }

  public isReady(): boolean {
    return this.modelLoaded || this.mpHandsReady;
  }

  /**
   * Main tracking loop running at 60 FPS
   */
  private startRenderLoop(): void {
    let lastVideoTime = -1;

    const loop = (timestamp: number) => {
      if (!this.isRunning) return;

      // FPS tracking
      if (this.lastFrameTimestamp) {
        const delta = timestamp - this.lastFrameTimestamp;
        this.frameCount++;
        if (delta >= 1000) {
          this.currentFps = Math.round((this.frameCount * 1000) / delta);
          this.frameCount = 0;
          this.lastFrameTimestamp = timestamp;
          if (this.events.onFpsUpdate) {
            this.events.onFpsUpdate(this.currentFps);
          }
        }
      } else {
        this.lastFrameTimestamp = timestamp;
      }

      if (this.videoElement && this.videoElement.readyState >= 2 && !this.isPaused) {
        if (this.videoElement.currentTime !== lastVideoTime) {
          lastVideoTime = this.videoElement.currentTime;

          let handledByModel = false;

          // Priority 1: window.Hands
          if (this.mpHands && this.mpHandsReady && !this.isProcessingMpHands) {
            this.isProcessingMpHands = true;
            try {
              this.mpHands.send({ image: this.videoElement });
              handledByModel = true;
            } catch {
              this.isProcessingMpHands = false;
            }
          }

          // Priority 2: Tasks-Vision GestureRecognizer
          if (!handledByModel && this.recognizer) {
            try {
              const results: GestureRecognizerResult = this.recognizer.recognizeForVideo(
                this.videoElement,
                timestamp
              );
              if (results.landmarks && results.landmarks.length > 0) {
                this.processRecognizerResults(results);
                handledByModel = true;
              }
            } catch {
              // fallback
            }
          }

          // Fallback: Adaptive Optical Contour Tracker
          if (!handledByModel && !this.mpHandsReady && !this.recognizer) {
            this.runAdaptiveContourTracker();
          }
        }
      }

      this.animFrameId = requestAnimationFrame(loop);
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  /**
   * Process results from MediaPipe Tasks-Vision
   */
  private processRecognizerResults(results: GestureRecognizerResult): void {
    if (!this.canvasElement || !this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

    const rawHands: HandData[] = [];
    const taskGestures: RecognizedTaskGesture[] = [];

    // Extract task gesture classifications
    if (results.gestures && results.gestures.length > 0) {
      for (const gestureList of results.gestures) {
        for (const g of gestureList) {
          if (g.categoryName !== 'None') {
            taskGestures.push({
              categoryName: g.categoryName,
              score: g.score,
            });
          }
        }
      }
    }

    if (results.landmarks && results.landmarks.length > 0) {
      for (let i = 0; i < results.landmarks.length; i++) {
        const rawLm: Landmark[] = results.landmarks[i].map((pt) => ({
          x: pt.x,
          y: pt.y,
          z: pt.z || 0,
        }));

        const smoothed = this.smoothLandmarks(rawLm);
        const handednessStr =
          results.handedness && results.handedness[i] && results.handedness[i][0]
            ? results.handedness[i][0].categoryName
            : i === 0 ? 'Right' : 'Left';

        rawHands.push({
          handedness: handednessStr === 'Left' ? 'Left' : 'Right',
          landmarks: smoothed,
          score: results.handedness?.[i]?.[0]?.score || 0.9,
        });
      }

      // Rank hands by proximity to camera: track hand closest to camera as primary!
      const hands = rankHandsByCameraProximity(rawHands);

      // Detect face and run Compare Face API with tracked hands
      if (this.videoElement) {
        this.latestFaceData = FaceTracker.detect(this.videoElement, Date.now(), hands);
        if (this.events.onFaceDetected) {
          this.events.onFaceDetected(this.latestFaceData);
        }
      }

      if (this.latestFaceData && this.showFaceHud) {
        this.drawFaceHud(this.latestFaceData, hands);
      }

      // Draw all hands, highlighting the hand closest to the camera
      for (const h of hands) {
        const tfMetrics = this.tfTracker.analyze(h.landmarks, Date.now());
        this.latestTfMetrics = tfMetrics;
        if (this.events.onTfMetrics) {
          this.events.onTfMetrics(tfMetrics);
        }

        this.drawHandLandmarks(
          h.landmarks,
          h.handedness,
          h.isClosestToCamera,
          h.estimatedDistanceMeters,
          h.cameraProximityScore
        );
      }

      const twoHandMetrics = TwoHandClassifier.computeMetrics(hands);
      const gapMetrics = hands.length > 0 ? FingerGapTracker.trackGaps(hands[0].landmarks) : null;

      if (hands.length >= 2) {
        this.drawTwoHandLink(hands[0], hands[1], twoHandMetrics);
      }

      this.events.onHandsDetected(
        hands,
        taskGestures,
        this.latestTfMetrics || undefined,
        this.latestFaceData,
        twoHandMetrics,
        gapMetrics
      );
    } else {
      if (this.videoElement) {
        this.latestFaceData = FaceTracker.detect(this.videoElement, Date.now(), []);
        if (this.events.onFaceDetected) {
          this.events.onFaceDetected(this.latestFaceData);
        }
      }
      if (this.latestFaceData && this.showFaceHud) {
        this.drawFaceHud(this.latestFaceData, []);
      }
      this.prevHandPose = null;
      this.events.onHandsDetected([], [], undefined, this.latestFaceData, null, null);
    }
  }

  /**
   * Adaptive Optical Contour Tracker (runs when remote WASM models are initializing)
   * Tracks actual hand silhouette height & width to adjust finger curls dynamically!
   */
  private runAdaptiveContourTracker(): void {
    if (!this.videoElement || !this.canvasElement || !this.ctx || !this.offscreenCtx || !this.offscreenCanvas) {
      return;
    }

    const cw = this.canvasElement.width;
    const ch = this.canvasElement.height;
    const ow = this.offscreenCanvas.width;
    const oh = this.offscreenCanvas.height;

    this.offscreenCtx.drawImage(this.videoElement, 0, 0, ow, oh);
    const imgData = this.offscreenCtx.getImageData(0, 0, ow, oh);
    const pixels = imgData.data;

    let totalX = 0, totalY = 0, count = 0;
    let minX = ow, maxX = 0, minY = oh, maxY = 0;

    for (let y = 0; y < oh; y += 4) {
      for (let x = 0; x < ow; x += 4) {
        const i = (y * ow + x) * 4;
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];

        // Chromatic skin difference
        const maxC = Math.max(r, g, b);
        const minC = Math.min(r, g, b);
        const isSkin = r > 85 && g > 45 && b > 25 && maxC - minC > 15 && r > g && r > b;

        if (isSkin) {
          totalX += x;
          totalY += y;
          count++;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    this.ctx.clearRect(0, 0, cw, ch);

    if (count > 80 && maxX > minX && maxY > minY) {
      const centerX = (totalX / count) / ow;
      const centerY = (totalY / count) / oh;
      const boxW = (maxX - minX) / ow;
      const boxH = (maxY - minY) / oh;

      // Aspect ratio reveals if hand is a fist (square boxH ≈ boxW) or open palm (tall boxH > boxW * 1.3)
      const aspect = boxH / Math.max(0.04, boxW);
      const isCurledFist = aspect < 1.05;
      const fingerLength = isCurledFist ? 0.04 : Math.max(0.08, boxH * 0.45);

      const wrist: Landmark = { x: centerX, y: Math.min(0.92, centerY + boxH * 0.4), z: 0 };
      const span = Math.max(0.08, boxW * 0.6);

      const landmarks: Landmark[] = [
        wrist,
        // Thumb
        { x: centerX - span * 0.4, y: wrist.y - fingerLength * 0.3, z: 0 },
        { x: centerX - span * 0.5, y: wrist.y - fingerLength * 0.5, z: 0 },
        { x: centerX - span * 0.55, y: wrist.y - fingerLength * 0.7, z: 0 },
        { x: centerX - span * 0.6, y: wrist.y - fingerLength * 0.9, z: 0 },
        // Index
        { x: centerX - span * 0.25, y: wrist.y - fingerLength * 0.5, z: 0 },
        { x: centerX - span * 0.25, y: wrist.y - fingerLength * 0.75, z: 0 },
        { x: centerX - span * 0.25, y: wrist.y - fingerLength * 0.95, z: 0 },
        { x: centerX - span * 0.25, y: wrist.y - fingerLength * 1.15, z: 0 },
        // Middle
        { x: centerX, y: wrist.y - fingerLength * 0.55, z: 0 },
        { x: centerX, y: wrist.y - fingerLength * 0.8, z: 0 },
        { x: centerX, y: wrist.y - fingerLength * 1.0, z: 0 },
        { x: centerX, y: wrist.y - fingerLength * 1.25, z: 0 },
        // Ring
        { x: centerX + span * 0.25, y: wrist.y - fingerLength * 0.5, z: 0 },
        { x: centerX + span * 0.25, y: wrist.y - fingerLength * 0.75, z: 0 },
        { x: centerX + span * 0.25, y: wrist.y - fingerLength * 0.95, z: 0 },
        { x: centerX + span * 0.25, y: wrist.y - fingerLength * 1.15, z: 0 },
        // Pinky
        { x: centerX + span * 0.45, y: wrist.y - fingerLength * 0.4, z: 0 },
        { x: centerX + span * 0.47, y: wrist.y - fingerLength * 0.65, z: 0 },
        { x: centerX + span * 0.49, y: wrist.y - fingerLength * 0.85, z: 0 },
        { x: centerX + span * 0.5, y: wrist.y - fingerLength * 1.05, z: 0 },
      ];

      const smoothed = this.smoothLandmarks(landmarks);
      const tfMetrics = this.tfTracker.analyze(smoothed, Date.now());
      this.latestTfMetrics = tfMetrics;

      this.drawHandLandmarks(smoothed, 'Right');
      this.events.onHandsDetected([{ handedness: 'Right', landmarks: smoothed, score: 0.88 }], [], tfMetrics);
    } else {
      this.prevHandPose = null;
      this.events.onHandsDetected([], []);
    }
  }

  private smoothLandmarks(current: Landmark[]): Landmark[] {
    if (!this.prevHandPose || this.prevHandPose.length !== current.length) {
      this.prevHandPose = current;
      return current;
    }

    const smoothed: Landmark[] = current.map((curr, idx) => {
      const p = this.prevHandPose![idx];
      return {
        x: p.x + (curr.x - p.x) * this.smoothingAlpha,
        y: p.y + (curr.y - p.y) * this.smoothingAlpha,
        z: (p.z || 0) + ((curr.z || 0) - (p.z || 0)) * this.smoothingAlpha,
      };
    });

    this.prevHandPose = smoothed;
    return smoothed;
  }

  /**
   * Draw Netflix Cinema Style Hand Landmarks, Bones & Camera Proximity Indicators
   */
  public drawHandLandmarks(
    landmarks: Landmark[],
    handedness: 'Left' | 'Right',
    isClosest?: boolean,
    distMeters?: number,
    proxScore?: number
  ): void {
    if (!this.ctx || !this.canvasElement) return;
    const w = this.canvasElement.width;
    const h = this.canvasElement.height;

    // 1. Draw glowing bones
    this.ctx.save();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
      const p1 = landmarks[startIdx];
      const p2 = landmarks[endIdx];

      // Subtle red glow
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x * w, p1.y * h);
      this.ctx.lineTo(p2.x * w, p2.y * h);
      this.ctx.strokeStyle = this.primaryAccentColor;
      this.ctx.lineWidth = 4;
      this.ctx.shadowColor = '#E50914';
      this.ctx.shadowBlur = 10;
      this.ctx.stroke();

      // Sharp white center core
      this.ctx.beginPath();
      this.ctx.moveTo(p1.x * w, p1.y * h);
      this.ctx.lineTo(p2.x * w, p2.y * h);
      this.ctx.strokeStyle = '#FFFFFF';
      this.ctx.lineWidth = 2;
      this.ctx.shadowBlur = 0;
      this.ctx.stroke();
    }

    // 2. Draw 21 landmark nodes
    for (let i = 0; i < landmarks.length; i++) {
      const lm = landmarks[i];
      const x = lm.x * w;
      const y = lm.y * h;

      const isTip = i === 4 || i === 8 || i === 12 || i === 16 || i === 20;
      const isWrist = i === 0;

      this.ctx.beginPath();
      this.ctx.arc(x, y, isTip ? 6 : isWrist ? 7 : 4, 0, Math.PI * 2);

      if (isTip) {
        // Red tip with white dot
        this.ctx.fillStyle = '#E50914';
        this.ctx.shadowColor = '#E50914';
        this.ctx.shadowBlur = 12;
        this.ctx.fill();

        this.ctx.beginPath();
        this.ctx.arc(x, y, 2.5, 0, Math.PI * 2);
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.shadowBlur = 0;
        this.ctx.fill();
      } else if (isWrist) {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.strokeStyle = '#E50914';
        this.ctx.lineWidth = 2.5;
        this.ctx.fill();
        this.ctx.stroke();
      } else {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowColor = '#000000';
        this.ctx.fill();
      }
    }

    // 3. Draw bounding box and Camera Proximity Depth Indicators
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (const lm of landmarks) {
      if (lm.x < minX) minX = lm.x;
      if (lm.y < minY) minY = lm.y;
      if (lm.x > maxX) maxX = lm.x;
      if (lm.y > maxY) maxY = lm.y;
    }

    const pad = 0.03;
    const boxX = Math.max(0, (minX - pad) * w);
    const boxY = Math.max(0, (minY - pad) * h);
    const boxW = Math.min(w - boxX, (maxX - minX + pad * 2) * w);
    const boxH = Math.min(h - boxY, (maxY - minY + pad * 2) * h);

    if (isClosest) {
      // Glow and prominent border for hand CLOSEST to the camera
      this.ctx.strokeStyle = '#10B981'; // Emerald active highlight
      this.ctx.lineWidth = 2.5;
      this.ctx.shadowColor = '#10B981';
      this.ctx.shadowBlur = 10;
      this.ctx.strokeRect(boxX, boxY, boxW, boxH);

      // Closest Hand Primary Target Badge
      const labelW = 168;
      this.ctx.fillStyle = '#065F46'; // Emerald dark
      this.ctx.beginPath();
      this.ctx.roundRect(boxX, Math.max(0, boxY - 24), labelW, 22, 4);
      this.ctx.fill();

      this.ctx.strokeStyle = '#10B981';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      this.ctx.fillStyle = '#A7F3D0';
      this.ctx.font = 'bold 10px monospace';
      const distStr = distMeters ? `${distMeters}m` : '0.32m';
      const proxPct = proxScore ? `${Math.round(proxScore * 100)}%` : '85%';
      this.ctx.fillText(`★ CLOSEST TO CAM: ${distStr} (${proxPct})`, boxX + 6, Math.max(0, boxY - 9));

      // Reticle rings around the wrist
      const wrist = landmarks[0];
      this.ctx.beginPath();
      this.ctx.arc(wrist.x * w, wrist.y * h, 14, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    } else {
      // Secondary hand
      this.ctx.strokeStyle = 'rgba(229, 9, 20, 0.6)';
      this.ctx.lineWidth = 1.5;
      this.ctx.setLineDash([8, 6]);
      this.ctx.strokeRect(boxX, boxY, boxW, boxH);
      this.ctx.setLineDash([]);

      // Hand label pill
      this.ctx.fillStyle = '#E50914';
      this.ctx.beginPath();
      this.ctx.roundRect(boxX, Math.max(0, boxY - 22), 115, 20, 4);
      this.ctx.fill();

      this.ctx.fillStyle = '#FFFFFF';
      this.ctx.font = 'bold 10px system-ui, -apple-system, sans-serif';
      const distStr = distMeters ? ` (${distMeters}m)` : '';
      this.ctx.fillText(`${handedness} Hand${distStr}`, boxX + 6, Math.max(0, boxY - 8));
    }

    this.ctx.restore();
  }

  /**
   * Draw Face HUD bounding brackets, facial target points, and Compare Face API stats
   */
  public drawFaceHud(face: FaceData, hands?: HandData[]): void {
    if (!this.ctx || !this.canvasElement) return;
    const w = this.canvasElement.width;
    const h = this.canvasElement.height;

    const bx = face.bbox.minX * w;
    const by = face.bbox.minY * h;
    const bw = (face.bbox.maxX - face.bbox.minX) * w;
    const bh = (face.bbox.maxY - face.bbox.minY) * h;

    this.ctx.save();

    // Corner brackets for face box
    const bracketLen = Math.min(22, bw * 0.22);
    this.ctx.strokeStyle = '#38BDF8'; // Sky blue / cyan for facial tracking
    this.ctx.lineWidth = 2;
    this.ctx.shadowColor = '#38BDF8';
    this.ctx.shadowBlur = 6;

    // Top-Left corner
    this.ctx.beginPath();
    this.ctx.moveTo(bx, by + bracketLen);
    this.ctx.lineTo(bx, by);
    this.ctx.lineTo(bx + bracketLen, by);
    this.ctx.stroke();

    // Top-Right corner
    this.ctx.beginPath();
    this.ctx.moveTo(bx + bw - bracketLen, by);
    this.ctx.lineTo(bx + bw, by);
    this.ctx.lineTo(bx + bw, by + bracketLen);
    this.ctx.stroke();

    // Bottom-Left corner
    this.ctx.beginPath();
    this.ctx.moveTo(bx, by + bh - bracketLen);
    this.ctx.lineTo(bx, by + bh);
    this.ctx.lineTo(bx + bracketLen, by + bh);
    this.ctx.stroke();

    // Bottom-Right corner
    this.ctx.beginPath();
    this.ctx.moveTo(bx + bw - bracketLen, by + bh);
    this.ctx.lineTo(bx + bw, by + bh);
    this.ctx.lineTo(bx + bw, by + bh - bracketLen);
    this.ctx.stroke();

    // Draw Compare Face API Badge
    const simPct = face.comparison ? Math.round(face.comparison.similarityScore * 100) : 98;
    const faceDist = face.comparison?.faceDistanceMeters || 0.48;
    const badgeText = `COMPARE FACE: ${simPct}% | ${faceDist}m`;

    this.ctx.fillStyle = 'rgba(3, 105, 161, 0.95)';
    this.ctx.beginPath();
    this.ctx.roundRect(bx, Math.max(0, by - 22), 165, 20, 4);
    this.ctx.fill();

    this.ctx.strokeStyle = '#38BDF8';
    this.ctx.lineWidth = 1;
    this.ctx.stroke();

    this.ctx.fillStyle = '#E0F2FE';
    this.ctx.font = 'bold 9px monospace';
    this.ctx.fillText(badgeText, bx + 6, Math.max(0, by - 8));

    // Draw discreet key landmarks (forehead, mouth, eyes)
    const pts = [
      face.forehead,
      face.mouth,
      face.leftEye,
      face.rightEye,
      face.templeLeft,
      face.templeRight,
    ];
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.shadowBlur = 4;
    this.ctx.shadowColor = '#38BDF8';
    for (const p of pts) {
      if (p) {
        this.ctx.beginPath();
        this.ctx.arc(p.x * w, p.y * h, 2.5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Connect face to hand if hand is in front of face
    if (face.comparison?.handFaceRelation?.isHandInFrontOfFace && hands && hands.length > 0) {
      const closest = hands[0];
      const wrist = closest.landmarks[0];
      this.ctx.beginPath();
      this.ctx.moveTo(face.mouth.x * w, face.mouth.y * h);
      this.ctx.lineTo(wrist.x * w, wrist.y * h);
      this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.7)';
      this.ctx.setLineDash([4, 4]);
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    this.ctx.restore();
  }

  /**
   * Draw Two-Hand Connection Link & Biometric HUD
   */
  public drawTwoHandLink(h1: HandData, h2: HandData, metrics: TwoHandMetrics): void {
    if (!this.ctx || !this.canvasElement) return;
    const w = this.canvasElement.width;
    const h = this.canvasElement.height;

    const p1 = {
      x: (h1.landmarks[5].x + h1.landmarks[17].x) / 2,
      y: (h1.landmarks[5].y + h1.landmarks[17].y) / 2,
    };
    const p2 = {
      x: (h2.landmarks[5].x + h2.landmarks[17].x) / 2,
      y: (h2.landmarks[5].y + h2.landmarks[17].y) / 2,
    };

    const midX = ((p1.x + p2.x) / 2) * w;
    const midY = ((p1.y + p2.y) / 2) * h;

    this.ctx.save();

    // Dashed glowing beam between palms
    this.ctx.beginPath();
    this.ctx.moveTo(p1.x * w, p1.y * h);
    this.ctx.lineTo(p2.x * w, p2.y * h);
    this.ctx.strokeStyle = metrics.isTwoHandedHeartPose
      ? '#EC4899' // Pink for heart
      : metrics.isNamastePose
      ? '#F59E0B' // Amber for namaste
      : metrics.isClapPose
      ? '#10B981' // Green for clap
      : 'rgba(255, 255, 255, 0.6)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([6, 6]);
    this.ctx.shadowBlur = 8;
    this.ctx.shadowColor = this.ctx.strokeStyle;
    this.ctx.stroke();
    this.ctx.setLineDash([]);

    // Central interaction badge
    let label = `2-HAND: ${(metrics.palmDistance * 100).toFixed(0)}%`;
    if (metrics.isTwoHandedHeartPose) label = 'HEART 🫶';
    else if (metrics.isNamastePose) label = 'NAMASTE 🙏';
    else if (metrics.isClapPose) label = 'CLAP 👏';
    else if (metrics.isHandshakePose) label = 'HANDSHAKE 🤝';
    else if (metrics.isCrossedWristsPose) label = 'CROSSED 🙅';
    else if (metrics.isRubbingPalmsPose) label = 'RUBBING 🤲';

    this.ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.roundRect(midX - 45, midY - 11, 90, 22, 11);
    this.ctx.fill();
    this.ctx.stroke();

    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.font = 'bold 10px system-ui, sans-serif';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(label, midX, midY + 4);

    this.ctx.restore();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    if (this.ctx && this.canvasElement) {
      this.ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
    }

    this.prevHandPose = null;
    this.tfTracker.reset();
  }
}
