import React from 'react';

interface LoaderScreenProps {
  statusText?: string;
  subText?: string;
}

export const LoaderScreen: React.FC<LoaderScreenProps> = ({
  statusText = 'INICIALIZACE...',
  subText = 'Zaoblené LEGO bloky',
}) => {
  return (
    <div
      id="loader-screen"
      className="fixed inset-0 bg-[#0a0e17] z-50 flex flex-col items-center justify-center select-none"
    >
      <div className="relative mb-8 flex items-center justify-center">
        {/* Animated brick stud ring with emerald accent */}
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-400 animate-spin border-t-transparent" />
        </div>
      </div>

      <h2
        id="load-status"
        className="text-gray-100 font-light tracking-[0.2em] text-base sm:text-lg uppercase text-center px-4"
      >
        {statusText}
      </h2>
      <p className="text-emerald-400/80 text-xs font-mono mt-2 tracking-wider">
        {subText}
      </p>

      <div className="mt-8 flex items-center gap-2 text-gray-500 text-xs tracking-widest uppercase">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Byldr Studio
      </div>
    </div>
  );
};
