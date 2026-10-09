import {
  HandData,
  DetectionResult,
  GestureDefinition,
  Landmark,
  FaceData,
  TwoHandMetrics,
  FingerGapMetrics,
} from '../types';
import { ASL_GESTURE_REGISTRY } from './gestureRegistry';
import { RecognizedTaskGesture } from './visionEngine';
import { TensorFlowFingerMetrics } from './tfFingerTracker';

export class GestureClassifier {
  private frameBuffer: HandData[][] = [];
  private maxBufferSize: number = 30;

  // Temporal Landmark Smoothing (Exponential Moving Average filter)
  private prevSmoothedLandmarks: Landmark[] | null = null;
  private readonly SMOOTHING_ALPHA: number = 0.55; // 0.55 current + 0.45 previous

  // Stability & Intent Lock-In Progress
  private candidateSign: GestureDefinition | null = null;
  private candidateHoldFrames: number = 0;
  private readonly DEFAULT_HOLD_FRAMES: number = 4; // ~120ms of stable pose to confirm intent
  private currentRequiredHoldFrames: number = 4;

  // Strict Anti-Repeat Lock Engine ("dont translate it again at the same moment")
  private lastCommittedSign: string | null = null;
  private lastCommittedTime: number = 0;
  private readonly MANDATORY_COOLDOWN_MS: number = 2200; // 2.2s cooldown
  private handNeedsReset: boolean = false; // flag requiring hand to leave/relax before same sign can re-commit
  private lastHandSeenTime: number = 0;

  // Responsive confidence threshold
  private confidenceThreshold: number = 0.58;

