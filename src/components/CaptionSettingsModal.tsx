import React from 'react';
import { CaptionConfig } from '../types';
import { FONT_OPTIONS, FONT_WEIGHTS, CaptionController } from '../services/captionController';
import { X, Sliders, RotateCcw, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';

interface CaptionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: CaptionConfig;
  onUpdateConfig: (newConfig: CaptionConfig) => void;
  theme: 'dark' | 'light';
}

export const CaptionSettingsModal: React.FC<CaptionSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  theme,
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    const fresh = CaptionController.resetDefaults(theme === 'dark');
    onUpdateConfig(fresh);
  };

  const update = (partial: Partial<CaptionConfig>) => {
    const updated = CaptionController.setConfig(partial);
    onUpdateConfig(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto p-7 rounded-3xl border shadow-2xl flex flex-col gap-6"
        style={{
          backgroundColor: theme === 'dark' ? '#131B2E' : '#FFFFFF',
          borderColor: 'rgba(99, 102, 241, 0.25)',
          color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b pb-4"
          style={{ borderColor: 'rgba(99, 102, 241, 0.15)' }}
        >
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h3 className="text-xl font-black" style={{ fontFamily: "'Outfit', sans-serif" }}>
              Caption Styling & Typography Engine
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl opacity-70 hover:opacity-100 hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Preview Box */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider opacity-75 block mb-2">
            Live Subtitle Preview
          </label>
          <div
            className="w-full p-5 rounded-2xl border flex items-center justify-center transition-all min-h-[90px] shadow-inner"
            style={{
              backgroundColor: CaptionController.getRgbaBackground(config.bgColor, config.bgOpacity),
              borderColor: 'rgba(99, 102, 241, 0.2)',
            }}
          >
            <p
              style={{
                fontFamily: config.fontFamily,
                fontSize: `${config.fontSize}px`,
                fontWeight: config.fontWeight,
                color: config.textColor,
                textAlign: config.textAlign,
                textShadow: config.hasTextShadow ? '0 2px 8px rgba(0,0,0,0.9), 0 0 2px rgba(0,0,0,0.9)' : 'none',
                width: '100%',
              }}
            >
              BridgeSpeak: Real-time sign language accessibility captions
            </p>
          </div>
        </div>

        {/* 1. The 10 Font Families Selection */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider opacity-75 block mb-2">
            1. Font Family (10 Accessible Typefaces)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {FONT_OPTIONS.map((f) => (
              <button
                key={f.name}
                onClick={() => update({ fontFamily: f.name })}
                className={`px-3 py-2.5 rounded-xl text-xs font-bold border text-center transition-all cursor-pointer ${
                  config.fontFamily === f.name
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/15 shadow-md scale-102'
                    : 'opacity-75 hover:opacity-100 hover:bg-white/5 border-slate-700/50'
                }`}
                style={{ fontFamily: f.family }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Font Size & Weight */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider opacity-75">
                Font Size: <span className="font-mono text-cyan-300 tabular-nums">{config.fontSize}px</span>
              </label>
            </div>
            <input
              type="range"
              min="14"
              max="48"
              step="1"
              value={config.fontSize}
              onChange={(e) => update({ fontSize: parseInt(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider opacity-75 block mb-1.5">
              Font Weight
            </label>
            <select
              value={config.fontWeight}
              onChange={(e) => update({ fontWeight: parseInt(e.target.value) as CaptionConfig['fontWeight'] })}
              className="w-full px-3.5 py-2.5 rounded-xl border text-xs focus:outline-none cursor-pointer"
              style={{
                backgroundColor: theme === 'dark' ? '#0B0F19' : '#F8FAFC',
                borderColor: 'rgba(99, 102, 241, 0.25)',
                color: theme === 'dark' ? '#F8FAFC' : '#0F172A',
              }}
            >
              {FONT_WEIGHTS.map((w) => (
                <option key={w.value} value={w.value}>
                  {w.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Text Color & Background Opacity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider opacity-75 block mb-1.5">
              Text Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.textColor}
                onChange={(e) => update({ textColor: e.target.value })}
                className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0"
              />
              <span className="font-mono text-xs opacity-80 uppercase text-cyan-300">{config.textColor}</span>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase tracking-wider opacity-75 block mb-1.5">
              Background Color
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={config.bgColor}
                onChange={(e) => update({ bgColor: e.target.value })}
                className="w-10 h-10 rounded-xl cursor-pointer border-0 bg-transparent p-0"
              />
              <span className="font-mono text-xs opacity-80 uppercase text-cyan-300">{config.bgColor}</span>
            </div>
          </div>
        </div>

        {/* Opacity Slider & Text Shadow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider opacity-75 block mb-1.5">
              Background Opacity: <span className="font-mono text-cyan-300 tabular-nums">{config.bgOpacity}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={config.bgOpacity}
              onChange={(e) => update({ bgOpacity: parseInt(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
          </div>

          <div className="flex flex-col justify-end">
            <label className="flex items-center gap-2.5 cursor-pointer text-xs font-bold py-2">
              <input
                type="checkbox"
                checked={config.hasTextShadow}
                onChange={(e) => update({ hasTextShadow: e.target.checked })}
                className="rounded accent-cyan-400 w-4 h-4 cursor-pointer"
              />
              <span>High-Contrast Text Shadow / Outline</span>
            </label>
          </div>
        </div>

        {/* Alignment */}
        <div>
          <label className="text-xs font-bold uppercase tracking-wider opacity-75 block mb-1.5">
            Text Alignment
          </label>
          <div className="flex items-center gap-2">
            {(['left', 'center', 'right'] as const).map((align) => (
              <button
                key={align}
                onClick={() => update({ textAlign: align })}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 capitalize transition-all cursor-pointer ${
                  config.textAlign === align
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-500/15'
                    : 'opacity-70 hover:opacity-100 border-slate-700/50'
                }`}
              >
                {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                <span>{align}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between pt-3 border-t"
          style={{ borderColor: 'rgba(99, 102, 241, 0.15)' }}
        >
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs opacity-75 hover:opacity-100 transition-opacity cursor-pointer text-slate-400 hover:text-white"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-xl cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #FF5C67, #6366F1)' }}
          >
            Apply Styling
          </button>
        </div>
      </div>
    </div>
  );
};
