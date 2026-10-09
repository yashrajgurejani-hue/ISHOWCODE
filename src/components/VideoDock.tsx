import React, { useRef, useEffect, useState } from 'react';
import { VisionEngine, RecognizedTaskGesture } from '../services/visionEngine';
import { CaptionConfig, DetectionResult, HandData, FaceData, TwoHandMetrics, FingerGapMetrics } from '../types';
import { CaptionController } from '../services/captionController';
import { generateSyntheticPose } from '../services/poseSimulator';
import { TTSService } from '../services/ttsService';
import { TensorFlowFingerMetrics } from '../services/tfFingerTracker';
import {
  Camera,
  CameraOff,
  Sliders,
  Sparkles,
  Layers,
  AlertTriangle,
  Play,
  Pause,
  CheckCircle2,
  Lock,
  Volume2,
  Activity,
  Maximize2,
  RotateCw,
  Cpu,
  Smile,
  Scan,
  Users,
  Target,
} from 'lucide-react';

interface VideoDockProps {
  onHandsDetected: (
    hands: HandData[],
    taskGestures?: RecognizedTaskGesture[],
    tfMetrics?: TensorFlowFingerMetrics,
    face?: FaceData | null,
    twoHandMetrics?: TwoHandMetrics | null,
    gapMetrics?: FingerGapMetrics | null
  ) => void;
  latestDetection: DetectionResult | null;
  captionConfig: CaptionConfig;
  onOpenCaptionSettings: () => void;
  currentPhrase: string;
  theme?: 'dark' | 'light';
  isCameraActive: boolean;
  setIsCameraActive: (active: boolean) => void;
  isPaused: boolean;
  onTogglePause: () => void;
}