  /**
   * Process hands with TensorFlow metrics + Face alignment + Two-Hand tracking + Finger Gaps + MediaPipe task gestures
   */
  public processHands(
    hands: HandData[],
    taskGestures: RecognizedTaskGesture[] = [],
    tfMetrics?: TensorFlowFingerMetrics | null,
    face?: FaceData | null,
    twoHandMetrics?: TwoHandMetrics | null,
    gapMetrics?: FingerGapMetrics | null,
    onUICommand?: (command: 'stop' | 'repeat' | 'slow' | 'emergency') => void
  ): { result: DetectionResult | null; shouldCommit: boolean } {
    const now = Date.now();

    // If hands dropped for > 300ms, reset the hand reset lock so signer can sign again
    if (!hands || hands.length === 0) {
      if (now - this.lastHandSeenTime > 300) {
        this.candidateSign = null;
        this.candidateHoldFrames = 0;
        this.handNeedsReset = false;
        this.lastCommittedSign = null;
        this.prevSmoothedLandmarks = null;
      }
      return { result: null, shouldCommit: false };
    }

    this.lastHandSeenTime = now;

    // Identify the hand closest to the camera as primary hand to eliminate background hand interference
    const rawPrimaryHand = hands.find((h) => h.isClosestToCamera) || hands[0];
    const secondHand = hands.find((h) => h !== rawPrimaryHand) || (hands.length > 1 ? hands[1] : null);
    let smoothedLandmarks = rawPrimaryHand.landmarks;

    if (this.prevSmoothedLandmarks && this.prevSmoothedLandmarks.length === rawPrimaryHand.landmarks.length) {
      smoothedLandmarks = rawPrimaryHand.landmarks.map((lm, i) => {
        const prev = this.prevSmoothedLandmarks![i];
        return {
          x: this.SMOOTHING_ALPHA * lm.x + (1 - this.SMOOTHING_ALPHA) * prev.x,
          y: this.SMOOTHING_ALPHA * lm.y + (1 - this.SMOOTHING_ALPHA) * prev.y,
          z: this.SMOOTHING_ALPHA * (lm.z || 0) + (1 - this.SMOOTHING_ALPHA) * (prev.z || 0),
          visibility: lm.visibility,
        };
      });
    }

    this.prevSmoothedLandmarks = smoothedLandmarks;

    const primaryHand: HandData = {
      ...rawPrimaryHand,
      landmarks: smoothedLandmarks,
    };

    // 1. Real-time-GesRec Dynamic Gestures from TensorFlow Tracker
    let dynamicMatch: GestureDefinition | null = null;
    let dynamicScore = 0;

    if (tfMetrics && tfMetrics.dynamicGesture) {
      switch (tfMetrics.dynamicGesture) {
        case 'Swipe_Left':
          dynamicMatch = ASL_GESTURE_REGISTRY.find((g) => g.sign === 'Stop / Halt' || g.sign === 'Thumbs Down') || null;
          dynamicScore = 0.94;
          break;
        case 'Swipe_Right':
          dynamicMatch = ASL_GESTURE_REGISTRY.find((g) => g.sign === 'Thumbs Up' || g.sign === 'Open Palm Wave') || null;
          dynamicScore = 0.94;
          break;
        case 'Swipe_Up':
          dynamicMatch = ASL_GESTURE_REGISTRY.find((g) => g.sign === 'Stand Up' || g.sign === 'High Five') || null;
          dynamicScore = 0.92;
          break;
        case 'Swipe_Down':
          dynamicMatch = ASL_GESTURE_REGISTRY.find((g) => g.sign === 'Calm Down' || g.sign === 'Sit Down') || null;
          dynamicScore = 0.92;
          break;
        case 'Waving':
          dynamicMatch = ASL_GESTURE_REGISTRY.find((g) => g.sign === 'Open Palm Wave') || null;
          dynamicScore = 0.96;
          break;
        case 'Beckoning':
          dynamicMatch = ASL_GESTURE_REGISTRY.find((g) => g.sign === 'Beckoning') || null;
          dynamicScore = 0.95;
          break;
      }
    }

    // 2. MediaPipe Task Model classification boost
    let taskBoostSign: GestureDefinition | null = null;
    let taskBoostScore = 0;

    if (taskGestures.length > 0) {
      const topTask = taskGestures[0];
      if (topTask.score > 0.55) {
        switch (topTask.categoryName) {
          case 'Open_Palm':
            taskBoostSign = ASL_GESTURE_REGISTRY.find((g) => g.sign === 'Open Palm Wave' || g.sign === 'Stop / Halt' || g.sign === 'High Five') || null;
            taskBoostScore = topTask.score;
            break;
          case 'Victory':
            taskBoostSign = ASL_GESTURE_REGISTRY.find((g) => g.sign === 'Peace Sign / V-Sign') || null;
            taskBoostScore = topTask.score;
            break;
          case 'Pointing_Up':
            taskBoostSign = ASL_GESTURE_REGISTRY.find((g) => g.sign === 'Pointing Index Finger' || g.sign === 'Raised Hand') || null;
            taskBoostScore = topTask.score;
            break;
          case 'Thumb_Up':
            taskBoostSign = ASL_GESTURE_REGISTRY.find((g) => g.sign === 'Thumbs Up') || null;
            taskBoostScore = topTask.score;
            break;
          case 'Thumb_Down':
            taskBoostSign = ASL_GESTURE_REGISTRY.find((g) => g.sign === 'Thumbs Down') || null;
            taskBoostScore = topTask.score;
            break;
          case 'Closed_Fist':
            taskBoostSign = ASL_GESTURE_REGISTRY.find((g) => g.sign === 'Fist Bump' || g.sign === 'Fist Shake') || null;
            taskBoostScore = topTask.score;
            break;
          case 'ILoveYou':
            taskBoostSign = ASL_GESTURE_REGISTRY.find((g) => g.sign === 'Finger Heart (Crossed)' || g.sign === 'Rock On / Horns') || null;
            taskBoostScore = topTask.score;
            break;
        }
      }
    }

    // 3. Evaluate ASL Gesture Registry against geometric landmarks + Face alignment + Two-Hand metrics
    let bestMatch: GestureDefinition | null = dynamicMatch;
    let highestScore = dynamicScore;
    let runnerUpScore = 0;

    for (const gesture of ASL_GESTURE_REGISTRY) {
      let score = gesture.matchRule(primaryHand, this.frameBuffer, face, secondHand, twoHandMetrics, gapMetrics);

      // Boost if MediaPipe task model matches ONLY if gesture was geometrically valid!
      // If gesture was rejected or disqualified (score < 0.4), do not resurrect it
      if (taskBoostSign && taskBoostSign.id === gesture.id && score >= 0.4) {
        score = Math.min(0.98, Math.max(score, (score + taskBoostScore) / 2));
      }

      // Check Two-Hand metrics priority if 2 hands present
      if (twoHandMetrics && twoHandMetrics.handsPresent >= 2 && gesture.isTwoHand) {
        if (gesture.sign.includes('Handshake') && twoHandMetrics.isHandshakePose) {
          score = Math.max(score, twoHandMetrics.confidenceScores['Handshake (Gripping)'] || 0.96);
        } else if (gesture.sign.includes('Clap') && twoHandMetrics.isClapPose) {
          score = Math.max(score, twoHandMetrics.confidenceScores['Clapping'] || 0.96);
        } else if ((gesture.sign.includes('Praying') || gesture.sign.includes('Namaste')) && twoHandMetrics.isNamastePose) {
          score = Math.max(score, twoHandMetrics.confidenceScores['Praying Hands / Namaste'] || 0.98);
        } else if (gesture.sign.includes('Crossed Wrists') && twoHandMetrics.isCrossedWristsPose) {
          score = Math.max(score, twoHandMetrics.confidenceScores['Crossed Wrists (Fists)'] || 0.97);
        } else if (gesture.sign.includes('Rubbing') && twoHandMetrics.isRubbingPalmsPose) {
          score = Math.max(score, twoHandMetrics.confidenceScores['Rubbing Palms Together'] || 0.96);
        } else if (gesture.sign.includes('Two-Handed Heart') && twoHandMetrics.isTwoHandedHeartPose) {
          score = Math.max(score, twoHandMetrics.confidenceScores['Two-Handed Heart'] || 0.97);
        }
      }

      if (score > highestScore) {
        runnerUpScore = highestScore;
        highestScore = score;
        bestMatch = gesture;
      } else if (score > runnerUpScore) {
        runnerUpScore = score;
      }
    }

    // Dynamic hysteresis: If top match is close to runner-up, require extra hold frames for rock-solid stability
    const scoreMargin = highestScore - runnerUpScore;
    this.currentRequiredHoldFrames = scoreMargin < 0.08 ? this.DEFAULT_HOLD_FRAMES + 2 : this.DEFAULT_HOLD_FRAMES;

    // If confidence below threshold, decay lock progress and return
    if (!bestMatch || highestScore < this.confidenceThreshold) {
      this.candidateHoldFrames = Math.max(0, this.candidateHoldFrames - 1);
      if (this.candidateHoldFrames === 0) {
        this.handNeedsReset = false;
      }
      return { result: null, shouldCommit: false };
    }

    // Compute hand bounding box
    let minX = 1, minY = 1, maxX = 0, maxY = 0;
    for (const lm of primaryHand.landmarks) {
      if (lm.x < minX) minX = lm.x;
      if (lm.y < minY) minY = lm.y;
      if (lm.x > maxX) maxX = lm.x;
      if (lm.y > maxY) maxY = lm.y;
    }

    // If second hand exists, expand bounding box to cover both
    if (secondHand) {
      for (const lm of secondHand.landmarks) {
        if (lm.x < minX) minX = lm.x;
        if (lm.y < minY) minY = lm.y;
        if (lm.x > maxX) maxX = lm.x;
        if (lm.y > maxY) maxY = lm.y;
      }
    }

    const isTwoHandActive = !!(bestMatch.isTwoHand && hands.length >= 2);
    const isFaceAligned = !!(bestMatch.requiresFace && face);
    const modelSource = isTwoHandActive
      ? 'two_hand_engine'
      : dynamicMatch
      ? 'tfjs_realtime_gesrec'
      : taskBoostSign
      ? 'mediapipe_tasks'
      : 'asl_classifier';

    // 4. Track Candidate Hold Frames (Lock-in progress)
    if (this.candidateSign && this.candidateSign.id === bestMatch.id) {
      this.candidateHoldFrames++;
    } else {
      this.candidateSign = bestMatch;
      this.candidateHoldFrames = 1;
      this.handNeedsReset = false;
    }

    const lockProgress = Math.min(1.0, this.candidateHoldFrames / this.currentRequiredHoldFrames);

    // 5. ANTI-REPEAT DEBOUNCE CHECK:
    const isSameAsLastCommitted = this.lastCommittedSign === bestMatch.sign;
    const isWithinCooldown = now - this.lastCommittedTime < this.MANDATORY_COOLDOWN_MS;

    if (isSameAsLastCommitted && (isWithinCooldown || this.handNeedsReset)) {
      const detection: DetectionResult = {
        gesture: bestMatch,
        confidence: highestScore,
        hand: primaryHand.handedness,
        timestamp: now,
        state: 'cooldown',
        lockProgress: 1.0,
        modelSource,
        boundingBox: { minX, minY, maxX, maxY },
        isTwoHand: isTwoHandActive,
        faceAligned: isFaceAligned,
        gapMetrics: gapMetrics || undefined,
      };
      return { result: detection, shouldCommit: false };
    }

    // 6. If gesture is still stabilizing (hold frames < REQUIRED_HOLD_FRAMES)
    if (lockProgress < 1.0) {
      const detection: DetectionResult = {
        gesture: bestMatch,
        confidence: highestScore,
        hand: primaryHand.handedness,
        timestamp: now,
        state: 'locking',
        lockProgress,
        modelSource,
        boundingBox: { minX, minY, maxX, maxY },
        isTwoHand: isTwoHandActive,
        faceAligned: isFaceAligned,
        gapMetrics: gapMetrics || undefined,
      };
      return { result: detection, shouldCommit: false };
    }

    // 7. COMMIT THE GESTURE ONCE!
    this.lastCommittedSign = bestMatch.sign;
    this.lastCommittedTime = now;
    this.handNeedsReset = true;

    if (bestMatch.uiAction && onUICommand) {
      onUICommand(bestMatch.uiAction);
    }

    const detection: DetectionResult = {
      gesture: bestMatch,
      confidence: highestScore,
      hand: primaryHand.handedness,
      timestamp: now,
      state: 'committed',
      lockProgress: 1.0,
      modelSource,
      boundingBox: { minX, minY, maxX, maxY },
      isTwoHand: isTwoHandActive,
      faceAligned: isFaceAligned,
      gapMetrics: gapMetrics || undefined,
    };

    return { result: detection, shouldCommit: true };
  }

  public reset(): void {
    this.frameBuffer = [];
    this.candidateSign = null;
    this.candidateHoldFrames = 0;
    this.lastCommittedSign = null;
    this.lastCommittedTime = 0;
    this.handNeedsReset = false;
    this.lastHandSeenTime = 0;
  }
}

