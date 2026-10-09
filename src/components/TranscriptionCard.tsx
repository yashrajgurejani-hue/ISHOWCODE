import React, { useState } from 'react';
import { DetectionResult } from '../types';
import { TTSService } from '../services/ttsService';
import {
  Volume2,
  VolumeX,
  Copy,
  Trash2,
  Check,
  SlidersHorizontal,
  Sparkles,
  History,
  Clapperboard,
} from 'lucide-react';

interface TranscriptionCardProps {
  currentPhrase: string;
  setCurrentPhrase: React.Dispatch<React.SetStateAction<string>>;
  latestDetection: DetectionResult | null;
  theme?: 'dark' | 'light';
  onCommandTriggered?: string | null;
  ttsRate: number;
  setTtsRate: (rate: number) => void;
  autoSpeak: boolean;
  setAutoSpeak: (val: boolean) => void;
  historyWords?: string[];
  onClearHistory?: () => void;
}

export const TranscriptionCard: React.FC<TranscriptionCardProps> = ({
  currentPhrase,
  setCurrentPhrase,
  latestDetection,
  onCommandTriggered,
  ttsRate,
  setTtsRate,
  autoSpeak,
  setAutoSpeak,
  historyWords = [],
  onClearHistory,
}) => {
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showTtsSettings, setShowTtsSettings] = useState(false);

  // Single word representation
  const activeWord = currentPhrase.trim().split(/\s+/).pop() || '';

  const handleCopy = () => {
    if (!currentPhrase) return;
    navigator.clipboard.writeText(currentPhrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClear = () => {
    setCurrentPhrase('');
    onClearHistory?.();
  };

  const handleSpeak = async () => {
    const textToSpeak = activeWord || currentPhrase;
    if (!textToSpeak.trim()) return;
    setIsSpeaking(true);
    await TTSService.speak(textToSpeak);
    setIsSpeaking(false);
  };

  return (
    <div className="p-6 rounded-2xl bg-gradient-to-b from-[#181818] via-[#141414] to-black border border-neutral-800 shadow-[0_15px_35px_rgba(0,0,0,0.7)] flex flex-col gap-5 text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3.5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#E50914] shadow-[0_0_10px_rgba(229,9,20,0.8)]" />
          <span className="text-xs font-black uppercase tracking-wider text-neutral-200 font-sans">
            Screen Caption & Dialogue
          </span>
          {onCommandTriggered && (
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-red-950/80 text-red-300 border border-red-800 animate-pulse">
              {onCommandTriggered}
            </span>
          )}
        </div>

        {/* Audio Equalizer wave */}
        {isSpeaking ? (
          <div className="flex items-center gap-1.5 h-6 px-3 py-0.5 rounded-lg bg-red-950/80 border border-red-800 text-[#E50914]">
            <span className="w-1 bg-[#E50914] rounded-full h-3 animate-pulse" />
            <span className="w-1 bg-[#E50914] rounded-full h-4 animate-bounce" />
            <span className="w-1 bg-[#E50914] rounded-full h-2 animate-pulse" />
            <span className="text-[10px] font-black uppercase ml-1 tracking-wider">Voice Active</span>
          </div>
        ) : (
          <span className="text-[11px] text-neutral-400 font-mono flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Single-Word Caption Mode
          </span>
        )}
      </div>

      {/* Main Single-Word Caption Display Hero */}
      <div className="w-full p-5 rounded-xl bg-black/90 border border-neutral-800 relative flex flex-col items-center justify-center text-center min-h-[120px] shadow-inner overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#E50914]/10 rounded-full blur-2xl pointer-events-none" />

        {activeWord ? (
          <div className="flex flex-col items-center justify-center gap-1.5 animate-zoom-in z-10">
            {latestDetection && (
              <span className="text-4xl mb-0.5 filter drop-shadow">
                {latestDetection.gesture.emoji}
              </span>
            )}
            <span className="text-[10px] font-bold font-mono tracking-widest text-[#E50914] uppercase">
              Current Gesture Caption (Persistent)
            </span>
            <h2 className="text-4xl sm:text-5xl font-black tracking-wider text-white drop-shadow-[0_4px_16px_rgba(229,9,20,0.6)] font-sans">
              {activeWord}
            </h2>
            <span className="text-[11px] text-neutral-400 mt-1">
              {latestDetection ? `Signed: #${latestDetection.gesture.pdfNumber} ${latestDetection.gesture.sign} • ${Math.round(latestDetection.confidence * 100)}% match` : 'Stays on screen until next gesture'}
            </span>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center text-neutral-500 py-3 z-10">
            <Clapperboard className="w-8 h-8 mb-2 opacity-50 text-neutral-500" />
            <p className="text-xs font-semibold text-neutral-400">
              No gesture active yet. Perform any of the 50 gestures in front of the camera.
            </p>
            <p className="text-[10px] text-neutral-600 mt-1">
              At one time, one word appears on screen and stays until the next gesture arrives.
            </p>
          </div>
        )}
      </div>

      {/* Recent History Reel */}
      {historyWords && historyWords.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            <History className="w-3.5 h-3.5 text-neutral-500" />
            <span>Gesture History Stream</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto py-1 scrollbar-none">
            {historyWords.slice(-8).map((word, idx) => (
              <span
                key={`${word}_${idx}`}
                className={`px-3 py-1 rounded-lg text-xs font-black tracking-wide border transition-all ${
                  idx === historyWords.length - 1
                    ? 'bg-[#E50914] text-white border-[#E50914] shadow-[0_0_12px_rgba(229,9,20,0.6)]'
                    : 'bg-neutral-900 text-neutral-300 border-neutral-800'
                }`}
              >
                {word}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-neutral-800/80">
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              TTSService.unlockAudio();
              if (activeWord) {
                handleSpeak();
              } else {
                TTSService.speak('BridgeSpeak cinema voice active.');
              }
            }}
            disabled={isSpeaking}
            className="px-5 py-2.5 rounded-xl bg-[#E50914] hover:bg-[#C10711] text-white font-bold text-xs uppercase tracking-wide shadow-[0_4px_15px_rgba(229,9,20,0.4)] flex items-center gap-2 transition-all cursor-pointer active:scale-95 disabled:opacity-40"
          >
            <Volume2 className="w-4 h-4" />
            <span>{isSpeaking ? 'Voicing...' : activeWord ? `Speak "${activeWord}"` : 'Test Voice'}</span>
          </button>

          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
              autoSpeak
                ? 'bg-neutral-800 text-white border-neutral-600 shadow'
                : 'bg-black/60 text-neutral-400 border-neutral-800 hover:text-white'
            }`}
          >
            {autoSpeak ? <Volume2 className="w-3.5 h-3.5 text-[#E50914]" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>Auto-Voice: {autoSpeak ? 'ON' : 'OFF'}</span>
          </button>

          <button
            onClick={() => setShowTtsSettings(!showTtsSettings)}
            className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
            title="Speech Settings"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleCopy}
            disabled={!activeWord}
            title="Copy Word"
            className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-neutral-400" />}
          </button>

          <button
            onClick={handleClear}
            disabled={!activeWord}
            title="Clear Caption"
            className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 hover:text-red-400 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {showTtsSettings && (
        <div className="p-3.5 bg-black/90 rounded-xl border border-neutral-800 text-xs flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-inner">
          <div className="flex items-center gap-3">
            <span className="text-neutral-400 font-semibold">Speech Speed:</span>
            <input
              type="range"
              min="0.5"
              max="1.8"
              step="0.1"
              value={ttsRate}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setTtsRate(val);
                TTSService.updateConfig({ rate: val });
              }}
              className="w-28 accent-[#E50914] cursor-pointer"
            />
            <span className="font-mono text-white font-bold">{ttsRate.toFixed(1)}x</span>
          </div>
          <span className="text-[11px] text-neutral-400 font-mono">
            Acoustic Sync Engine: Web Speech & Dual WebAudio Oscillator
          </span>
        </div>
      )}
    </div>
  );
};
