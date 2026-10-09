import { HandData, Landmark, TwoHandMetrics } from '../types';
import { distance2D, extractHandFeatures } from './handGeometry';

export class TwoHandClassifier {
  /**
   * Computes spatial, geometric, and orientation metrics between two hands
   */
  public static computeMetrics(hands: HandData[]): TwoHandMetrics {
    if (!hands || hands.length === 0) {
      return this.emptyMetrics(0);
    }

    if (hands.length === 1) {
      return this.emptyMetrics(1);
    }

    const hand1 = hands[0];
    const hand2 = hands[1];

    if (!hand1.landmarks || hand1.landmarks.length < 21 || !hand2.landmarks || hand2.landmarks.length < 21) {
      return this.emptyMetrics(hands.length);
    }

    const lm1 = hand1.landmarks;
    const lm2 = hand2.landmarks;

    const wrist1 = lm1[0];
    const wrist2 = lm2[0];

    const palmCenter1: Landmark = {
      x: (lm1[5].x + lm1[17].x) / 2,
      y: (lm1[5].y + lm1[17].y) / 2,
      z: 0,
    };
    const palmCenter2: Landmark = {
      x: (lm2[5].x + lm2[17].x) / 2,
      y: (lm2[5].y + lm2[17].y) / 2,
      z: 0,
    };

    const wristDistance = Number(distance2D(wrist1, wrist2).toFixed(3));
    const palmDistance = Number(distance2D(palmCenter1, palmCenter2).toFixed(3));
    const indexTipDistance = Number(distance2D(lm1[8], lm2[8]).toFixed(3));
    const thumbTipDistance = Number(distance2D(lm1[4], lm2[4]).toFixed(3));
    const middleTipDistance = Number(distance2D(lm1[12], lm2[12]).toFixed(3));

    // Biomechanical features of both hands
    const feat1 = extractHandFeatures(lm1);
    const feat2 = extractHandFeatures(lm2);

    const bio1 = feat1?.biomechanics;
    const bio2 = feat2?.biomechanics;

    // Determine relative orientation
    let relativeOrientation: 'facing' | 'parallel' | 'crossed' | 'stacked' | 'arched' | 'apart' = 'apart';

    if (wristDistance < 0.18) {
      relativeOrientation = 'crossed';
    } else if (palmDistance < 0.25) {
      relativeOrientation = 'facing';
    } else if (indexTipDistance < 0.20 && thumbTipDistance < 0.20) {
      relativeOrientation = 'arched';
    } else if (palmDistance < 0.35) {
      relativeOrientation = 'parallel';
    }

    // ==========================================
    // TRAIN & SCORE THE 6 TWO-HAND GESTURES
    // ==========================================

    const conf: Record<string, number> = {};

    // 1. Handshake (Gripping) (#4)
    // Bent fingers ~50% on both hands, wrists facing, palms close in gripping distance
    let handshakeScore = 0;
    if (bio1 && bio2) {
      const bothBent =
        bio1.index > 25 && bio1.index < 75 &&
        bio2.index > 25 && bio2.index < 75 &&
        bio1.middle > 25 && bio1.middle < 75 &&
        bio2.middle > 25 && bio2.middle < 75;
      const proximity = palmDistance < 0.28 && wristDistance < 0.42;
      if (bothBent && proximity) {
        handshakeScore = Number((0.85 + (0.28 - palmDistance) * 0.5).toFixed(2));
      }
    }
    conf['Handshake (Gripping)'] = Math.min(0.98, handshakeScore);

    // 2. Clap / Clapping (#21)
    // Open flat palms facing each other in direct close contact
    let clapScore = 0;
    if (bio1 && bio2) {
      const bothOpen = bio1.functionalScore > 65 && bio2.functionalScore > 65;
      const palmsFacingClose = palmDistance < 0.20 && wristDistance < 0.35;
      if (bothOpen && palmsFacingClose) {
        clapScore = Number((0.88 + (0.20 - palmDistance) * 0.5).toFixed(2));
      }
    }
    conf['Clapping'] = Math.min(0.98, clapScore);

    // 3. Praying Hands / Namaste (#7)
    // Flat open palms pressed together, fingertips touching pointing UP, wrists touching
    let namasteScore = 0;
    if (bio1 && bio2) {
      const bothOpen = bio1.functionalScore > 70 && bio2.functionalScore > 70;
      const tipsTouching = indexTipDistance < 0.16 && middleTipDistance < 0.16;
      const wristsTouching = wristDistance < 0.24;
      const pointingUp = lm1[8].y < wrist1.y && lm2[8].y < wrist2.y;
      if (bothOpen && tipsTouching && wristsTouching && pointingUp) {
        namasteScore = Number((0.92 + (0.16 - indexTipDistance) * 0.4).toFixed(2));
      }
    }
    conf['Praying Hands / Namaste'] = Math.min(0.98, namasteScore);

    // 4. Arms Cross / Crossed Wrists (#45)
    // Both hands closed in tight fists, wrists crossing or intersecting
    let crossedWristsScore = 0;
    if (bio1 && bio2) {
      const bothFists = bio1.functionalScore < 35 && bio2.functionalScore < 35;
      const wristsCrossed = wristDistance < 0.18;
      if (bothFists && wristsCrossed) {
        crossedWristsScore = Number((0.90 + (0.18 - wristDistance) * 0.5).toFixed(2));
      }
    }
    conf['Crossed Wrists (Fists)'] = Math.min(0.98, crossedWristsScore);

    // 5. Rubbing Palms Together (#24)
    // Both hands open, flat palms in sliding contact rubbing against each other
    let rubbingScore = 0;
    if (bio1 && bio2) {
      const bothOpen = bio1.functionalScore > 68 && bio2.functionalScore > 68;
      const palmsContact = palmDistance < 0.18 && wristDistance < 0.32;
      if (bothOpen && palmsContact) {
        rubbingScore = Number((0.88 + (0.18 - palmDistance) * 0.5).toFixed(2));
      }
    }
    conf['Rubbing Palms Together'] = Math.min(0.98, rubbingScore);

    // 6. Two-Handed Heart / Heart on Hand (#19)
    // Both thumbs touching at the bottom, index tips touching at top, fingers bent/curved forming heart outline
    let heartScore = 0;
    if (bio1 && bio2) {
      const bothCurved =
        bio1.index > 30 && bio1.index < 85 &&
        bio2.index > 30 && bio2.index < 85 &&
        bio1.thumb > 30 && bio2.thumb > 30;
      const thumbsMeet = thumbTipDistance < 0.16;
      const indexMeet = indexTipDistance < 0.18;
      const hollowCenter = palmDistance > 0.12 && palmDistance < 0.38;
      if (bothCurved && thumbsMeet && indexMeet && hollowCenter) {
        heartScore = Number((0.92 + (0.16 - thumbTipDistance) * 0.4).toFixed(2));
      }
    }
    conf['Two-Handed Heart'] = Math.min(0.98, heartScore);

    return {
      wristDistance,
      palmDistance,
      indexTipDistance,
      thumbTipDistance,
      middleTipDistance,
      handsPresent: 2,
      relativeOrientation,
      isHandshakePose: handshakeScore >= 0.75,
      isClapPose: clapScore >= 0.75,
      isNamastePose: namasteScore >= 0.75,
      isCrossedWristsPose: crossedWristsScore >= 0.75,
      isRubbingPalmsPose: rubbingScore >= 0.75,
      isTwoHandedHeartPose: heartScore >= 0.75,
      confidenceScores: conf,
    };
  }

  private static emptyMetrics(handsPresent: number): TwoHandMetrics {
    return {
      wristDistance: 1.0,
      palmDistance: 1.0,
      indexTipDistance: 1.0,
      thumbTipDistance: 1.0,
      middleTipDistance: 1.0,
      handsPresent,
      relativeOrientation: 'apart',
      isHandshakePose: false,
      isClapPose: false,
      isNamastePose: false,
      isCrossedWristsPose: false,
      isRubbingPalmsPose: false,
      isTwoHandedHeartPose: false,
      confidenceScores: {},
    };
  }
}
