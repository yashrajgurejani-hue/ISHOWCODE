import React, { useState } from 'react';
import { ASL_GESTURE_REGISTRY } from '../services/gestureRegistry';
import { GestureDefinition, FingerPhysicalState } from '../types';
import {
  Search,
  Sparkles,
  CheckCircle2,
  Layers,
  Flame,
  Eye,
  Compass,
  ShieldAlert,
  Table as TableIcon,
  LayoutGrid,
  Video,
  Users,
  Smile,
  Scan,
} from 'lucide-react';

interface GestureExplorerProps {
  theme?: 'dark' | 'light';
  onSimulateSign: (sign: string) => void;
  onSelectForPractice?: (gesture: GestureDefinition) => void;
}

interface PdfCategoryFilter {
  key: string;
  label: string;
  page: string;
  count: number;
  icon: React.ReactNode;
  minId: number;
  maxId: number;
}

const PDF_CATEGORIES: PdfCategoryFilter[] = [
  { key: 'all', label: 'All 50 Gestures', page: 'Dictionary', count: 50, icon: <Layers className="w-3.5 h-3.5" />, minId: 1, maxId: 50 },
  { key: 'two_hand', label: 'Two-Hand (6)', page: 'Dual-Hand', count: 6, icon: <Users className="w-3.5 h-3.5" />, minId: 0, maxId: 0 },
  { key: 'face_track', label: 'Face Tracking (8)', page: 'Facial Target', count: 8, icon: <Smile className="w-3.5 h-3.5" />, minId: 0, maxId: 0 },
  { key: 'p1', label: 'Universal & Greetings', page: 'Page 1', count: 10, icon: <Flame className="w-3.5 h-3.5" />, minId: 1, maxId: 10 },
  { key: 'p2', label: 'Expressive & Conversational', page: 'Page 2', count: 10, icon: <Eye className="w-3.5 h-3.5" />, minId: 11, maxId: 20 },
  { key: 'p3', label: 'Audible & Commands', page: 'Page 3-4', count: 15, icon: <Compass className="w-3.5 h-3.5" />, minId: 21, maxId: 35 },
  { key: 'p4', label: 'Negative & Symbolic', page: 'Page 5-6', count: 15, icon: <ShieldAlert className="w-3.5 h-3.5" />, minId: 36, maxId: 50 },
];

function getStateBadgeClass(state: FingerPhysicalState): string {
  switch (state) {
    case 'Open':
      return 'bg-emerald-950/80 text-emerald-300 border-emerald-800';
    case 'Curved':
      return 'bg-cyan-950/80 text-cyan-300 border-cyan-800';
    case 'Bent':
      return 'bg-amber-950/80 text-amber-300 border-amber-800';
    case 'Closed':
      return 'bg-neutral-900 text-neutral-400 border-neutral-800';
  }
}

