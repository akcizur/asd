import React from 'react';
import { BRICK_TYPES, COLORS, Theme } from '../types';
import { playClickSound } from '../audio';
import { X, Layers } from 'lucide-react';

interface InventoryModalProps {
  isOpen: boolean;
  selectedColorIdx: number;
  selectedBrickTypeId: string;
  soundEnabled: boolean;
  theme: Theme;
  onSelectColor: (idx: number) => void;
  onSelectBrickType: (id: string) => void;
  onClose: () => void;
}

export const InventoryModal: React.FC<InventoryModalProps> = ({
  isOpen,
  selectedColorIdx,
  selectedBrickTypeId,
  soundEnabled,
  theme,
  onSelectColor,
  onSelectBrickType,
  onClose,
}) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <div
      id="inventory"
      role="dialog"
      aria-modal="true"
      aria-label="Paleta a typy kostek"
      className={`fixed inset-x-0 bottom-0 z-40 pb-8 pt-5 px-4 border-t transition-transform duration-200 max-h-[85vh] overflow-y-auto ${
        isDark
          ? 'bg-[#0f1624] border-[#1f2a3f] text-gray-100'
          : 'bg-white border-slate-200 text-slate-800'
      }`}
    >
      <div className="max-w-xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-[#1f2a3f]' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-400" />
            <h3 className="font-semibold text-lg tracking-wide">
              Paleta & Typy kostek
            </h3>
          </div>
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              onClose();
            }}
            title="Zavřít (ESC)"
            aria-label="Zavřít paletu"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isDark ? 'bg-[#1a2336] hover:bg-[#23314c] text-gray-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Brick Type Selector */}
        <div>
          <label className="text-xs uppercase tracking-wider text-gray-400 font-medium mb-2.5 block">
            Typ kostky se zaoblenými hranami
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {BRICK_TYPES.map((type) => {
              const isSelected = type.id === selectedBrickTypeId;
              return (
                <button
                  key={type.id}
                  onClick={() => {
                    playClickSound(soundEnabled);
                    onSelectBrickType(type.id);
                  }}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                    isSelected
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 font-medium'
                      : isDark
                      ? 'bg-[#141d2e] border-[#1f2a3f] text-gray-300 hover:bg-[#1a2336]'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xs font-semibold">{type.name}</span>
                  <span className={`text-[10px] font-mono ${isSelected ? 'text-emerald-400/80' : 'text-gray-400'}`}>
                    {type.studsX}×{type.studsZ} studs ({Math.round(type.w * 100)}×{Math.round(type.l * 100)} cm)
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Color Palette Grid */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-xs uppercase tracking-wider text-gray-400 font-medium">
              Výběr barvy ({COLORS[selectedColorIdx]?.label || 'Zelená'})
            </label>
            <span className="text-xs font-mono text-emerald-400 font-semibold">
              {COLORS[selectedColorIdx]?.css.toUpperCase()}
            </span>
          </div>

          <div
            className={`grid grid-cols-5 sm:grid-cols-8 gap-3.5 p-3 rounded-2xl border ${
              isDark ? 'bg-[#141d2e] border-[#1f2a3f]' : 'bg-slate-50 border-slate-200'
            }`}
          >
            {COLORS.map((color, idx) => {
              const isActive = idx === selectedColorIdx;
              return (
                <button
                  key={color.hex}
                  onClick={() => {
                    playClickSound(soundEnabled);
                    onSelectColor(idx);
                  }}
                  title={color.label}
                  aria-label={color.label}
                  className={`aspect-square rounded-xl transition-transform duration-150 cursor-pointer ${
                    isActive
                      ? 'ring-4 ring-emerald-400 scale-105'
                      : 'border border-black/20 hover:scale-105 active:scale-95'
                  }`}
                  style={{ backgroundColor: color.css }}
                />
              );
            })}
          </div>
        </div>

        {/* Bottom Close Button */}
        <div className="text-center pt-2">
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              onClose();
            }}
            className="w-full sm:w-auto bg-[#10b981] hover:bg-[#059669] active:scale-95 text-white py-3 px-12 rounded-xl font-bold tracking-wider transition-all"
          >
            ZAVŘÍT
          </button>
        </div>
      </div>
    </div>
  );
};
