import React from 'react';
import { BuildMode, Theme } from '../types';
import { playClickSound } from '../audio';
import { Hammer, Eraser } from 'lucide-react';

interface SideBarProps {
  mode: BuildMode;
  soundEnabled: boolean;
  theme: Theme;
  onSetMode: (mode: BuildMode) => void;
}

export const SideBar: React.FC<SideBarProps> = ({ mode, soundEnabled, theme, onSetMode }) => {
  const isDark = theme === 'dark';

  return (
    <aside
      aria-label="Režim stavění nebo mazání"
      className="fixed left-5 top-1/2 -translate-y-1/2 z-20 pointer-events-none"
    >
      <div
        className={`p-1.5 rounded-2xl flex flex-col gap-2 pointer-events-auto border transition-colors ${
          isDark
            ? 'bg-[#0f1624] border-[#1f2a3f] text-gray-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Build Mode Button with Emerald Accent */}
        <button
          id="mode-build"
          onClick={() => {
            playClickSound(soundEnabled);
            onSetMode('BUILD');
          }}
          title="Režim stavění (Klávesa B)"
          aria-label="Režim stavění"
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all ${
            mode === 'BUILD'
              ? 'bg-[#10b981] text-white font-bold'
              : isDark
              ? 'hover:bg-[#1a2336] text-gray-400 hover:text-gray-200'
              : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
          }`}
        >
          <Hammer className="w-5 h-5" />
          <span className="text-[9px] font-mono leading-none mt-0.5">STAVĚT</span>
        </button>

        {/* Erase Mode Button with Flat High-Contrast Red */}
        <button
          id="mode-erase"
          onClick={() => {
            playClickSound(soundEnabled);
            onSetMode('ERASE');
          }}
          title="Režim mazání (Klávesa E nebo X)"
          aria-label="Režim mazání"
          className={`w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all ${
            mode === 'ERASE'
              ? 'bg-[#ef4444] text-white font-bold'
              : isDark
              ? 'hover:bg-[#1a2336] text-gray-400 hover:text-gray-200'
              : 'hover:bg-slate-100 text-slate-500 hover:text-slate-800'
          }`}
        >
          <Eraser className="w-5 h-5" />
          <span className="text-[9px] font-mono leading-none mt-0.5">SMAZAT</span>
        </button>
      </div>
    </aside>
  );
};
