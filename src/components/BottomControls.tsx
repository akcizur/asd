import React from 'react';
import { BuildMode, COLORS, Theme } from '../types';
import { playClickSound } from '../audio';
import { Plus, Trash2, Palette } from 'lucide-react';

interface BottomControlsProps {
  mode: BuildMode;
  colorIdx: number;
  soundEnabled: boolean;
  theme: Theme;
  onAction: () => void;
  onToggleInventory: () => void;
}

export const BottomControls: React.FC<BottomControlsProps> = ({
  mode,
  colorIdx,
  soundEnabled,
  theme,
  onAction,
  onToggleInventory,
}) => {
  const activeColor = COLORS[colorIdx]?.css || '#10b981';
  const isDark = theme === 'dark';

  return (
    <div className="fixed bottom-6 right-5 z-20 flex flex-col items-end gap-3 pointer-events-none">
      {/* Big Action Button - Flat & High-Contrast with Distinct Rounding */}
      <button
        id="btn-action"
        onClick={() => {
          onAction();
        }}
        title={
          mode === 'BUILD'
            ? 'Položit kostku (Mezerník / Kliknutí myší)'
            : 'Smazat zaměřenou kostku (Mezerník / Kliknutí myší)'
        }
        aria-label={mode === 'BUILD' ? 'Položit kostku' : 'Smazat kostku'}
        className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center pointer-events-auto transition-all transform active:scale-95 cursor-pointer ${
          mode === 'BUILD'
            ? 'bg-[#10b981] hover:bg-[#059669] text-white'
            : 'bg-[#ef4444] hover:bg-[#dc2626] text-white'
        }`}
      >
        {mode === 'BUILD' ? (
          <>
            <Plus className="w-8 h-8 stroke-[3]" />
            <span className="text-[10px] font-bold tracking-wider uppercase mt-0.5">POLOŽIT</span>
          </>
        ) : (
          <>
            <Trash2 className="w-7 h-7 stroke-[2.5]" />
            <span className="text-[10px] font-bold tracking-wider uppercase mt-0.5">SMAZAT</span>
          </>
        )}
      </button>

      {/* Color Preview & Inventory Toggle Panel */}
      <div
        className={`p-2 rounded-2xl flex items-center gap-2 pointer-events-auto border transition-colors ${
          isDark
            ? 'bg-[#0f1624] border-[#1f2a3f] text-gray-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Active Color Swatch Preview */}
        <button
          id="active-color-preview"
          onClick={() => {
            playClickSound(soundEnabled);
            onToggleInventory();
          }}
          title={`Aktivní barva: ${COLORS[colorIdx]?.label} (Klikněte pro změnu)`}
          aria-label="Výběr barvy"
          style={{ backgroundColor: activeColor }}
          className="w-10 h-10 rounded-xl border-2 border-white/60 cursor-pointer hover:scale-105 active:scale-95 transition-transform"
        />

        {/* Inventory Palette Button */}
        <button
          id="btn-inventory"
          onClick={() => {
            playClickSound(soundEnabled);
            onToggleInventory();
          }}
          title="Otevřít paletu a typy kostek (Klávesa C nebo I)"
          aria-label="Paleta kostek"
          className={`h-10 px-3 rounded-xl flex items-center gap-1.5 text-xs font-semibold transition-all ${
            isDark
              ? 'bg-[#1a2336] hover:bg-[#23314c] text-emerald-400 active:scale-95'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 active:scale-95'
          }`}
        >
          <Palette className="w-4 h-4" />
          <span className="hidden sm:inline">Paleta</span>
        </button>
      </div>
    </div>
  );
};
