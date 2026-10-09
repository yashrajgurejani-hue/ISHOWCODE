import { HandData, Landmark } from '../types';

/**
 * Generate synthetic 21-landmark hand coordinates for any of the 50 gestures.
 * Coordinates are normalized in [0, 1] frame space.
 */
export function generateSyntheticPose(sign: string, handedness: 'Left' | 'Right' = 'Right'): HandData {
  const baseX = handedness === 'Right' ? 0.55 : 0.45;
  const baseY = 0.65;

  // Base hand layout
  const wrist: Landmark = { x: baseX, y: baseY, z: 0 };

  // Base MCP coordinates (knuckles)
  const thumbCmc: Landmark = { x: baseX - 0.05, y: baseY - 0.04, z: 0 };
  const thumbMcp: Landmark = { x: baseX - 0.08, y: baseY - 0.08, z: 0 };
  const thumbIp: Landmark = { x: baseX - 0.10, y: baseY - 0.12, z: 0 };
  let thumbTip: Landmark = { x: baseX - 0.12, y: baseY - 0.16, z: 0 };

  const indexMcp: Landmark = { x: baseX - 0.04, y: baseY - 0.14, z: 0 };
  let indexPip: Landmark = { x: baseX - 0.04, y: baseY - 0.20, z: 0 };
  let indexDip: Landmark = { x: baseX - 0.04, y: baseY - 0.25, z: 0 };
  let indexTip: Landmark = { x: baseX - 0.04, y: baseY - 0.30, z: 0 };

  const middleMcp: Landmark = { x: baseX, y: baseY - 0.15, z: 0 };
  let middlePip: Landmark = { x: baseX, y: baseY - 0.21, z: 0 };
  let middleDip: Landmark = { x: baseX, y: baseY - 0.27, z: 0 };
  let middleTip: Landmark = { x: baseX, y: baseY - 0.33, z: 0 };

  const ringMcp: Landmark = { x: baseX + 0.04, y: baseY - 0.14, z: 0 };
  let ringPip: Landmark = { x: baseX + 0.04, y: baseY - 0.19, z: 0 };
  let ringDip: Landmark = { x: baseX + 0.04, y: baseY - 0.24, z: 0 };
  let ringTip: Landmark = { x: baseX + 0.04, y: baseY - 0.29, z: 0 };

  const pinkyMcp: Landmark = { x: baseX + 0.07, y: baseY - 0.12, z: 0 };
  let pinkyPip: Landmark = { x: baseX + 0.07, y: baseY - 0.16, z: 0 };
  let pinkyDip: Landmark = { x: baseX + 0.07, y: baseY - 0.20, z: 0 };
  let pinkyTip: Landmark = { x: baseX + 0.07, y: baseY - 0.24, z: 0 };

  const curlFinger = (mcpY: number, pip: Landmark, dip: Landmark, tip: Landmark, curlAmount: number = 0.8) => {
    pip.y = mcpY - 0.03;
    dip.y = mcpY - 0.01;
    tip.y = mcpY + 0.03 * curlAmount;
  };

  const curlAllExcept = (indices: number[]) => {
    if (!indices.includes(1)) curlFinger(indexMcp.y, indexPip, indexDip, indexTip);
    if (!indices.includes(2)) curlFinger(middleMcp.y, middlePip, middleDip, middleTip);
    if (!indices.includes(3)) curlFinger(ringMcp.y, ringPip, ringDip, ringTip);
    if (!indices.includes(4)) curlFinger(pinkyMcp.y, pinkyPip, pinkyDip, pinkyTip);
  };

  const norm = sign.toLowerCase().trim();

  if (norm.includes('thumbs up') || norm === 'yes') {
    curlAllExcept([]);
    thumbTip = { x: thumbMcp.x - 0.02, y: thumbMcp.y - 0.16, z: 0 };
  } else if (norm.includes('thumbs down') || norm === 'no') {
    curlAllExcept([]);
    thumbTip = { x: thumbMcp.x - 0.02, y: thumbMcp.y + 0.14, z: 0 };
  } else if (norm.includes('peace') || norm.includes('v-sign')) {
    curlAllExcept([1, 2]);
    indexTip.x -= 0.03;
    middleTip.x += 0.03;
    thumbTip = { x: ringMcp.x, y: ringMcp.y - 0.02, z: 0 };
  } else if (norm.includes('ok') || norm === 'ok sign') {
    curlAllExcept([2, 3, 4]);
    // thumb and index pinch
    indexTip = { x: baseX - 0.06, y: baseY - 0.15, z: 0 };
    thumbTip = { x: baseX - 0.06, y: baseY - 0.15, z: 0 };
  } else if (norm.includes('rock') || norm.includes('horns')) {
    curlAllExcept([1, 4]); // Index and Pinky up
    thumbTip = { x: middleMcp.x, y: middleMcp.y - 0.02, z: 0 };
  } else if (norm.includes('shaka') || norm.includes('chill')) {
    curlAllExcept([4]); // Pinky up
    thumbTip = { x: thumbMcp.x - 0.08, y: thumbMcp.y - 0.08, z: 0 }; // Thumb way out
  } else if (norm.includes('pointing') || norm.includes('look')) {
    curlAllExcept([1]); // Index straight up
    thumbTip = { x: middleMcp.x, y: middleMcp.y - 0.02, z: 0 };
  } else if (norm.includes('middle finger') || norm.includes('insult')) {
    curlAllExcept([2]); // Middle straight up
    thumbTip = { x: indexMcp.x, y: indexMcp.y - 0.02, z: 0 };
  } else if (norm.includes('fist') || norm.includes('respect') || norm.includes('bump')) {
    curlAllExcept([]);
    thumbTip = { x: indexMcp.x, y: indexMcp.y, z: 0 };
  } else if (norm.includes('finger gun') || norm.includes('aim')) {
    curlAllExcept([1]);
    indexTip = { x: indexMcp.x + 0.12, y: indexMcp.y - 0.02, z: 0 }; // pointing horizontal
    thumbTip = { x: thumbMcp.x, y: thumbMcp.y - 0.12, z: 0 }; // hammer up
  } else if (norm.includes('pinching') || norm.includes('little')) {
    curlAllExcept([]);
    indexTip = { x: baseX - 0.05, y: baseY - 0.16, z: 0 };
    thumbTip = { x: baseX - 0.06, y: baseY - 0.15, z: 0 };
  } else if (norm.includes('finger heart') || norm.includes('love')) {
    curlAllExcept([]);
    indexTip = { x: baseX - 0.05, y: baseY - 0.16, z: 0 };
    thumbTip = { x: baseX - 0.04, y: baseY - 0.17, z: 0 };
  } else if (norm.includes('vulcan') || norm.includes('prosper')) {
    // Index + Middle parted from Ring + Pinky
    indexTip.x -= 0.03;
    middleTip.x -= 0.02;
    ringTip.x += 0.03;
    pinkyTip.x += 0.04;
  } else if (norm.includes('namaste') || norm.includes('praying')) {
    // Hands pressed together upright pointing up
    wrist.x = handedness === 'Right' ? 0.52 : 0.48;
    wrist.y = 0.60;
    thumbTip = { x: wrist.x - (handedness === 'Right' ? 0.03 : -0.03), y: wrist.y - 0.12, z: 0 };
    indexTip = { x: wrist.x, y: wrist.y - 0.28, z: 0 };
    middleTip = { x: wrist.x, y: wrist.y - 0.30, z: 0 };
    ringTip = { x: wrist.x, y: wrist.y - 0.28, z: 0 };
    pinkyTip = { x: wrist.x, y: wrist.y - 0.24, z: 0 };
  } else if (norm.includes('heart') && (norm.includes('two') || norm.includes('handed'))) {
    // Two-handed heart arch
    wrist.x = handedness === 'Right' ? 0.56 : 0.44;
    wrist.y = 0.55;
    curlFinger(indexMcp.y, indexPip, indexDip, indexTip, 0.4);
    curlFinger(middleMcp.y, middlePip, middleDip, middleTip, 0.5);
    curlFinger(ringMcp.y, ringPip, ringDip, ringTip, 0.7);
    curlFinger(pinkyMcp.y, pinkyPip, pinkyDip, pinkyTip, 0.8);
    // Index meeting at top apex
    indexTip = { x: 0.50, y: 0.40, z: 0 };
    // Thumb meeting at bottom point
    thumbTip = { x: 0.50, y: 0.54, z: 0 };
  } else if (norm.includes('handshake')) {
    wrist.x = handedness === 'Right' ? 0.60 : 0.40;
    curlFinger(indexMcp.y, indexPip, indexDip, indexTip, 0.5);
    curlFinger(middleMcp.y, middlePip, middleDip, middleTip, 0.5);
    curlFinger(ringMcp.y, ringPip, ringDip, ringTip, 0.5);
    curlFinger(pinkyMcp.y, pinkyPip, pinkyDip, pinkyTip, 0.5);
  } else if (norm.includes('crossed wrists') || (norm.includes('arms') && norm.includes('cross'))) {
    wrist.x = handedness === 'Right' ? 0.48 : 0.52; // Wrists crossed
    curlAllExcept([]);
    thumbTip = { x: indexMcp.x, y: indexMcp.y, z: 0 };
  } else if (norm.includes('salute')) {
    wrist.x = 0.62;
    wrist.y = 0.36; // Elevated at temple level
    thumbTip = { x: indexMcp.x - 0.02, y: indexMcp.y + 0.02, z: 0 };
  } else if (norm.includes('shush')) {
    wrist.x = 0.50;
    wrist.y = 0.55;
    curlAllExcept([1]);
    indexTip = { x: 0.50, y: 0.32, z: 0 }; // At lips
  } else if (norm.includes('throat')) {
    wrist.x = 0.38;
    wrist.y = 0.46;
    curlAllExcept([1]);
    indexTip = { x: 0.58, y: 0.46, z: 0 }; // Horizontal neck swipe
  } else if (norm.includes('loser')) {
    wrist.x = 0.50;
    wrist.y = 0.36; // Forehead height
    curlAllExcept([1]);
    thumbTip = { x: 0.42, y: 0.32, z: 0 }; // 90 degree horizontal thumb
    indexTip = { x: 0.50, y: 0.20, z: 0 }; // Upright index
  } else if (norm.includes('facepalm') || (norm.includes('hand') && norm.includes('mouth'))) {
    wrist.x = 0.50;
    wrist.y = 0.44;
    curlFinger(indexMcp.y, indexPip, indexDip, indexTip, 0.3);
    curlFinger(middleMcp.y, middlePip, middleDip, middleTip, 0.3);
    curlFinger(ringMcp.y, ringPip, ringDip, ringTip, 0.3);
    curlFinger(pinkyMcp.y, pinkyPip, pinkyDip, pinkyTip, 0.3);
  } else if (norm.includes('stop') || norm.includes('wave') || norm.includes('hello') || norm.includes('high five') || norm.includes('speak')) {
    // Open flat hand
    thumbTip = { x: thumbMcp.x - 0.07, y: thumbMcp.y - 0.10, z: 0 };
  } else {
    // Default open gesture
    thumbTip = { x: thumbMcp.x - 0.05, y: thumbMcp.y - 0.08, z: 0 };
  }

  const landmarks: Landmark[] = [
    wrist,
    thumbCmc, thumbMcp, thumbIp, thumbTip,
    indexMcp, indexPip, indexDip, indexTip,
    middleMcp, middlePip, middleDip, middleTip,
    ringMcp, ringPip, ringDip, ringTip,
    pinkyMcp, pinkyPip, pinkyDip, pinkyTip,
  ];

  return {
    handedness,
    landmarks,
    score: 0.98,
  };
}