export const GestureExplorer: React.FC<GestureExplorerProps> = ({
  onSimulateSign,
  onSelectForPractice,
}) => {
  const [selectedCategoryKey, setSelectedCategoryKey] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [testedSignId, setTestedSignId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const activeCategory = PDF_CATEGORIES.find((c) => c.key === selectedCategoryKey) || PDF_CATEGORIES[0];

  const filteredGestures = ASL_GESTURE_REGISTRY.filter((g) => {
    let matchesCategory = true;
    if (selectedCategoryKey === 'two_hand') {
      matchesCategory = !!g.isTwoHand;
    } else if (selectedCategoryKey === 'face_track') {
      matchesCategory = !!g.requiresFace;
    } else if (selectedCategoryKey !== 'all') {
      matchesCategory = g.pdfNumber >= activeCategory.minId && g.pdfNumber <= activeCategory.maxId;
    }

    const matchesSearch =
      g.sign.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.outputText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.poseDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (g.gapDifferentiator && g.gapDifferentiator.toLowerCase().includes(searchQuery.toLowerCase())) ||
      g.pdfNumber.toString() === searchQuery.trim() ||
      g.id.toString() === searchQuery.trim();

    return matchesCategory && matchesSearch;
  });

  const handleTest = (gesture: GestureDefinition) => {
    setTestedSignId(gesture.id);
    onSimulateSign(gesture.sign);
    setTimeout(() => setTestedSignId(null), 1500);
  };

  return (
    <div className="flex flex-col gap-6 text-white animate-fade-in">
      {/* Top Banner & Search Strip */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-[#181818] via-[#141414] to-black border border-neutral-800 shadow-[0_10px_35px_rgba(0,0,0,0.8)] flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#E50914]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 rounded bg-[#E50914] text-white text-[10px] font-black uppercase tracking-widest">
              Visual Gesture Dictionary • 50 Classes
            </span>
            <h2 className="text-2xl font-black tracking-tight font-sans text-white">
              Vector Representations & Training Registry
            </h2>
          </div>
          <p className="text-xs text-neutral-400 max-w-xl leading-relaxed">
            All 50 gestures from the master visual dictionary with continuous finger extensions:
            <strong className="text-emerald-400 ml-1">Open (100%)</strong>,
            <strong className="text-cyan-400 ml-1">Curved (80%)</strong>,
            <strong className="text-amber-400 ml-1">Bent (50%)</strong>,
            <strong className="text-neutral-400 ml-1">Closed (0%)</strong>.
            Weighted by anatomical digit contribution:
            <span className="text-red-400 font-semibold ml-1">Thumb (40%)</span>,
            <span className="text-amber-400 font-semibold ml-1">Index (25%)</span>,
            <span className="text-blue-400 font-semibold ml-1">Middle (20%)</span>,
            <span className="text-emerald-400 font-semibold ml-1">Ring (10%)</span>,
            <span className="text-purple-400 font-semibold ml-1">Pinky (5%)</span>.
          </p>
        </div>

        {/* View Switcher & Search */}
        <div className="flex items-center gap-3 w-full md:w-auto z-10">
          <div className="flex items-center rounded-xl bg-black/80 border border-neutral-800 p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'cards' ? 'bg-[#E50914] text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-[#E50914] text-white' : 'text-neutral-400 hover:text-white'
              }`}
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Master Table</span>
            </button>
          </div>

          <div className="relative flex-1 md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, # or word..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-black/80 border border-neutral-700 text-white text-xs focus:outline-none focus:border-[#E50914] transition-all placeholder:text-neutral-500 shadow-inner"
            />
            <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-3 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Legend & PDF Dictionary Status */}
      <div className="px-4 py-2.5 rounded-xl bg-neutral-900/80 border border-neutral-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-neutral-400 font-bold uppercase tracking-wider text-[11px] flex items-center gap-2">
          <span>Continuous Finger States:</span>
        </span>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <strong className="text-emerald-400">Open (100%)</strong>: Straight / extended
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
            <strong className="text-cyan-300">Curved (80%)</strong>: Cupped / arched
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <strong className="text-amber-300">Bent (50%)</strong>: Half-curled / pinched
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-500" />
            <strong className="text-neutral-400">Closed (0%)</strong>: Tightly curled into palm
          </span>
        </div>
      </div>

      {/* Category Filter Pills (Aligned with PDF Pages 1-4) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {PDF_CATEGORIES.map((cat) => {
          const isActive = selectedCategoryKey === cat.key;
          return (
            <button
              key={cat.key}
              onClick={() => setSelectedCategoryKey(cat.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-[#E50914] text-white shadow-[0_0_20px_rgba(229,9,20,0.6)] scale-102'
                  : 'bg-neutral-900/90 text-neutral-400 hover:text-white hover:bg-neutral-800 border border-neutral-800'
              }`}
            >
              {cat.icon}
              <span>{cat.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  isActive ? 'bg-black/40 text-white' : 'bg-neutral-800 text-neutral-400'
                }`}
              >
                {cat.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* VIEW 1: CARDS GRID (Rich Visuals from PDF) */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredGestures.map((gesture) => {
            const isTesting = testedSignId === gesture.id;
            const fs = gesture.fingerStates;
            return (
              <div
                key={gesture.id}
                className="group relative rounded-xl bg-neutral-900/70 border border-neutral-800/80 hover:border-neutral-600 p-4 transition-all duration-300 flex flex-col justify-between hover:shadow-[0_10px_25px_rgba(0,0,0,0.6)] hover:-translate-y-0.5"
              >
                <div>
                  {/* Top Visual Showcase Header */}
                  <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-black/60 border border-neutral-800">
                    <div className="w-13 h-13 rounded-xl bg-neutral-900 border border-neutral-700 flex items-center justify-center text-3xl shadow-inner shrink-0 group-hover:scale-110 transition-transform">
                      {gesture.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-400">
                        <span className="font-bold text-[#E50914]">#{gesture.pdfNumber}</span>
                        <span>•</span>
                        <span className="truncate">{gesture.categoryName}</span>
                      </div>
                      <h3 className="text-base font-bold text-white group-hover:text-red-400 transition-colors font-sans truncate">
                        {gesture.sign}
                      </h3>
                    </div>
                    <span className="text-[11px] font-black text-white px-2 py-0.5 rounded bg-[#E50914] shadow shrink-0">
                      {gesture.outputText}
                    </span>
                  </div>

                  {/* Biomechanical description */}
                  <p className="text-xs text-neutral-300 leading-relaxed line-clamp-2 mb-2">
                    {gesture.poseDescription}
                  </p>

                  {/* Badges for Two-Hand, Face Alignment, Gap Differentiator */}
                  <div className="flex flex-wrap items-center gap-1 mb-2.5">
                    {gesture.isTwoHand && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-950/90 border border-emerald-700 text-emerald-300 text-[9px] font-bold flex items-center gap-0.5">
                        <Users className="w-2.5 h-2.5" /> Two-Hand
                      </span>
                    )}
                    {gesture.requiresFace && (
                      <span className="px-1.5 py-0.5 rounded bg-sky-950/90 border border-sky-700 text-sky-300 text-[9px] font-bold flex items-center gap-0.5">
                        <Smile className="w-2.5 h-2.5" /> Face Tracked
                      </span>
                    )}
                    {gesture.gapDifferentiator && (
                      <span className="px-1.5 py-0.5 rounded bg-neutral-900 border border-neutral-700 text-cyan-300 text-[9px] font-mono flex items-center gap-0.5">
                        <Scan className="w-2.5 h-2.5" /> {gesture.gapDifferentiator}
                      </span>
                    )}
                  </div>

                  {/* 5-Finger Physical State Tags */}
                  <div className="grid grid-cols-5 gap-1 py-2 px-2 rounded-lg bg-black/60 border border-neutral-800 mb-3 text-[9px] font-mono">
                    <div className="text-center">
                      <span className="text-neutral-500 block text-[8px]">THUMB</span>
                      <span className={`px-1 py-0.2 rounded font-bold border block mt-0.5 ${getStateBadgeClass(fs.thumb)}`}>
                        {fs.thumb}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-neutral-500 block text-[8px]">INDEX</span>
                      <span className={`px-1 py-0.2 rounded font-bold border block mt-0.5 ${getStateBadgeClass(fs.index)}`}>
                        {fs.index}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-neutral-500 block text-[8px]">MID</span>
                      <span className={`px-1 py-0.2 rounded font-bold border block mt-0.5 ${getStateBadgeClass(fs.middle)}`}>
                        {fs.middle}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-neutral-500 block text-[8px]">RING</span>
                      <span className={`px-1 py-0.2 rounded font-bold border block mt-0.5 ${getStateBadgeClass(fs.ring)}`}>
                        {fs.ring}
                      </span>
                    </div>
                    <div className="text-center">
                      <span className="text-neutral-500 block text-[8px]">PINK</span>
                      <span className={`px-1 py-0.2 rounded font-bold border block mt-0.5 ${getStateBadgeClass(fs.pinky)}`}>
                        {fs.pinky}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-3 border-t border-neutral-800/80 flex items-center gap-2">
                  <button
                    onClick={() => handleTest(gesture)}
                    disabled={isTesting}
                    className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                      isTesting
                        ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.7)]'
                        : 'bg-neutral-800 hover:bg-[#E50914] text-neutral-300 hover:text-white'
                    }`}
                  >
                    {isTesting ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Emitted "{gesture.outputText}"</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 group-hover:text-white" />
                        <span>Simulate</span>
                      </>
                    )}
                  </button>

                  {onSelectForPractice && (
                    <button
                      onClick={() => onSelectForPractice(gesture)}
                      className="py-1.5 px-3 rounded-lg bg-black/80 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs font-semibold border border-neutral-700 transition-all flex items-center gap-1 cursor-pointer"
                      title="Practice this gesture with your webcam"
                    >
                      <Video className="w-3 h-3 text-emerald-400" />
                      <span>Webcam</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* VIEW 2: CONSOLIDATED MASTER TRAINING TABLE */
        <div className="rounded-xl bg-neutral-900/70 border border-neutral-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-black/60 border-b border-neutral-800 text-neutral-400 font-mono text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-3 w-12 text-center">#</th>
                  <th className="py-3 px-3 w-14 text-center">Visual</th>
                  <th className="py-3 px-4">Gesture</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-3 text-center">Output</th>
                  <th className="py-3 px-3 text-center font-bold text-red-400">Thumb (40%)</th>
                  <th className="py-3 px-3 text-center font-bold text-amber-400">Index (25%)</th>
                  <th className="py-3 px-3 text-center font-bold text-blue-400">Middle (20%)</th>
                  <th className="py-3 px-3 text-center font-bold text-emerald-400">Ring (10%)</th>
                  <th className="py-3 px-3 text-center font-bold text-purple-400">Pinky (5%)</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/60 font-sans">
                {filteredGestures.map((gesture) => {
                  const isTesting = testedSignId === gesture.id;
                  const fs = gesture.fingerStates;
                  return (
                    <tr
                      key={gesture.id}
                      className="hover:bg-neutral-800/40 transition-colors group"
                    >
                      <td className="py-3 px-3 text-center font-mono font-bold text-neutral-500">
                        #{gesture.pdfNumber}
                      </td>
                      <td className="py-3 px-3 text-center text-2xl group-hover:scale-125 transition-transform">
                        {gesture.emoji}
                      </td>
                      <td className="py-3 px-4 font-bold text-white group-hover:text-red-400 transition-colors">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{gesture.sign}</span>
                          {gesture.isTwoHand && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-950/80 border border-emerald-700 text-emerald-400 text-[8px] font-bold">
                              2-HAND
                            </span>
                          )}
                          {gesture.requiresFace && (
                            <span className="px-1.5 py-0.2 rounded bg-sky-950/80 border border-sky-700 text-sky-400 text-[8px] font-bold">
                              FACE
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-neutral-500 font-normal line-clamp-1">
                          {gesture.poseDescription}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-neutral-400 font-medium">
                        {gesture.categoryName}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 rounded bg-[#E50914] text-white font-black text-[10px] tracking-wide">
                          {gesture.outputText}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStateBadgeClass(fs.thumb)}`}>
                          {fs.thumb}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStateBadgeClass(fs.index)}`}>
                          {fs.index}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStateBadgeClass(fs.middle)}`}>
                          {fs.middle}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStateBadgeClass(fs.ring)}`}>
                          {fs.ring}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStateBadgeClass(fs.pinky)}`}>
                          {fs.pinky}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleTest(gesture)}
                            disabled={isTesting}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                              isTesting
                                ? 'bg-emerald-600 text-white'
                                : 'bg-neutral-800 hover:bg-[#E50914] text-neutral-300 hover:text-white'
                            }`}
                          >
                            {isTesting ? 'Emitted' : 'Simulate'}
                          </button>
                          {onSelectForPractice && (
                            <button
                              onClick={() => onSelectForPractice(gesture)}
                              className="px-2 py-1 rounded-lg bg-black/80 hover:bg-neutral-700 text-neutral-300 text-[11px] font-semibold border border-neutral-700 cursor-pointer"
                              title="Practice on webcam"
                            >
                              Webcam
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
