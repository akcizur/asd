import React, { useState } from 'react';
import {
  RotateCw,
  Undo2,
  Sun,
  Moon,
  MoreHorizontal,
  Volume2,
  VolumeX,
  Eye,
  Trash2,
  HelpCircle,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Layers,
  Orbit,
} from 'lucide-react';
import { playClickSound } from '../audio';
import { Theme } from '../types';

interface TopBarProps {
  canUndo: boolean;
  brickCount: number;
  rotation: number;
  soundEnabled: boolean;
  playerHeight: number;
  theme: Theme;
  realisticFx: boolean;
  ssaoEnabled?: boolean;
  sunAngle?: number;
  dynamicSunOrbit?: boolean;
  onUndo: () => void;
  onRotate: () => void;
  onToggleTheme: () => void;
  onToggleSound: () => void;
  onToggleRealisticFx: () => void;
  onToggleSSAO?: () => void;
  onSetSunAngle?: (angle: number) => void;
  onToggleDynamicSunOrbit?: () => void;
  onResetCamera: () => void;
  onClearScene: () => void;
  onOpenHelp: () => void;
  onElevate: (delta: number) => void;
  onLoadPreset: (name: 'tower' | 'pyramid' | 'house') => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  canUndo,
  brickCount,
  rotation,
  soundEnabled,
  playerHeight,
  theme,
  realisticFx,
  ssaoEnabled = true,
  sunAngle = 65,
  dynamicSunOrbit = false,
  onUndo,
  onRotate,
  onToggleTheme,
  onToggleSound,
  onToggleRealisticFx,
  onToggleSSAO,
  onSetSunAngle,
  onToggleDynamicSunOrbit,
  onResetCamera,
  onClearScene,
  onOpenHelp,
  onElevate,
  onLoadPreset,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [presetSubmenu, setPresetSubmenu] = useState(false);

  const isDark = theme === 'dark';

