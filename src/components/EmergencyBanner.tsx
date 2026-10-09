import React from 'react';
import { AlertOctagon, PhoneCall, X, ShieldAlert } from 'lucide-react';

interface EmergencyBannerProps {
  isOpen: boolean;
  onDismiss: () => void;
  theme: 'dark' | 'light';
}

export const EmergencyBanner: React.FC<EmergencyBannerProps> = ({ isOpen, onDismiss }) => {
  if (!isOpen) return null;

  return (
    <div
      role="alert"
      className="w-full bg-rose-600 text-white px-4 py-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-4 animate-bounce-subtle z-50 border-b border-rose-700"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-rose-700 rounded-lg animate-pulse">
          <AlertOctagon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h4 className="font-bold text-sm tracking-wide uppercase flex items-center gap-2">
            <span>Visual Alert: ASL Emergency Gesture Detected (#75)</span>
          </h4>
          <p className="text-xs text-rose-100">
            Emergency sign triggered through camera hand tracking. Immediate assistance option available.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="tel:911"
          className="px-4 py-2 bg-white text-rose-700 font-bold text-xs rounded-xl shadow hover:bg-rose-50 transition-colors flex items-center gap-2 cursor-pointer"
        >
          <PhoneCall className="w-4 h-4" />
          <span>Call Emergency (911)</span>
        </a>

        <button
          onClick={onDismiss}
          className="p-2 rounded-xl bg-rose-700/80 hover:bg-rose-700 text-white transition-colors cursor-pointer"
          aria-label="Dismiss Emergency Alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
