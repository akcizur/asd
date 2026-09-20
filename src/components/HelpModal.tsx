import React from 'react';
import { X, Smartphone, Monitor, ShieldCheck } from 'lucide-react';
import { playClickSound } from '../audio';
import { Theme } from '../types';

interface HelpModalProps {
  isOpen: boolean;
  soundEnabled: boolean;
  theme: Theme;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, soundEnabled, theme, onClose }) => {
  if (!isOpen) return null;

  const isDark = theme === 'dark';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Nápověda ovládání"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        className={`rounded-3xl p-6 max-w-md w-full border flex flex-col gap-5 ${
          isDark
            ? 'bg-[#0f1624] border-[#1f2a3f] text-gray-100'
            : 'bg-white border-slate-200 text-slate-800'
        }`}
      >
        <div className={`flex items-center justify-between border-b pb-3 ${isDark ? 'border-[#1f2a3f]' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-lg">Ovládání a minimalismus</h3>
          </div>
          <button
            onClick={() => {
              playClickSound(soundEnabled);
              onClose();
            }}
            title="Zavřít (ESC)"
            aria-label="Zavřít nápovědu"
            className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isDark ? 'bg-[#1a2336] hover:bg-[#23314c] text-gray-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Minimalist Design & Proportions */}
        <div
          className={`p-3 rounded-xl text-xs leading-relaxed border ${
            isDark
              ? 'bg-[#141d2e] border-[#1f2a3f] text-gray-300'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <strong className="text-emerald-400 block mb-1">Mírné zaoblení, SSAO okluze spár & Dynamické stíny slunce:</strong>
          Kostky disponují autentickou tolerancí 6 mm vytvářející zřetelné spáry mezi jednotlivými díly. Systém SSAO (Screen Space Ambient Occlusion) zdůrazňuje štěrbiny a kontaktní hrany pro hmatatelný prostorový dojem, zatímco dynamické osvětlení vrhá měkké stíny (PCF Soft Shadows) přizpůsobené úhlu a výšce slunce s možností plynulého oběhu.
        </div>

        {/* Desktop Keyboard & Mouse Controls */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <Monitor className="w-4 h-4" />
            <span>Počítač (Klávesnice & Myš)</span>
          </div>
          <div
            className={`grid grid-cols-2 gap-2 text-xs p-3 rounded-xl border font-mono ${
              isDark ? 'bg-[#141d2e] border-[#1f2a3f] text-gray-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <div><span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">W A S D</span> Pohyb</div>
            <div><span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Myš</span> Tah = Pohled</div>
            <div><span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Klik / Mezerník</span> Akce</div>
            <div><span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">ESC</span> Krok zpět / Návrat</div>
            <div><span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">R</span> Otočit o 90°</div>
            <div><span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">B / E</span> Stavět / Mazat</div>
            <div><span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">Kolečko / PgUp</span> Výška</div>
            <div><span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">C / I</span> Paleta barev</div>
          </div>
        </div>

        {/* Mobile touch controls */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
            <Smartphone className="w-4 h-4" />
            <span>Mobil / Dotykové ovládání</span>
          </div>
          <ul
            className={`text-xs space-y-1 p-3 rounded-xl border ${
              isDark ? 'bg-[#141d2e] border-[#1f2a3f] text-gray-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
          >
            <li><strong>Levá strana:</strong> Virtuální joystick pro plynulý pohyb</li>
            <li><strong>Pravá strana:</strong> Potažením prstu se rozhlížíte</li>
            <li><strong>Zelené tlačítko vpravo dole:</strong> Položit / smazat blok</li>
          </ul>
        </div>

        <button
          onClick={() => {
            playClickSound(soundEnabled);
            onClose();
          }}
          className="w-full bg-[#10b981] hover:bg-[#059669] text-white font-semibold py-2.5 rounded-xl transition-colors"
        >
          Rozumím
        </button>
      </div>
    </div>
  );
};
