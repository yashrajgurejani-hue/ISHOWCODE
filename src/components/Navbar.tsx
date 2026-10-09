import React from 'react';
import { User } from '../types';
import { LogOut, Clapperboard, Film, Video, SlidersHorizontal, User as UserIcon } from 'lucide-react';

interface NavbarProps {
  activeTab: 'translate' | 'registry' | 'practice' | 'sessions' | 'captions';
  setActiveTab: (tab: 'translate' | 'registry' | 'practice' | 'sessions' | 'captions') => void;
  user: User | null;
  onLogout: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  isCameraActive: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  user,
  onLogout,
}) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-[#141414]/95 backdrop-blur-md border-b border-neutral-800/80 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-18 flex items-center justify-between gap-8">
        {/* Brand Zone: Netflix-style Red Wordmark */}
        <div className="flex items-center gap-8 shrink-0">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setActiveTab('translate')}>
            <span
              className="text-[#E50914] font-black text-2xl sm:text-3xl tracking-tighter transition-transform hover:scale-105"
              style={{ fontFamily: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif", letterSpacing: '-0.04em' }}
            >
              BRIDGESPEAK
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <button
              onClick={() => setActiveTab('translate')}
              className={`transition-colors cursor-pointer py-1 text-xs uppercase tracking-wider font-bold ${
                activeTab === 'translate' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Live Studio
            </button>

            <button
              onClick={() => setActiveTab('registry')}
              className={`transition-colors cursor-pointer py-1 text-xs uppercase tracking-wider font-bold ${
                activeTab === 'registry' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              50 Gestures
            </button>

            <button
              onClick={() => setActiveTab('practice')}
              className={`transition-colors cursor-pointer py-1 text-xs uppercase tracking-wider font-bold ${
                activeTab === 'practice' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Practice Masterclass
            </button>

            <button
              onClick={() => setActiveTab('sessions')}
              className={`transition-colors cursor-pointer py-1 text-xs uppercase tracking-wider font-bold ${
                activeTab === 'sessions' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Session Sync
            </button>

            <button
              onClick={() => setActiveTab('captions')}
              className={`transition-colors cursor-pointer py-1 text-xs uppercase tracking-wider font-bold ${
                activeTab === 'captions' ? 'text-white' : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              Subtitles
            </button>
          </nav>
        </div>

        {/* Right Zone: User Profile and Actions */}
        <div className="flex items-center gap-4 shrink-0">
          {user && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-[#E50914] flex items-center justify-center font-bold text-white text-xs shadow-md">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden lg:inline text-xs font-semibold text-neutral-300 truncate max-w-[120px]">
                  {user.name}
                </span>
              </div>

              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-2 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile nav strip */}
      <div className="flex md:hidden items-center justify-around py-2.5 border-t border-neutral-800/60 bg-[#141414] text-xs px-2">
        <button
          onClick={() => setActiveTab('translate')}
          className={`px-2 py-1 font-bold ${activeTab === 'translate' ? 'text-[#E50914]' : 'text-neutral-400'}`}
        >
          Studio
        </button>
        <button
          onClick={() => setActiveTab('registry')}
          className={`px-2 py-1 font-bold ${activeTab === 'registry' ? 'text-[#E50914]' : 'text-neutral-400'}`}
        >
          Catalog
        </button>
        <button
          onClick={() => setActiveTab('practice')}
          className={`px-2 py-1 font-bold ${activeTab === 'practice' ? 'text-[#E50914]' : 'text-neutral-400'}`}
        >
          Practice
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-2 py-1 font-bold ${activeTab === 'sessions' ? 'text-[#E50914]' : 'text-neutral-400'}`}
        >
          Sync
        </button>
        <button
          onClick={() => setActiveTab('captions')}
          className={`px-2 py-1 font-bold ${activeTab === 'captions' ? 'text-[#E50914]' : 'text-neutral-400'}`}
        >
          Subtitles
        </button>
      </div>
    </header>
  );
};
