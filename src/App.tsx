/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  SessionPayload,
  DetectionResult,
  HandData,
  CaptionConfig,
  GestureDefinition,
  FaceData,
  TwoHandMetrics,
  FingerGapMetrics,
} from './types';
import { AuthService } from './services/auth';
import { GestureClassifier } from './services/gestureClassifier';
import { TTSService } from './services/ttsService';
import { CaptionController } from './services/captionController';
import { RecognizedTaskGesture } from './services/visionEngine';
import { TensorFlowFingerMetrics } from './services/tfFingerTracker';
import { Navbar } from './components/Navbar';
import { AuthCard } from './components/AuthCard';
import { VideoDock } from './components/VideoDock';
import { TranscriptionCard } from './components/TranscriptionCard';
import { EmergencyBanner } from './components/EmergencyBanner';
import { GestureExplorer } from './components/GestureExplorer';
import { PracticeSandbox } from './components/PracticeSandbox';
import { CaptionSettingsModal } from './components/CaptionSettingsModal';
import { SessionSyncModal } from './components/SessionSyncModal';
import { generateSyntheticPose } from './services/poseSimulator';
import { HumanNeuralAgent } from './components/HumanNeuralAgent';

export default function App() {
  const [theme] = useState<'dark'>('dark');

  // Auth & Session
  const [user, setUser] = useState<User | null>(null);
  const [currentSession, setCurrentSession] = useState<SessionPayload | null>(null);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'translate' | 'registry' | 'practice' | 'sessions' | 'captions'>('translate');

  // Camera & Vision Pipeline State
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [detectedHands, setDetectedHands] = useState<HandData[]>([]);
  const [detectedFace, setDetectedFace] = useState<FaceData | null>(null);
  const [latestDetection, setLatestDetection] = useState<DetectionResult | null>(null);
  const [currentPhrase, setCurrentPhrase] = useState<string>('');
  const [historyWords, setHistoryWords] = useState<string[]>([]);

  // UI Commands
  const [onCommandTriggered, setOnCommandTriggered] = useState<string | null>(null);
  const [emergencyActive, setEmergencyActive] = useState<boolean>(false);

  // Settings & Modals
  const [captionConfig, setCaptionConfig] = useState<CaptionConfig>(CaptionController.init(true));
  const [isCaptionModalOpen, setIsCaptionModalOpen] = useState<boolean>(false);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState<boolean>(false);
  const [ttsRate, setTtsRate] = useState<number>(1.0);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);

  // Selected sign for practice
  const [practiceGesture, setPracticeGesture] = useState<GestureDefinition | null>(null);

  // References
  const classifierRef = useRef<GestureClassifier>(new GestureClassifier());

  useEffect(() => {
    document.documentElement.classList.add('theme-dark');
    document.body.classList.add('theme-dark');
  }, []);

  useEffect(() => {
    TTSService.init();
  }, []);

  useEffect(() => {
    const existingSession = AuthService.getCurrentSession();
    if (existingSession) {
      setCurrentSession(existingSession);
      setUser({
        userId: existingSession.userId,
        name: existingSession.name,
        email: existingSession.email,
        loginTime: existingSession.loginTime,
      });
    }
  }, []);

  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
    const session = AuthService.getCurrentSession();
    setCurrentSession(session);
  };

  const handleLogout = () => {
    if (currentSession) {
      AuthService.endSession(currentSession);
    }
    setUser(null);
    setCurrentSession(null);
    setIsCameraActive(false);
    setLatestDetection(null);
    setCurrentPhrase('');
    classifierRef.current.reset();
  };

  const handleUICommand = (command: 'stop' | 'repeat' | 'slow' | 'emergency') => {
    switch (command) {
      case 'stop': {
        setIsPaused((prev) => !prev);
        setOnCommandTriggered(isPaused ? 'Camera Resumed (#72 Stop)' : 'Camera Paused (#72 Stop)');
        break;
      }
      case 'repeat': {
        setCurrentPhrase((prev) => {
          const words = prev.trim().split(' ');
          words.pop();
          return words.join(' ');
        });
        setOnCommandTriggered('Last Word Removed (#73 Repeat)');
        break;
      }
      case 'slow': {
        const newRate = TTSService.reduceSpeechRate();
        setTtsRate(newRate);
        setOnCommandTriggered(`Speech Rate Lowered to ${newRate}x (#74 Slow)`);
        break;
      }
      case 'emergency': {
        setEmergencyActive(true);
        setOnCommandTriggered('Visual Alert / SOS Triggered (#75 Emergency)');
        break;
      }
    }

    setTimeout(() => {
      setOnCommandTriggered(null);
    }, 3000);
  };

  const handleHandsDetected = (
    hands: HandData[],
    taskGestures: RecognizedTaskGesture[] = [],
    tfMetrics?: TensorFlowFingerMetrics,
    face?: FaceData | null,
    twoHandMetrics?: TwoHandMetrics | null,
    gapMetrics?: FingerGapMetrics | null
  ) => {
    setDetectedHands(hands);
    if (face !== undefined) {
      setDetectedFace(face || null);
    }

    if (hands.length === 0 || isPaused) return;

    const { result, shouldCommit } = classifierRef.current.processHands(
      hands,
      taskGestures,
      tfMetrics,
      face,
      twoHandMetrics,
      gapMetrics,
      handleUICommand
    );

    if (result) {
      setLatestDetection(result);

      if (shouldCommit) {
        const textToAdd = result.gesture.outputText;
        // Strictly ONE WORD on the screen, persisting continuously until the next gesture appears!
        setCurrentPhrase(textToAdd);
        setHistoryWords((prev) => (prev[prev.length - 1] === textToAdd ? prev : [...prev, textToAdd]));

        if (autoSpeak) {
          TTSService.speak(textToAdd);
        }

        const updated = AuthService.incrementGesturesCount(currentSession);
        if (updated) {
          setCurrentSession(updated);
        }
      }
    }
  };

  const handleSimulateSign = (signName: string) => {
    const mockHand = generateSyntheticPose(signName, 'Right');
    handleHandsDetected([mockHand], []);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#141414] text-white selection:bg-[#E50914] selection:text-white">
      {/* Gesture #75 Emergency Banner */}
      <EmergencyBanner
        isOpen={emergencyActive}
        onDismiss={() => setEmergencyActive(false)}
        theme={theme}
      />

      {/* Netflix Top Bar Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === 'sessions') {
            setIsSessionModalOpen(true);
          } else if (tab === 'captions') {
            setIsCaptionModalOpen(true);
          } else {
            setActiveTab(tab);
          }
        }}
        user={user}
        onLogout={handleLogout}
        isCameraActive={isCameraActive}
      />

      {/* Main Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
        {!user ? (
          /* Netflix Sign In Billboard Experience */
          <div className="flex-1 flex flex-col items-center justify-center py-10 relative">
            {/* Cinematic Background Glow */}
            <div className="absolute inset-0 bg-radial-gradient from-red-950/20 via-transparent to-transparent pointer-events-none -z-10" />
            <AuthCard onSuccess={handleAuthSuccess} />
          </div>
        ) : (
          /* Netflix Cinema Dashboard */
          <>
            {/* View 1: Live Studio */}
            {activeTab === 'translate' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
                {/* 16:9 Cinema Screen */}
                <div className="lg:col-span-7 flex flex-col gap-4">
                  <VideoDock
                    onHandsDetected={handleHandsDetected}
                    latestDetection={latestDetection}
                    captionConfig={captionConfig}
                    onOpenCaptionSettings={() => setIsCaptionModalOpen(true)}
                    currentPhrase={currentPhrase}
                    isCameraActive={isCameraActive}
                    setIsCameraActive={setIsCameraActive}
                    isPaused={isPaused}
                    onTogglePause={() => setIsPaused(!isPaused)}
                  />
                </div>

                {/* Right: Human Neural AI Agent & Dialogue Box */}
                <div className="lg:col-span-5 flex flex-col gap-5">
                  <HumanNeuralAgent
                    latestDetection={latestDetection}
                    currentWord={currentPhrase}
                    onInteract={() => {
                      TTSService.unlockAudio();
                      if (currentPhrase) {
                        TTSService.speak(currentPhrase);
                      } else {
                        TTSService.speak('BridgeSpeak Human Neural AI ready. Present any hand gesture to translate.');
                      }
                    }}
                  />

                  <TranscriptionCard
                    currentPhrase={currentPhrase}
                    setCurrentPhrase={setCurrentPhrase}
                    latestDetection={latestDetection}
                    onCommandTriggered={onCommandTriggered}
                    ttsRate={ttsRate}
                    setTtsRate={setTtsRate}
                    autoSpeak={autoSpeak}
                    setAutoSpeak={setAutoSpeak}
                    historyWords={historyWords}
                    onClearHistory={() => setHistoryWords([])}
                  />

                  {/* Active Session Ribbon */}
                  <div className="p-4 rounded-xl bg-[#181818] border border-neutral-800 text-xs flex items-center justify-between shadow-lg">
                    <div>
                      <span className="text-neutral-500 block text-[11px] uppercase tracking-wider">Account</span>
                      <span className="font-bold text-white truncate">{user.name} ({user.email})</span>
                    </div>
                    <button
                      onClick={() => setIsSessionModalOpen(true)}
                      className="px-3.5 py-1.5 rounded bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-neutral-200 hover:text-white font-bold transition-all cursor-pointer text-xs"
                    >
                      Sync Log ({currentSession?.totalGesturesDetected || 0} Signs)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* View 2: The 50 Gesture Catalog */}
            {activeTab === 'registry' && (
              <GestureExplorer
                onSimulateSign={handleSimulateSign}
                onSelectForPractice={(gesture) => {
                  setPracticeGesture(gesture);
                  setActiveTab('practice');
                }}
              />
            )}

            {/* View 3: Practice Masterclass */}
            {activeTab === 'practice' && (
              <PracticeSandbox
                detectedHands={detectedHands}
                face={detectedFace}
                onTriggerSign={handleSimulateSign}
                initialGesture={practiceGesture}
              />
            )}
          </>
        )}
      </main>

      {/* Subtitles Settings Modal */}
      <CaptionSettingsModal
        isOpen={isCaptionModalOpen}
        onClose={() => setIsCaptionModalOpen(false)}
        config={captionConfig}
        onUpdateConfig={setCaptionConfig}
        theme="dark"
      />

      {/* Session Sync Modal */}
      <SessionSyncModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        currentSession={currentSession}
        theme="dark"
      />

      {/* Netflix Theatrical Footer */}
      <footer className="w-full border-t border-neutral-800/80 bg-[#141414] py-8 mt-12 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[#E50914] font-black text-sm">BRIDGESPEAK</span>
            <span>· Theatrical Sign Language Accessibility Studio</span>
          </div>
          <div className="flex items-center gap-4 text-neutral-400">
            <span>Google MediaPipe Tasks GPU</span>
            <span>·</span>
            <span>Gmail OTP Auth</span>
            <span>·</span>
            <button
              onClick={() => setIsSessionModalOpen(true)}
              className="hover:text-white cursor-pointer underline"
            >
              Spreadsheet Sync
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