  return (
    <header className="fixed top-4 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex flex-col items-center">
      {/* Minimal Main Bar */}
      <nav
        aria-label="Hlavní panel"
        className={`px-3 py-1.5 rounded-2xl flex items-center gap-2 pointer-events-auto border transition-colors ${
          isDark
            ? 'bg-[#0f1624] border-[#1f2a3f] text-gray-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        {/* Undo button with ESC indicator */}
        <button
          id="btn-undo"
          onClick={() => {
            playClickSound(soundEnabled);
            onUndo();
          }}
          disabled={!canUndo}
          title="Zpět (Klávesa ESC nebo Z)"
          aria-label="Krok zpět"
          className={`h-9 px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-medium transition-all ${
            canUndo
              ? isDark
                ? 'bg-[#1a2336] hover:bg-[#23314c] text-emerald-400 active:scale-95'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 active:scale-95'
              : 'opacity-35 cursor-not-allowed text-gray-400'
          }`}
        >
          <Undo2 className="w-4 h-4" />
          <span className="hidden sm:inline">Zpět</span>
          <span className="text-[10px] px-1 py-0.2 rounded bg-black/20 font-mono">ESC</span>
        </button>

        {/* Rotate button */}
        <button
          id="btn-rotate"
          onClick={() => {
            onRotate();
          }}
          title={`Otočit model (R) - ${rotation * 90}°`}
          aria-label="Otočit model"
          className={`h-9 px-2.5 rounded-xl flex items-center gap-1.5 text-xs font-medium transition-all ${
            isDark
              ? 'bg-[#1a2336] hover:bg-[#23314c] text-gray-200 active:scale-95'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95'
          }`}
        >
          <RotateCw className="w-4 h-4" />
          <span className="font-mono text-emerald-400 font-semibold">{rotation * 90}°</span>
        </button>

        <div className={`w-[1px] h-5 ${isDark ? 'bg-[#1f2a3f]' : 'bg-slate-200'} mx-0.5`} />

        {/* Brick count badge */}
        <div
          title="Počet položených kostek"
          className={`h-9 px-3 rounded-xl flex items-center gap-2 text-xs font-medium ${
            isDark ? 'bg-[#141d2e] text-gray-200' : 'bg-slate-50 text-slate-700'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{brickCount} <span className="hidden sm:inline">kostek</span></span>
        </div>

        {/* Height Elevation Stepper */}
        <div
          className={`flex items-center h-9 px-1 rounded-xl border ${
            isDark ? 'bg-[#141d2e] border-[#1f2a3f]' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              onElevate(-0.3);
            }}
            title="Snížit výšku pohledu (PageDown / Kolečka dolů)"
            aria-label="Snížit výšku"
            className="p-1 rounded-lg hover:bg-emerald-500/10 active:scale-90 text-gray-400 hover:text-emerald-400"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          <span className="px-1.5 text-[11px] font-mono whitespace-nowrap" title="Výška pohledu">
            {playerHeight.toFixed(1)}m
          </span>
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              onElevate(0.3);
            }}
            title="Zvýšit výšku pohledu (PageUp / Kolečka nahoru)"
            aria-label="Zvýšit výšku"
            className="p-1 rounded-lg hover:bg-emerald-500/10 active:scale-90 text-gray-400 hover:text-emerald-400"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className={`w-[1px] h-5 ${isDark ? 'bg-[#1f2a3f]' : 'bg-slate-200'} mx-0.5`} />

        {/* Dark / Light Mode Toggle */}
        <button
          id="btn-theme-toggle"
          onClick={() => {
            playClickSound(soundEnabled);
            onToggleTheme();
          }}
          title={isDark ? 'Přepnout na světlý režim' : 'Přepnout na tmavý režim'}
          aria-label="Režim vzhledu"
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            isDark
              ? 'bg-[#1a2336] hover:bg-[#23314c] text-amber-300 active:scale-95'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-800 active:scale-95'
          }`}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Quick Sunlight Angle button */}
        {realisticFx && (
          <button
            id="btn-sun-angle"
            onClick={() => {
              playClickSound(soundEnabled);
              const nextAngles = [45, 120, 230, 315];
              const curAngle = sunAngle;
              const nextAngle = nextAngles.find((a) => a > curAngle + 15) ?? nextAngles[0];
              onSetSunAngle?.(nextAngle);
            }}
            title={`Úhel slunce & stínů: ${Math.round(sunAngle)}° (Kliknutím přepnete úhel)`}
            aria-label="Úhel slunce"
            className={`h-9 px-2 rounded-xl flex items-center gap-1 text-xs font-mono transition-all ${
              isDark
                ? 'bg-[#1a2336] hover:bg-[#23314c] text-amber-300 active:scale-95'
                : 'bg-slate-100 hover:bg-slate-200 text-amber-600 active:scale-95'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
            <span className="text-[11px] font-semibold">{Math.round(sunAngle)}°</span>
          </button>
        )}

        {/* Menu & Settings Dropdown Toggle */}
        <div className="relative">
          <button
            id="btn-menu-toggle"
            onClick={() => {
              playClickSound(soundEnabled);
              setMenuOpen((prev) => !prev);
              setPresetSubmenu(false);
            }}
            title="Další možnosti a nastavení"
            aria-label="Menu"
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              menuOpen
                ? 'bg-emerald-500 text-white'
                : isDark
                ? 'bg-[#1a2336] hover:bg-[#23314c] text-gray-300 active:scale-95'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 active:scale-95'
            }`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {/* Minimal Settings Dropdown */}
          {menuOpen && (
            <div
              className={`absolute top-12 right-0 w-64 rounded-2xl p-2.5 border flex flex-col gap-1.5 z-30 pointer-events-auto animate-fade-scale shadow-2xl ${
                isDark
                  ? 'bg-[#0f1624] border-[#1f2a3f] text-gray-100'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                Možnosti & Nástroje
              </div>

              {/* Presets Button */}
              <button
                onClick={() => {
                  playClickSound(soundEnabled);
                  setPresetSubmenu((p) => !p);
                }}
                className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                  presetSubmenu
                    ? 'bg-emerald-500/15 text-emerald-400'
                    : isDark
                    ? 'hover:bg-[#1a2336]'
                    : 'hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Vzory staveb</span>
                </div>
                <span className="text-[10px] text-gray-400">3 vzory</span>
              </button>

              {/* Presets Submenu */}
              {presetSubmenu && (
                <div className={`p-1.5 rounded-xl flex flex-col gap-1 ${isDark ? 'bg-[#141d2e]' : 'bg-slate-50'}`}>
                  <button
                    onClick={() => {
                      playClickSound(soundEnabled);
                      onLoadPreset('tower');
                      setMenuOpen(false);
                    }}
                    className={`w-full px-2 py-1.5 rounded-lg text-left text-xs flex items-center gap-2 ${
                      isDark ? 'hover:bg-[#1f2a3f]' : 'hover:bg-slate-200'
                    }`}
                  >
                    <span>🏰</span>
                    <span className="font-medium">Hradní věž (2.4m)</span>
                  </button>
                  <button
                    onClick={() => {
                      playClickSound(soundEnabled);
                      onLoadPreset('pyramid');
                      setMenuOpen(false);
                    }}
                    className={`w-full px-2 py-1.5 rounded-lg text-left text-xs flex items-center gap-2 ${
                      isDark ? 'hover:bg-[#1f2a3f]' : 'hover:bg-slate-200'
                    }`}
                  >
                    <span>🔺</span>
                    <span className="font-medium">Pyramida (3 stupně)</span>
                  </button>
                  <button
                    onClick={() => {
                      playClickSound(soundEnabled);
                      onLoadPreset('house');
                      setMenuOpen(false);
                    }}
                    className={`w-full px-2 py-1.5 rounded-lg text-left text-xs flex items-center gap-2 ${
                      isDark ? 'hover:bg-[#1f2a3f]' : 'hover:bg-slate-200'
                    }`}
                  >
                    <span>🏠</span>
                    <span className="font-medium">Domek se střechou</span>
                  </button>
                </div>
              )}

              {/* Realistic Scene FX Toggle */}
              <button
                onClick={() => {
                  playClickSound(soundEnabled);
                  onToggleRealisticFx();
                }}
                className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                  isDark ? 'hover:bg-[#1a2336]' : 'hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className={`w-4 h-4 ${realisticFx ? 'text-amber-400' : 'text-gray-400'}`} />
                  <span>Realistické Scene FX</span>
                </div>
                <span className={`text-[10px] font-semibold ${realisticFx ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {realisticFx ? 'ZAP' : 'VYP'}
                </span>
              </button>

              {/* SSAO Crevice Shadows & Dynamic Sunlight Controls */}
              {realisticFx && (
                <div
                  className={`p-2 rounded-xl border flex flex-col gap-2 ${
                    isDark ? 'bg-[#141d2e] border-[#1f2a3f]' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <button
                    onClick={() => {
                      playClickSound(soundEnabled);
                      onToggleSSAO?.();
                    }}
                    title="Screen Space Ambient Occlusion - zvýrazňuje spáry a záhyby mezi kostkami"
                    className="w-full text-left text-xs flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Layers className={`w-4 h-4 ${ssaoEnabled ? 'text-emerald-400' : 'text-gray-400'}`} />
                      <div>
                        <div className="font-medium">SSAO Okluze štěrbin</div>
                        <div className="text-[10px] text-gray-400">Hloubka ve spojích & spárách</div>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold ${ssaoEnabled ? 'text-emerald-400' : 'text-gray-400'}`}>
                      {ssaoEnabled ? 'ZAP' : 'VYP'}
                    </span>
                  </button>

                  <div className={`w-full h-[1px] ${isDark ? 'bg-[#1f2a3f]' : 'bg-slate-200'}`} />

                  {/* Dynamic Sunlight & Soft Shadows */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-medium">Úhel slunce</span>
                      </div>
                      <span className="font-mono text-[11px] font-bold text-amber-400">{Math.round(sunAngle)}°</span>
                    </div>

                    {/* Angle Presets */}
                    <div className="grid grid-cols-4 gap-1">
                      {[
                        { label: '45°', angle: 45, title: 'Ráno' },
                        { label: '120°', angle: 120, title: 'Poledne' },
                        { label: '230°', angle: 230, title: 'Západ' },
                        { label: '315°', angle: 315, title: 'Soumrak' },
                      ].map((item) => (
                        <button
                          key={item.angle}
                          onClick={() => {
                            playClickSound(soundEnabled);
                            onSetSunAngle?.(item.angle);
                          }}
                          title={item.title}
                          className={`py-1 text-[10px] font-mono rounded-lg border transition-all ${
                            Math.abs(sunAngle - item.angle) < 15
                              ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                              : isDark
                              ? 'bg-[#1a2336] border-[#223048] hover:bg-[#23314c] text-gray-300'
                              : 'bg-white border-slate-200 hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Sunlight Slider */}
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={sunAngle}
                      onChange={(e) => onSetSunAngle?.(Number(e.target.value))}
                      aria-label="Nastavení úhlu slunce"
                      className="w-full h-1.5 bg-gray-600/40 rounded-lg appearance-none cursor-pointer accent-amber-400 my-1"
                    />

                    {/* Dynamic Sun Orbit Toggle */}
                    <button
                      onClick={() => {
                        playClickSound(soundEnabled);
                        onToggleDynamicSunOrbit?.();
                      }}
                      title="Plynulý pohyb slunce vrhající živé rotující stíny"
                      className={`w-full py-1 px-2 rounded-lg text-[11px] flex items-center justify-between border transition-colors ${
                        dynamicSunOrbit
                          ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                          : isDark
                          ? 'bg-[#1a2336] border-[#223048] text-gray-300'
                          : 'bg-white border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Orbit className={`w-3.5 h-3.5 ${dynamicSunOrbit ? 'text-emerald-400 animate-spin' : 'text-gray-400'}`} />
                        <span>Dynamický oběh slunce</span>
                      </div>
                      <span className="font-semibold text-[10px]">{dynamicSunOrbit ? 'ZAP' : 'VYP'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Sound Toggle */}
              <button
                onClick={() => {
                  onToggleSound();
                }}
                className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center justify-between transition-colors ${
                  isDark ? 'hover:bg-[#1a2336]' : 'hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  {soundEnabled ? (
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-4 h-4 text-gray-400" />
                  )}
                  <span>Zvukové efekty</span>
                </div>
                <span className={`text-[10px] font-semibold ${soundEnabled ? 'text-emerald-400' : 'text-gray-400'}`}>
                  {soundEnabled ? 'ZAP' : 'VYP'}
                </span>
              </button>

              {/* Reset Camera */}
              <button
                onClick={() => {
                  playClickSound(soundEnabled);
                  onResetCamera();
                  setMenuOpen(false);
                }}
                className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center gap-2 transition-colors ${
                  isDark ? 'hover:bg-[#1a2336]' : 'hover:bg-slate-100'
                }`}
              >
                <Eye className="w-4 h-4 text-gray-400" />
                <span>Resetovat kameru</span>
              </button>

              {/* Help Modal */}
              <button
                onClick={() => {
                  playClickSound(soundEnabled);
                  onOpenHelp();
                  setMenuOpen(false);
                }}
                className={`w-full px-2.5 py-2 rounded-xl text-left text-xs flex items-center gap-2 transition-colors ${
                  isDark ? 'hover:bg-[#1a2336]' : 'hover:bg-slate-100'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-emerald-400" />
                <span>Nápověda & Zkratky</span>
              </button>

              {/* Clear Scene */}
              {brickCount > 0 && (
                <>
                  <div className={`w-full h-[1px] ${isDark ? 'bg-[#1f2a3f]' : 'bg-slate-200'} my-1`} />
                  <button
                    onClick={() => {
                      playClickSound(soundEnabled);
                      if (window.confirm('Opravdu chcete vyčistit všechny položené kostky?')) {
                        onClearScene();
                        setMenuOpen(false);
                      }
                    }}
                    className="w-full px-2.5 py-2 rounded-xl text-left text-xs text-rose-400 hover:bg-rose-500/15 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Smazat všechny kostky</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};
