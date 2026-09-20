/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { BrickEngine } from './engine';
import { BuildMode, Theme } from './types';
import { LoaderScreen } from './components/LoaderScreen';
import { TouchJoystick } from './components/TouchJoystick';
import { TopBar } from './components/TopBar';
import { SideBar } from './components/SideBar';
import { BottomControls } from './components/BottomControls';
import { InventoryModal } from './components/InventoryModal';
import { HelpModal } from './components/HelpModal';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BrickEngine | null>(null);

  const [theme, setTheme] = useState<Theme>('dark');
  const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [statusText, setStatusText] = useState('INICIALIZACE MODELU...');
  const [mode, setMode] = useState<BuildMode>('BUILD');
  const [colorIdx, setColorIdx] = useState(0); // 0 = Green (Primary active color)
  const [rotation, setRotation] = useState(0);
  const [brickTypeId, setBrickTypeId] = useState('bb3005');
  const [brickCount, setBrickCount] = useState(0);
  const [canUndo, setCanUndo] = useState(false);
  const [invOpen, setInvOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [playerHeight, setPlayerHeight] = useState(1.6);
  const [realisticFx, setRealisticFx] = useState(true);
  const [ssaoEnabled, setSsaoEnabled] = useState(true);
  const [sunAngle, setSunAngle] = useState(65);
  const [dynamicSunOrbit, setDynamicSunOrbit] = useState(false);

  const invOpenRef = useRef(invOpen);
  const helpOpenRef = useRef(helpOpen);
  invOpenRef.current = invOpen;
  helpOpenRef.current = helpOpen;

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new BrickEngine(containerRef.current, {
      onBrickCountChange: (count) => setBrickCount(count),
      onCanUndoChange: (can) => setCanUndo(can),
      onStatusChange: (status, text) => {
        setEngineStatus(status);
        if (text) setStatusText(text);
      },
      onHeightChange: (h) => setPlayerHeight(h),
      onEscape: () => {
        if (helpOpenRef.current) {
          setHelpOpen(false);
          return true;
        }
        if (invOpenRef.current) {
          setInvOpen(false);
          return true;
        }
        return false;
      },
    });

    engine.setColorIdx(0);
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleToggleTheme = () => {
    const nextTheme: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    engineRef.current?.setTheme(nextTheme);
  };

  const handleSetMode = (m: BuildMode) => {
    setMode(m);
    engineRef.current?.setMode(m);
  };

  const handleSelectColor = (idx: number) => {
    setColorIdx(idx);
    engineRef.current?.setColorIdx(idx);
  };

  const handleSelectBrickType = (id: string) => {
    setBrickTypeId(id);
    engineRef.current?.setBrickType(id);
  };

  const handleRotate = () => {
    engineRef.current?.rotate();
    if (engineRef.current) {
      setRotation(engineRef.current.rotation);
    }
  };

  const handleUndo = () => {
    engineRef.current?.undo();
  };

  const handleClearScene = () => {
    engineRef.current?.clearAll();
  };

  const handleResetCamera = () => {
    engineRef.current?.resetCamera();
  };

  const handleElevate = (delta: number) => {
    engineRef.current?.elevate(delta);
  };

  const handleLoadPreset = (name: 'tower' | 'pyramid' | 'house') => {
    engineRef.current?.loadPreset(name);
  };

  const handleAction = () => {
    engineRef.current?.performAction();
  };

  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      if (engineRef.current) {
        engineRef.current.soundEnabled = next;
      }
      return next;
    });
  };

  const handleToggleRealisticFx = () => {
    setRealisticFx((prev) => {
      const next = !prev;
      if (engineRef.current) {
        engineRef.current.setRealisticFx(next);
      }
      return next;
    });
  };

  const handleToggleSSAO = () => {
    setSsaoEnabled((prev) => {
      const next = !prev;
      if (engineRef.current) {
        engineRef.current.setSSAOEnabled(next);
      }
      return next;
    });
  };

  const handleSetSunAngle = (angle: number) => {
    setSunAngle(angle);
    if (engineRef.current) {
      engineRef.current.setSunAngle(angle);
    }
  };

  const handleToggleDynamicSunOrbit = () => {
    setDynamicSunOrbit((prev) => {
      const next = !prev;
      if (engineRef.current) {
        engineRef.current.setDynamicSunOrbit(next);
      }
      return next;
    });
  };

  return (
    <main
      className={`relative w-screen h-screen overflow-hidden select-none touch-none ${
        theme === 'dark' ? 'bg-[#0a0e17]' : 'bg-[#e2e8f0]'
      }`}
    >
      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-full cursor-crosshair"
      />

      {/* Cinematic Studio Vignette */}
      {realisticFx && (
        <div
          className={`absolute inset-0 pointer-events-none transition-opacity duration-300 ${
            theme === 'dark'
              ? 'bg-[radial-gradient(ellipse_at_center,transparent_50%,rgba(0,0,0,0.48)_100%)]'
              : 'bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(71,85,105,0.16)_100%)]'
          }`}
        />
      )}

      {/* Reticle in the exact center */}
      {engineStatus === 'ready' && <div className="crosshair" />}

      {/* Loading Screen */}
      {engineStatus === 'loading' && (
        <LoaderScreen statusText={statusText} subText="Autentické spáry kostek & studiové osvětlení" />
      )}

      {/* In-Game Minimal UI Overlay */}
      {engineStatus === 'ready' && (
        <div id="ui" className="absolute inset-0 pointer-events-none">
          {/* Virtual Joystick for Touch */}
          <TouchJoystick engine={engineRef.current} />

          {/* Top Panel Controls */}
          <TopBar
            canUndo={canUndo}
            brickCount={brickCount}
            rotation={rotation}
            soundEnabled={soundEnabled}
            playerHeight={playerHeight}
            theme={theme}
            realisticFx={realisticFx}
            ssaoEnabled={ssaoEnabled}
            sunAngle={sunAngle}
            dynamicSunOrbit={dynamicSunOrbit}
            onUndo={handleUndo}
            onRotate={handleRotate}
            onToggleTheme={handleToggleTheme}
            onToggleSound={handleToggleSound}
            onToggleRealisticFx={handleToggleRealisticFx}
            onToggleSSAO={handleToggleSSAO}
            onSetSunAngle={handleSetSunAngle}
            onToggleDynamicSunOrbit={handleToggleDynamicSunOrbit}
            onResetCamera={handleResetCamera}
            onClearScene={handleClearScene}
            onOpenHelp={() => setHelpOpen(true)}
            onElevate={handleElevate}
            onLoadPreset={handleLoadPreset}
          />

          {/* Side Mode Selector */}
          <SideBar
            mode={mode}
            soundEnabled={soundEnabled}
            theme={theme}
            onSetMode={handleSetMode}
          />

          {/* Bottom Right Action & Color Pill */}
          <BottomControls
            mode={mode}
            colorIdx={colorIdx}
            soundEnabled={soundEnabled}
            theme={theme}
            onAction={handleAction}
            onToggleInventory={() => setInvOpen((prev) => !prev)}
          />

          {/* Inventory & Color Palette Drawer */}
          <InventoryModal
            isOpen={invOpen}
            selectedColorIdx={colorIdx}
            selectedBrickTypeId={brickTypeId}
            soundEnabled={soundEnabled}
            theme={theme}
            onSelectColor={handleSelectColor}
            onSelectBrickType={handleSelectBrickType}
            onClose={() => setInvOpen(false)}
          />

          {/* Help / Controls modal */}
          <HelpModal
            isOpen={helpOpen}
            soundEnabled={soundEnabled}
            theme={theme}
            onClose={() => setHelpOpen(false)}
          />
        </div>
      )}
    </main>
  );
}
