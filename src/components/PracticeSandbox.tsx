import React, { useState, useEffect, useRef } from 'react';
import { ASL_GESTURE_REGISTRY } from '../services/gestureRegistry';
import { GestureDefinition, HandData, FaceData } from '../types';
import { generateSyntheticPose } from '../services/poseSimulator';
import { HAND_CONNECTIONS } from '../services/visionEngine';
import { TwoHandClassifier } from '../services/twoHandClassifier';
import { FingerGapTracker } from '../services/fingerGapTracker';
import confetti from 'canvas-confetti';
import {
  Trophy,
  CheckCircle2,
  Shuffle,
  ChevronRight,
  Sparkles,
  Play,
  Film,
  Smile,
  Users,
  Scan,
  Target,
} from 'lucide-react';

interface PracticeSandboxProps {
  theme?: 'dark' | 'light';
  detectedHands: HandData[];
  face?: FaceData | null;
  onTriggerSign: (sign: string) => void;
  initialGesture?: GestureDefinition | null;
}

export const PracticeSandbox: React.FC<PracticeSandboxProps> = ({
  detectedHands,
  face,
  onTriggerSign,
  initialGesture,
}) => {
  const [selectedGesture, setSelectedGesture] = useState<GestureDefinition>(
    initialGesture || ASL_GESTURE_REGISTRY[0]
  );
  const [matchScore, setMatchScore] = useState<number>(0);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [completedSigns, setCompletedSigns] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (initialGesture) {
      setSelectedGesture(initialGesture);
      setIsSuccess(false);
    }
  }, [initialGesture]);

  useEffect(() => {
    if (!detectedHands || detectedHands.length === 0) {
      setMatchScore(0);
      return;
    }

    // Always prioritize the hand closest to the camera for single-hand gestures
    const primaryHand = detectedHands.find((h) => h.isClosestToCamera) || detectedHands[0];
    const secondHand = detectedHands.find((h) => h !== primaryHand) || (detectedHands.length > 1 ? detectedHands[1] : null);
    const twoHandMetrics = TwoHandClassifier.computeMetrics(detectedHands);
    const gapMetrics = FingerGapTracker.trackGaps(primaryHand.landmarks);

    const score = selectedGesture.matchRule(
      primaryHand,
      undefined,
      face || null,
      secondHand,
      twoHandMetrics,
      gapMetrics
    );
    const scorePercent = Math.round(score * 100);
    setMatchScore(scorePercent);

    if (score >= 0.85 && !isSuccess) {
      setIsSuccess(true);
      if (!completedSigns.includes(selectedGesture.id)) {
        setCompletedSigns((prev) => [...prev, selectedGesture.id]);
      }

      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.65 },
        colors: ['#E50914', '#FFFFFF', '#FF3B47', '#10B981'],
      });
    }
  }, [detectedHands, face, selectedGesture, isSuccess, completedSigns]);

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const w = canvas.width;
    const h = canvas.height;

    const renderHandSkeleton = (hand: HandData, boneColor: string, jointColor: string) => {
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.strokeStyle = boneColor;
      ctx.shadowColor = boneColor;
      ctx.shadowBlur = 8;

      for (const [start, end] of HAND_CONNECTIONS) {
        const p1 = hand.landmarks[start];
        const p2 = hand.landmarks[end];
        if (p1 && p2) {
          ctx.beginPath();
          ctx.moveTo(p1.x * w, p1.y * h);
          ctx.lineTo(p2.x * w, p2.y * h);
          ctx.stroke();
        }
      }

      hand.landmarks.forEach((p, idx) => {
        ctx.beginPath();
        const r = idx === 0 ? 7 : idx % 4 === 0 ? 5.5 : 4;
        ctx.arc(p.x * w, p.y * h, r, 0, 2 * Math.PI);
        ctx.fillStyle = idx % 4 === 0 ? jointColor : '#FFFFFF';
        ctx.shadowColor = '#FFFFFF';
        ctx.shadowBlur = 6;
        ctx.fill();
      });
    };

    if (selectedGesture.isTwoHand) {
      const rightSynthetic = generateSyntheticPose(selectedGesture.sign, 'Right');
      const leftSynthetic = generateSyntheticPose(selectedGesture.sign, 'Left');
      renderHandSkeleton(leftSynthetic, '#06B6D4', '#38BDF8');
      renderHandSkeleton(rightSynthetic, '#E50914', '#FF3B47');
    } else {
      const synthetic = generateSyntheticPose(selectedGesture.sign, 'Right');
      renderHandSkeleton(synthetic, '#E50914', '#FF3B47');
    }
  }, [selectedGesture]);

  const handleNextSign = () => {
    setIsSuccess(false);
    const currentIndex = ASL_GESTURE_REGISTRY.findIndex((g) => g.id === selectedGesture.id);
    const next = ASL_GESTURE_REGISTRY[(currentIndex + 1) % ASL_GESTURE_REGISTRY.length];
    setSelectedGesture(next);
  };

  const handleRandomSign = () => {
    setIsSuccess(false);
    const random = ASL_GESTURE_REGISTRY[Math.floor(Math.random() * ASL_GESTURE_REGISTRY.length)];
    setSelectedGesture(random);
  };

  const handleSimulateSelf = () => {
    onTriggerSign(selectedGesture.sign);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-white">
      {/* Target Gesture & 3D Pose Reference */}
      <div className="lg:col-span-5 p-7 rounded-xl bg-[#181818] border border-neutral-800 shadow-[0_12px_30px_rgba(0,0,0,0.7)] flex flex-col justify-between gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-black uppercase tracking-widest text-[#E50914] bg-red-950/60 px-2.5 py-1 rounded border border-red-800/80">
              PDF Visual #{selectedGesture.pdfNumber} · Dictionary
            </span>
            <span className="text-xs font-bold text-neutral-400">
              {selectedGesture.categoryName}
            </span>
          </div>

          <div className="flex items-center gap-4 mb-3">
            <div className="w-16 h-16 rounded-2xl bg-neutral-900 border border-neutral-700 flex items-center justify-center text-4xl shadow-xl shrink-0">
              {selectedGesture.emoji}
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
                {selectedGesture.sign}
              </h2>
              <p className="text-xs text-neutral-400">
                Translation: <strong className="text-red-400 font-mono text-sm">&ldquo;{selectedGesture.outputText}&rdquo;</strong>
              </p>
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {selectedGesture.isTwoHand && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 border border-emerald-700 text-emerald-300 flex items-center gap-1">
                    <Users className="w-3 h-3 text-emerald-400" />
                    Two-Hand Gesture
                  </span>
                )}
                {selectedGesture.requiresFace && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950/80 border border-sky-700 text-sky-300 flex items-center gap-1">
                    <Smile className="w-3 h-3 text-sky-400" />
                    Face Position Required
                  </span>
                )}
                {selectedGesture.gapDifferentiator && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-neutral-900 border border-neutral-700 text-cyan-300 flex items-center gap-1">
                    <Scan className="w-3 h-3 text-cyan-400" />
                    {selectedGesture.gapDifferentiator}
                  </span>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-neutral-300 leading-relaxed mb-6 bg-black/60 p-3.5 rounded border border-neutral-800">
            {selectedGesture.poseDescription}
          </p>

          <div className="w-full aspect-square max-w-[280px] mx-auto rounded-lg bg-black border border-neutral-800 flex items-center justify-center relative shadow-inner">
            <canvas ref={canvasRef} width={300} height={300} className="w-full h-full object-contain" />
            <div className="absolute bottom-2 left-3 text-[10px] text-neutral-500 font-mono tracking-wider">
              Neural Skeleton Guide
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-3 border-t border-neutral-800">
          <button
            onClick={handleSimulateSelf}
            className="flex-1 py-3 px-4 rounded bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 border border-neutral-700 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#E50914]" />
            <span>Simulate Sign</span>
          </button>

          <button
            onClick={handleRandomSign}
            className="p-3 rounded bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-800 transition-all cursor-pointer"
            title="Random Sign"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          <button
            onClick={handleNextSign}
            className="py-3 px-5 rounded bg-[#E50914] hover:bg-[#C10711] text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow transition-all cursor-pointer"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Right Column: Accuracy & Catalog Picker */}
      <div className="lg:col-span-7 flex flex-col gap-6">
        <div className="p-7 rounded-xl bg-[#181818] border border-neutral-800 shadow-[0_12px_30px_rgba(0,0,0,0.7)] flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold flex items-center gap-2.5">
              <Trophy className="w-5 h-5 text-[#E50914]" />
              <span>Real-Time Pose Accuracy</span>
            </h3>
            <span
              className="font-mono text-3xl font-black tabular-nums"
              style={{ color: matchScore >= 80 ? '#10B981' : matchScore >= 50 ? '#E50914' : '#666666' }}
            >
              {matchScore}%
            </span>
          </div>

          <div className="w-full bg-black h-3 rounded-full overflow-hidden p-0.5 border border-neutral-800">
            <div
              className="h-full transition-all duration-300 rounded-full"
              style={{
                width: `${matchScore}%`,
                backgroundColor: matchScore >= 80 ? '#10B981' : '#E50914',
              }}
            />
          </div>

          {/* Master Physical Finger Target Profile */}
          <div className="p-3 rounded-lg bg-black/60 border border-neutral-800">
            <span className="text-[10px] font-mono font-bold text-neutral-400 uppercase tracking-wider block mb-2">
              Target Finger States (Consolidated Master Standard):
            </span>
            <div className="grid grid-cols-5 gap-2 text-center text-[10px] font-mono">
              {[
                { name: 'Thumb (40%)', state: selectedGesture.fingerStates.thumb },
                { name: 'Index (25%)', state: selectedGesture.fingerStates.index },
                { name: 'Middle (20%)', state: selectedGesture.fingerStates.middle },
                { name: 'Ring (10%)', state: selectedGesture.fingerStates.ring },
                { name: 'Pinky (5%)', state: selectedGesture.fingerStates.pinky },
              ].map((f) => {
                const badgeColor =
                  f.state === 'Open'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : f.state === 'Curved'
                    ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                    : f.state === 'Bent'
                    ? 'bg-amber-950 text-amber-400 border-amber-800'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800';

                return (
                  <div key={f.name} className="flex flex-col items-center">
                    <span className="text-[9px] text-neutral-500 mb-1">{f.name}</span>
                    <span className={`w-full py-1 rounded font-bold border uppercase text-[10px] ${badgeColor}`}>
                      {f.state}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Proximity & Compare Face Status Strip */}
          <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-neutral-900/80 border border-neutral-800 text-[11px] font-mono">
            {detectedHands.length > 0 ? (
              (() => {
                const closest = detectedHands.find((h) => h.isClosestToCamera) || detectedHands[0];
                return (
                  <span className="px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-700 text-emerald-300 font-bold flex items-center gap-1">
                    <Target className="w-3 h-3 text-emerald-400" />
                    Closest Hand: {closest.handedness} ({closest.estimatedDistanceMeters || 0.32}m)
                  </span>
                );
              })()
            ) : (
              <span className="text-neutral-500">Awaiting hands in webcam frame...</span>
            )}

            {face ? (
              <span className="px-2 py-0.5 rounded bg-sky-950/80 border border-sky-700 text-sky-300 font-bold flex items-center gap-1">
                <Smile className="w-3 h-3 text-sky-400" />
                Compare Face: {face.comparison ? `${Math.round(face.comparison.similarityScore * 100)}% Match` : 'Active'} ({face.comparison?.faceDistanceMeters || 0.48}m)
              </span>
            ) : selectedGesture.requiresFace ? (
              <span className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-700 text-amber-300 font-bold flex items-center gap-1">
                <Smile className="w-3 h-3 text-amber-400" />
                Face Position Required for this sign
              </span>
            ) : null}

            {detectedHands.length >= 2 && (
              <span className="px-2 py-0.5 rounded bg-purple-950/80 border border-purple-700 text-purple-300 font-bold flex items-center gap-1">
                <Users className="w-3 h-3 text-purple-400" />
                2 Hands in Frame
              </span>
            )}
          </div>

          {isSuccess ? (
            <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-700/80 text-emerald-300 flex items-center justify-between animate-fade-in shadow-lg">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm">Sign Mastered!</h4>
                  <p className="text-xs text-emerald-400/90">
                    Your hand landmarks matched the ASL standard for &ldquo;{selectedGesture.sign}&rdquo;.
                  </p>
                </div>
              </div>
              <button
                onClick={handleNextSign}
                className="px-4 py-2 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wide cursor-pointer shadow"
              >
                Next Sign
              </button>
            </div>
          ) : (
            <p className="text-xs text-neutral-400">
              Hold your hand up to the camera or click &ldquo;Simulate Sign&rdquo; to test real-time gesture matching.
            </p>
          )}
        </div>

        {/* Catalog Shelf Grid */}
        <div className="p-7 rounded-xl bg-[#181818] border border-neutral-800 shadow-[0_12px_30px_rgba(0,0,0,0.7)] flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider text-neutral-300 flex items-center gap-2">
              <Film className="w-4 h-4 text-[#E50914]" />
              <span>Select Sign ({completedSigns.length} / 50 Mastered)</span>
            </h4>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 gap-2 max-h-72 overflow-y-auto p-1 scrollbar-thin">
            {ASL_GESTURE_REGISTRY.map((g) => {
              const isSelected = selectedGesture.id === g.id;
              const isMastered = completedSigns.includes(g.id);
              return (
                <button
                  key={g.id}
                  onClick={() => {
                    setSelectedGesture(g);
                    setIsSuccess(false);
                  }}
                  className={`p-2 rounded-xl text-center border transition-all cursor-pointer flex flex-col items-center justify-center gap-1 ${
                    isSelected
                      ? 'bg-[#E50914] text-white border-[#E50914] shadow-lg scale-105 z-10'
                      : isMastered
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/80 hover:border-emerald-500'
                      : 'bg-black text-neutral-300 border-neutral-800 hover:text-white hover:border-neutral-600 hover:bg-neutral-900'
                  }`}
                  title={`#${g.pdfNumber} ${g.sign}`}
                >
                  <span className="text-xl">{g.emoji}</span>
                  <span className="text-[10px] font-mono text-neutral-400 font-bold block">
                    #{g.pdfNumber}
                  </span>
                  <span className="text-[10px] font-bold truncate max-w-full block leading-tight">
                    {g.sign}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