export const VideoDock: React.FC<VideoDockProps> = ({
  onHandsDetected,
  latestDetection,
  captionConfig,
  onOpenCaptionSettings,
  currentPhrase,
  isCameraActive,
  setIsCameraActive,
  isPaused,
  onTogglePause,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const visionEngineRef = useRef<VisionEngine | null>(null);

  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [cameraErrorModal, setCameraErrorModal] = useState<string | null>(null);
  const [fps, setFps] = useState<number>(0);
  const [isMirror, setIsMirror] = useState<boolean>(true);
  const [simulationActive, setSimulationActive] = useState<boolean>(false);
  const [simulatedSign, setSimulatedSign] = useState<string>('HELLO');
  const [modelReady, setModelReady] = useState<boolean>(false);

  // TensorFlow HUD State
  const [showTfHud, setShowTfHud] = useState<boolean>(true);
  const [tfMetrics, setTfMetrics] = useState<TensorFlowFingerMetrics | null>(null);

  // Face Tracking & Finger Gap HUD State
  const [faceData, setFaceData] = useState<FaceData | null>(null);
  const [twoHandMetrics, setTwoHandMetrics] = useState<TwoHandMetrics | null>(null);
  const [gapMetrics, setGapMetrics] = useState<FingerGapMetrics | null>(null);
  const [showGapHud, setShowGapHud] = useState<boolean>(true);
  const [showFaceCompareHud, setShowFaceCompareHud] = useState<boolean>(true);
  const [currentHands, setCurrentHands] = useState<HandData[]>([]);

  // Audio status
  const [audioTesting, setAudioTesting] = useState<boolean>(false);

  useEffect(() => {
    VisionEngine.checkDevices().then(({ devices }) => {
      setAvailableDevices(devices);
      if (devices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(devices[0].deviceId);
      }
    });
  }, []);

  useEffect(() => {
    const engine = new VisionEngine({
      onHandsDetected: (hands, taskGestures, metrics, face, twoHand, gaps) => {
        if (hands) setCurrentHands(hands);
        if (metrics) setTfMetrics(metrics);
        if (face !== undefined) setFaceData(face || null);
        if (twoHand !== undefined) setTwoHandMetrics(twoHand || null);
        if (gaps !== undefined) setGapMetrics(gaps || null);
        onHandsDetected(hands, taskGestures, metrics, face, twoHand, gaps);
      },
      onError: (_errType, msg) => {
        setIsCameraActive(false);
        setCameraErrorModal(msg);
      },
      onFpsUpdate: (currentFps) => {
        setFps(currentFps);
      },
      onModelLoaded: () => {
        setModelReady(true);
      },
      onTfMetrics: (metrics) => {
        setTfMetrics(metrics);
      },
      onFaceDetected: (face) => {
        setFaceData(face || null);
      },
    });

    // Netflix red and cinema white accents for skeleton
    engine.setThemeAccent('#E50914', '#FFFFFF', '#FF3B47');
    visionEngineRef.current = engine;

    return () => {
      engine.stop();
    };
  }, []);

  const handleStartCamera = async () => {
    if (!videoRef.current || !canvasRef.current || !visionEngineRef.current) return;
    setCameraErrorModal(null);
    setSimulationActive(false);

    // Also trigger audio unlock on user click!
    TTSService.unlockAudio();

    const success = await visionEngineRef.current.start(
      videoRef.current,
      canvasRef.current,
      selectedDeviceId || undefined
    );

    if (success) {
      setIsCameraActive(true);
    }
  };

  const handleStopCamera = () => {
    if (visionEngineRef.current) {
      visionEngineRef.current.stop();
    }
    setIsCameraActive(false);
    setFps(0);
    setTfMetrics(null);
  };

  const handleTestAudio = () => {
    setAudioTesting(true);
    TTSService.unlockAudio();
    TTSService.speak('BridgeSpeak voice online. Audio output verified.');
    setTimeout(() => setAudioTesting(false), 2000);
  };

  const triggerSimulation = (sign: string) => {
    setSimulationActive(true);
    setSimulatedSign(sign);
    const mockHand = generateSyntheticPose(sign, 'Right');

    if (canvasRef.current && visionEngineRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        visionEngineRef.current.drawHandLandmarks(mockHand.landmarks, 'Right');
      }
    }

    onHandsDetected([mockHand], []);
  };

  const handleTogglePause = () => {
    if (visionEngineRef.current) {
      visionEngineRef.current.togglePause();
    }
    onTogglePause();
  };

  return (
    <div className="w-full flex flex-col gap-3">
      {/* 16:9 Cinema Container */}
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-neutral-800 shadow-[0_20px_50px_rgba(0,0,0,0.8)] group">
        {/* HTML5 Video element */}
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover transition-transform duration-300 ${
            isMirror ? '-scale-x-100' : ''
          }`}
        />

        {/* High-Performance Canvas for Landmark Skeleton */}
        <canvas
          ref={canvasRef}
          width={1280}
          height={720}
          className={`absolute inset-0 w-full h-full pointer-events-none ${
            isMirror ? '-scale-x-100' : ''
          }`}
        />

        {/* Netflix Red Cinema Top Gradient */}
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-b from-black/80 via-black/30 to-transparent pointer-events-none" />

        {/* TOP STATUS BAR: Live badge, FPS, Model, TensorFlow */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-auto z-20">
          <div className="flex items-center gap-2.5">
            {isCameraActive ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#E50914] text-white text-xs font-black uppercase tracking-wider shadow-[0_0_15px_rgba(229,9,20,0.8)] animate-pulse">
                <span className="w-2 h-2 rounded-full bg-white" />
                Live Camera
              </span>
            ) : simulationActive ? (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded bg-amber-600 text-white text-xs font-black uppercase tracking-wider shadow">
                <Sparkles className="w-3.5 h-3.5" />
                Simulation: {simulatedSign}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded bg-neutral-900/90 text-neutral-400 border border-neutral-700 text-xs font-bold uppercase tracking-wider">
                <CameraOff className="w-3.5 h-3.5" />
                Camera Offline
              </span>
            )}

            {isCameraActive && (
              <span className="px-2.5 py-1 rounded bg-black/75 backdrop-blur border border-neutral-800 text-neutral-300 text-xs font-mono font-bold">
                {fps} FPS
              </span>
            )}

            {/* Compare Face API Badge Button */}
            {faceData && (
              <span
                onClick={() => setShowFaceCompareHud(!showFaceCompareHud)}
                className={`px-2.5 py-1 rounded backdrop-blur border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                  showFaceCompareHud
                    ? 'bg-sky-950/90 border-sky-500 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.3)]'
                    : 'bg-black/60 border-neutral-800 text-neutral-400 hover:text-white'
                }`}
                title="Click to toggle Compare Face API & Depth Inspector HUD"
              >
                <Smile className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  Compare Face {faceData.comparison ? `${Math.round(faceData.comparison.similarityScore * 100)}%` : 'ON'}
                </span>
              </span>
            )}

            {/* Hand Closest to Camera Tracking Badge */}
            {currentHands.length > 0 && (() => {
              const closest = currentHands.find((h) => h.isClosestToCamera) || currentHands[0];
              return (
                <span className="px-2.5 py-1 rounded backdrop-blur border text-xs font-mono font-bold flex items-center gap-1.5 bg-emerald-950/90 border-emerald-500 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                  <Target className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>
                    Closest: {closest.handedness} ({closest.estimatedDistanceMeters || 0.32}m)
                  </span>
                </span>
              );
            })()}

            {/* Two-Hand Sync Badge */}
            {twoHandMetrics && twoHandMetrics.handsPresent >= 2 && (
              <span className="px-2.5 py-1 rounded backdrop-blur border text-xs font-mono font-bold flex items-center gap-1.5 bg-emerald-950/80 border-emerald-600 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.3)] animate-pulse">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>2-Hand Mode ({twoHandMetrics.relativeOrientation})</span>
              </span>
            )}

            {/* Finger Gap HUD Button */}
            <span
              onClick={() => setShowGapHud(!showGapHud)}
              className={`px-2.5 py-1 rounded backdrop-blur border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                showGapHud
                  ? 'bg-neutral-900/90 border-cyan-500 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                  : 'bg-black/60 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
              title="Click to toggle Finger Gap Tracker HUD"
            >
              <Scan className="w-3.5 h-3.5 text-cyan-400" />
              <span>Gaps {showGapHud ? 'ON' : 'OFF'}</span>
            </span>

            {/* TensorFlow Status Badge */}
            <span
              onClick={() => setShowTfHud(!showTfHud)}
              className={`px-2.5 py-1 rounded backdrop-blur border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-colors ${
                showTfHud
                  ? 'bg-neutral-900/90 border-[#E50914] text-white'
                  : 'bg-black/60 border-neutral-800 text-neutral-400 hover:text-white'
              }`}
              title="Click to toggle TensorFlow Finger Dynamics HUD"
            >
              <Cpu className="w-3.5 h-3.5 text-[#E50914]" />
              <span>TF.js {showTfHud ? 'HUD ON' : 'HUD OFF'}</span>
            </span>

            {isPaused && (
              <span className="px-2.5 py-1 rounded bg-amber-500/90 text-black text-xs font-black uppercase tracking-wider">
                PAUSED (#72)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Test / Unmute button */}
            <button
              onClick={handleTestAudio}
              className={`p-2 rounded-lg bg-black/80 hover:bg-neutral-800 border text-xs flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                audioTesting ? 'border-emerald-500 text-emerald-400' : 'border-neutral-800 text-neutral-300 hover:text-white'
              }`}
              title="Test Voice Speech Synthesis"
            >
              <Volume2 className="w-3.5 h-3.5 text-[#E50914]" />
              <span className="hidden sm:inline">{audioTesting ? 'Speaking...' : 'Test Voice'}</span>
            </button>

            {/* Mirror Toggle */}
            <button
              onClick={() => setIsMirror(!isMirror)}
              className="p-2 rounded-lg bg-black/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs flex items-center gap-1 font-bold transition-colors cursor-pointer"
              title="Toggle Mirror Mode"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Flip</span>
            </button>

            {/* Subtitle Caption Settings */}
            <button
              onClick={onOpenCaptionSettings}
              className="p-2 rounded-lg bg-black/80 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white text-xs flex items-center gap-1.5 font-bold transition-colors cursor-pointer"
              title="Customizable Live Caption Engine Settings"
            >
              <Sliders className="w-3.5 h-3.5 text-[#E50914]" />
              <span className="hidden sm:inline">Captions</span>
            </button>
          </div>
        </div>

        {/* COMPARE FACE API & CAMERA DEPTH HUD OVERLAY */}
        {showFaceCompareHud && faceData && isCameraActive && (
          <div className="absolute top-16 right-4 sm:right-72 z-20 pointer-events-none bg-black/90 backdrop-blur-md p-3 rounded-lg border border-sky-800/80 text-white text-[11px] font-mono shadow-2xl max-w-[270px] animate-fade-in">
            <div className="flex items-center justify-between border-b border-sky-900/60 pb-1.5 mb-2">
              <span className="text-sky-400 font-bold flex items-center gap-1">
                <Smile className="w-3.5 h-3.5" />
                Compare Face API
              </span>
              <span className="text-[9px] text-sky-300 bg-sky-950/80 px-1.5 py-0.5 rounded border border-sky-700 font-bold">
                {faceData.comparison?.isSamePerson ? 'VERIFIED' : 'CALIBRATING'}
              </span>
            </div>

            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Similarity Match:</span>
                <span className="font-mono text-sky-300 font-bold">
                  {faceData.comparison ? `${Math.round(faceData.comparison.similarityScore * 100)}%` : '98%'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Face Distance:</span>
                <span className="font-mono text-sky-300">
                  {faceData.comparison?.faceDistanceMeters || 0.48}m from camera
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Head Pose:</span>
                <span className="font-mono text-sky-300 capitalize">
                  {faceData.comparison?.headPose.yaw || 'center'}, {faceData.comparison?.headPose.pitch || 'level'} ({faceData.comparison?.headPose.tiltAngle || 0}°)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Spatial Anchor:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {faceData.comparison?.anchorLocked ? 'Locked (1.0)' : 'Calibrating'}
                </span>
              </div>
            </div>

            {/* Hand Closest to Camera comparison section */}
            {currentHands.length > 0 && (
              <div className="mt-2.5 pt-2 border-t border-neutral-800">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                    <Target className="w-3 h-3" /> Closest Hand Tracking
                  </span>
                  <span className="text-[9px] text-neutral-400 font-mono">
                    {currentHands.length} Hand{currentHands.length > 1 ? 's' : ''} in Frame
                  </span>
                </div>
                {currentHands.map((h, i) => (
                  <div
                    key={i}
                    className={`flex justify-between items-center text-[10px] py-0.5 px-1 rounded ${
                      h.isClosestToCamera ? 'bg-emerald-950/70 border border-emerald-800/80 text-emerald-200' : 'text-neutral-400'
                    }`}
                  >
                    <span className="font-semibold">
                      {h.isClosestToCamera ? '★ ' : '• '}{h.handedness} Hand:
                    </span>
                    <span className="font-mono">
                      {h.estimatedDistanceMeters || 0.35}m {h.isClosestToCamera ? '(Front-most)' : '(Secondary)'}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {faceData.comparison?.handFaceRelation && faceData.comparison.handFaceRelation.isHandInFrontOfFace && (
              <div className="mt-2 pt-1 border-t border-sky-900/50 text-[9px] text-cyan-300 flex items-center gap-1">
                <span>📍</span> Hand positioned directly in front of face
              </div>
            )}
          </div>
        )}

        {/* FINGER GAP TRACKER HUD OVERLAY */}
        {showGapHud && gapMetrics && isCameraActive && (
          <div className="absolute top-16 right-4 z-20 pointer-events-none bg-black/90 backdrop-blur-md p-3 rounded-lg border border-cyan-800/80 text-white text-[11px] font-mono shadow-2xl max-w-[260px] animate-fade-in">
            <div className="flex items-center justify-between border-b border-cyan-900/60 pb-1.5 mb-2">
              <span className="text-cyan-400 font-bold flex items-center gap-1">
                <Scan className="w-3.5 h-3.5" />
                Finger Gap Tracker
              </span>
              <span className="text-[9px] text-cyan-300 bg-cyan-950/80 px-1 rounded border border-cyan-800">
                ACTIVE
              </span>
            </div>

            {/* Gaps metrics table */}
            <div className="space-y-1.5 text-[10px]">
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Thumb-Index Gap:</span>
                <span className="font-mono text-cyan-300">
                  {(gapMetrics.thumbIndexGap * 100).toFixed(0)}% ({gapMetrics.thumbIndexAngle}°)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Index-Middle Gap:</span>
                <span className="font-mono text-cyan-300">
                  {(gapMetrics.indexMiddleGap * 100).toFixed(0)}% ({gapMetrics.indexMiddleAngle}°)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Middle-Ring Gap:</span>
                <span className="font-mono text-cyan-300">
                  {(gapMetrics.middleRingGap * 100).toFixed(0)}% ({gapMetrics.middleRingAngle}°)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Ring-Pinky Gap:</span>
                <span className="font-mono text-cyan-300">
                  {(gapMetrics.ringPinkyGap * 100).toFixed(0)}% ({gapMetrics.ringPinkyAngle}°)
                </span>
              </div>
            </div>

            {/* Active Biometric Gap Badges */}
            <div className="mt-2.5 pt-1.5 border-t border-neutral-800 flex flex-wrap gap-1">
              {gapMetrics.isVulcanSplit && (
                <span className="px-1.5 py-0.5 rounded bg-pink-950 border border-pink-700 text-pink-300 text-[9px] font-bold">
                  🖖 Vulcan Split
                </span>
              )}
              {gapMetrics.isPeaceSplit && (
                <span className="px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 text-[9px] font-bold">
                  ✌️ Peace Split
                </span>
              )}
              {gapMetrics.isCrossedFingers && (
                <span className="px-1.5 py-0.5 rounded bg-purple-950 border border-purple-700 text-purple-300 text-[9px] font-bold">
                  🤞 Crossed
                </span>
              )}
              {gapMetrics.isOkPinch && (
                <span className="px-1.5 py-0.5 rounded bg-blue-950 border border-blue-700 text-blue-300 text-[9px] font-bold">
                  👌 OK Pinch
                </span>
              )}
              {gapMetrics.isPinching && (
                <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-300 text-[9px] font-bold">
                  🤏 Pinching
                </span>
              )}
              {gapMetrics.isMoneyRub && (
                <span className="px-1.5 py-0.5 rounded bg-lime-950 border border-lime-700 text-lime-300 text-[9px] font-bold">
                  🫰 Money Rub
                </span>
              )}
              {gapMetrics.isHornsSplit && (
                <span className="px-1.5 py-0.5 rounded bg-red-950 border border-red-700 text-red-300 text-[9px] font-bold">
                  🤘 Horns
                </span>
              )}
            </div>
          </div>
        )}

        {/* TENSORFLOW.JS FINGER MOVEMENTS HUD OVERLAY */}
        {showTfHud && tfMetrics && isCameraActive && (
          <div className="absolute top-16 left-4 z-20 pointer-events-none bg-black/85 backdrop-blur-md p-3 rounded-lg border border-neutral-800/90 text-white text-[11px] font-mono shadow-2xl max-w-[260px] animate-fade-in">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-1.5 mb-2">
              <span className="text-[#E50914] font-bold flex items-center gap-1">
                <Activity className="w-3 h-3" />
                TF.js Finger Dynamics
              </span>
              <span className="text-[10px] text-neutral-400">
                {tfMetrics.dominantDirection}
              </span>
            </div>

            {/* 5 Finger Flexion Bars with Master Physical States */}
            <div className="space-y-1.5">
              {[
                { name: 'Thumb', weight: '40%', val: tfMetrics.extension.thumb, state: tfMetrics.physicalStates?.thumb || 'Closed' },
                { name: 'Index', weight: '25%', val: tfMetrics.extension.index, state: tfMetrics.physicalStates?.index || 'Closed' },
                { name: 'Middle', weight: '20%', val: tfMetrics.extension.middle, state: tfMetrics.physicalStates?.middle || 'Closed' },
                { name: 'Ring', weight: '10%', val: tfMetrics.extension.ring, state: tfMetrics.physicalStates?.ring || 'Closed' },
                { name: 'Pinky', weight: '5%', val: tfMetrics.extension.pinky, state: tfMetrics.physicalStates?.pinky || 'Closed' },
              ].map((f) => {
                const stateColor =
                  f.state === 'Open'
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : f.state === 'Curved'
                    ? 'bg-cyan-950 text-cyan-400 border-cyan-800'
                    : f.state === 'Bent'
                    ? 'bg-amber-950 text-amber-400 border-amber-800'
                    : 'bg-neutral-900 text-neutral-400 border-neutral-800';

                return (
                  <div key={f.name} className="flex items-center gap-1.5 text-[10px]">
                    <div className="w-14 flex items-center justify-between">
                      <span className="text-neutral-300 font-semibold">{f.name}</span>
                      <span className="text-[8px] text-neutral-500 font-mono">({f.weight})</span>
                    </div>

                    <div className="flex-1 h-2 bg-neutral-900 rounded-full overflow-hidden border border-neutral-800">
                      <div
                        className="h-full rounded-full transition-all duration-75"
                        style={{
                          width: `${f.val}%`,
                          backgroundColor:
                            f.state === 'Open' ? '#10B981' : f.state === 'Curved' ? '#06B6D4' : f.state === 'Bent' ? '#F59E0B' : '#525252',
                        }}
                      />
                    </div>

                    <span className="w-6 text-right font-mono text-[9px] text-neutral-400">{f.val}%</span>

                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border uppercase tracking-wider ${stateColor}`}>
                      {f.state}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Dynamic Gestures from Real-time-GesRec */}
            {tfMetrics.dynamicGesture && (
              <div className="mt-2 pt-1.5 border-t border-neutral-800/80 flex items-center justify-between text-[10px] text-amber-400">
                <span>Dynamic Motion:</span>
                <span className="font-bold text-white px-1.5 py-0.5 rounded bg-red-950 border border-red-800">
                  {tfMetrics.dynamicGesture.replace('_', ' ')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* EMPTY STATE / GET STARTED HERO */}
        {!isCameraActive && !simulationActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-center p-6 z-10">
            <div className="w-16 h-16 rounded-2xl bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-[#E50914] mb-4 shadow-[0_0_30px_rgba(229,9,20,0.3)]">
              <Camera className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold tracking-tight text-white mb-2 font-sans">
              Launch Studio Cinema Camera
            </h3>
            <p className="text-xs text-neutral-400 max-w-md mb-6 leading-relaxed">
              Real-time ASL translation with Google MediaPipe Hands & TensorFlow.js finger movement tracking.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={handleStartCamera}
                className="px-6 py-3 rounded-lg bg-[#E50914] hover:bg-[#C10711] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(229,9,20,0.5)] active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Live Webcam</span>
              </button>

              <button
                onClick={() => triggerSimulation('HELLO')}
                className="px-4 py-3 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white font-semibold text-xs tracking-wider transition-all flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>Test Simulation</span>
              </button>
            </div>
          </div>
        )}

        {/* BOTTOM SUBTITLE OVERLAY (Single-Word Persistent Cinema Subtitle) */}
        {(() => {
          const activeWord = currentPhrase ? currentPhrase.trim().split(/\s+/).pop() : '';
          if (!activeWord) return null;
          return (
            <div className="absolute bottom-6 left-6 right-6 flex justify-center pointer-events-none z-20">
              <div
                key={activeWord}
                className="px-8 py-2.5 rounded-2xl transition-all duration-300 animate-zoom-in backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.85)] border border-white/10 flex flex-col items-center gap-0.5"
                style={CaptionController.getStyleObject(captionConfig)}
              >
                <span className="text-[9px] font-mono font-bold tracking-widest text-[#E50914] uppercase">
                  Caption • 1 Word
                </span>
                <p className="text-3xl md:text-4xl font-black uppercase tracking-wider leading-tight drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)]">
                  {activeWord}
                </p>
              </div>
            </div>
          );
        })()}

        {/* GESTURE HUD & ANTI-REPEAT STATUS BADGE */}
        {latestDetection && (
          <div className="absolute bottom-4 left-4 z-20 pointer-events-none animate-fade-in flex items-center gap-2">
            {latestDetection.state === 'cooldown' ? (
              /* Anti-repeat hold badge: Confirms translation while preventing duplicate spam */
              <div className="px-3.5 py-1.5 rounded-lg bg-black/90 backdrop-blur border border-amber-500/70 text-amber-300 text-xs font-bold flex items-center gap-2 shadow-xl">
                <span className="text-lg">{latestDetection.gesture.emoji}</span>
                <Lock className="w-3.5 h-3.5 text-amber-400" />
                <span>#{latestDetection.gesture.pdfNumber} <strong>{latestDetection.gesture.sign}</strong></span>
                <span className="text-[10px] text-neutral-400">(Hold to keep, release to sign next)</span>
              </div>
            ) : latestDetection.state === 'locking' ? (
              /* Locking in intent */
              <div className="px-3.5 py-1.5 rounded-lg bg-black/90 backdrop-blur border border-[#E50914] text-white text-xs font-bold flex items-center gap-2 shadow-xl">
                <span className="text-lg">{latestDetection.gesture.emoji}</span>
                <div className="w-3.5 h-3.5 border-2 border-[#E50914] border-t-transparent rounded-full animate-spin" />
                <span>Confirming: #{latestDetection.gesture.pdfNumber} <strong>{latestDetection.gesture.sign}</strong></span>
                <span className="font-mono text-[#E50914] text-[10px]">
                  {Math.round((latestDetection.lockProgress || 0) * 100)}%
                </span>
              </div>
            ) : (
              /* Just committed */
              <div className="px-3.5 py-1.5 rounded-lg bg-[#E50914] text-white text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(229,9,20,0.8)]">
                <span className="text-lg">{latestDetection.gesture.emoji}</span>
                <CheckCircle2 className="w-4 h-4" />
                <span>#{latestDetection.gesture.pdfNumber} {latestDetection.gesture.sign}</span>
                <span className="font-mono text-[10px] bg-black/40 px-1.5 py-0.5 rounded">
                  {Math.round(latestDetection.confidence * 100)}%
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* NETFLIX CINEMA PLAYER BOTTOM CONTROLS */}
      <div className="p-3.5 rounded-xl bg-[#181818] border border-neutral-800 flex flex-wrap items-center justify-between gap-3 text-white text-xs">
        <div className="flex items-center gap-2.5">
          {isCameraActive ? (
            <>
              <button
                onClick={handleStopCamera}
                className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CameraOff className="w-4 h-4 text-[#E50914]" />
                <span>Stop Camera</span>
              </button>

              <button
                onClick={handleTogglePause}
                className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isPaused
                    ? 'bg-amber-500 hover:bg-amber-600 text-black'
                    : 'bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-300 hover:text-white'
                }`}
              >
                {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                <span>{isPaused ? 'Resume (#72)' : 'Pause (#72)'}</span>
              </button>
            </>
          ) : (
            <button
              onClick={handleStartCamera}
              className="px-4 py-2 rounded-lg bg-[#E50914] hover:bg-[#C10711] text-white font-bold transition-all shadow flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>Start Camera</span>
            </button>
          )}

          {/* Device Selector */}
          {availableDevices.length > 1 && (
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-700 text-neutral-300 text-xs focus:outline-none focus:border-[#E50914]"
            >
              {availableDevices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Quick Simulation Carousel Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-[10px] font-bold text-neutral-500 uppercase tracking-wider mr-1">
            Test Signs:
          </span>
          {['OK', 'INSULT', 'RESPECT', 'HELLO', 'YES', 'NO', 'PEACE', 'ROCK ON', 'LOVE', 'STOP'].map((sign) => (
            <button
              key={sign}
              onClick={() => triggerSimulation(sign)}
              className="px-2.5 py-1 rounded bg-neutral-900 hover:bg-[#E50914] text-neutral-300 hover:text-white text-[11px] font-bold border border-neutral-800 transition-all cursor-pointer whitespace-nowrap active:scale-95"
            >
              {sign}
            </button>
          ))}
        </div>
      </div>

      {/* Hardware / Permission Error Modal */}
      {cameraErrorModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md p-6 rounded-xl bg-[#181818] border border-red-800 shadow-2xl text-white space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-950/80 border border-red-800 flex items-center justify-center text-[#E50914] mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-lg font-bold text-center">Camera Notice</h4>
            <p className="text-xs text-neutral-400 text-center leading-relaxed">
              {cameraErrorModal}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setCameraErrorModal(null)}
                className="flex-1 py-2.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleStartCamera}
                className="flex-1 py-2.5 rounded-lg bg-[#E50914] hover:bg-[#C10711] font-bold text-xs cursor-pointer"
              >
                Retry Camera
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
