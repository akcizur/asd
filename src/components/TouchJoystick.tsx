import React, { useEffect, useRef, useState } from 'react';
import { BrickEngine } from '../engine';

interface TouchJoystickProps {
  engine: BrickEngine | null;
}

export const TouchJoystick: React.FC<TouchJoystickProps> = ({ engine }) => {
  const [active, setActive] = useState(false);
  const [basePos, setBasePos] = useState({ x: 0, y: 0 });
  const [stickOffset, setStickOffset] = useState({ x: 0, y: 0 });

  const activeRef = useRef(false);
  const basePosRef = useRef({ x: 0, y: 0 });
  const joystickTouchIdRef = useRef<number | null>(null);
  const lookTouchIdRef = useRef<number | null>(null);
  const lastLookRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!engine) return;

    const isInteractiveElement = (target: EventTarget | null) => {
      if (!target || !(target instanceof HTMLElement)) return false;
      return target.closest('button, input, #inventory, .panel, .action-circle') !== null;
    };

    const handleTouchStart = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (isInteractiveElement(t.target)) continue;

        // Left region: joystick
        if (t.clientX < window.innerWidth / 2.5 && joystickTouchIdRef.current === null) {
          joystickTouchIdRef.current = t.identifier;
          activeRef.current = true;
          basePosRef.current = { x: t.clientX, y: t.clientY };
          setActive(true);
          setBasePos({ x: t.clientX, y: t.clientY });
          setStickOffset({ x: 0, y: 0 });
        }
        // Right region: look
        else if (t.clientX >= window.innerWidth / 2.5 && lookTouchIdRef.current === null) {
          lookTouchIdRef.current = t.identifier;
          lastLookRef.current = { x: t.clientX, y: t.clientY };
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      for (let i = 0; i < e.touches.length; i++) {
        const t = e.touches[i];

        // Process joystick touch
        if (t.identifier === joystickTouchIdRef.current && activeRef.current) {
          const dx = t.clientX - basePosRef.current.x;
          const dy = t.clientY - basePosRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const clampedDist = Math.min(dist, 50);
          const angle = Math.atan2(dy, dx);

          const offsetX = Math.cos(angle) * clampedDist;
          const offsetY = Math.sin(angle) * clampedDist;

          setStickOffset({ x: offsetX, y: offsetY });

          const side = (Math.cos(angle) * clampedDist) / 50;
          const forward = -((Math.sin(angle) * clampedDist) / 50);
          engine.setJoystickInput(forward, side);
        }

        // Process look touch
        if (t.identifier === lookTouchIdRef.current && lastLookRef.current) {
          const dx = t.clientX - lastLookRef.current.x;
          const dy = t.clientY - lastLookRef.current.y;
          engine.addTouchLook(dx, dy);
          lastLookRef.current = { x: t.clientX, y: t.clientY };
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        if (t.identifier === joystickTouchIdRef.current) {
          joystickTouchIdRef.current = null;
          activeRef.current = false;
          setActive(false);
          setStickOffset({ x: 0, y: 0 });
          engine.setJoystickInput(0, 0);
        }
        if (t.identifier === lookTouchIdRef.current) {
          lookTouchIdRef.current = null;
          lastLookRef.current = null;
        }
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });
    window.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [engine]);

  if (!active) return null;

  return (
    <div
      id="joystick-base"
      style={{
        position: 'fixed',
        left: `${basePos.x - 60}px`,
        top: `${basePos.y - 60}px`,
        width: '120px',
        height: '120px',
        borderRadius: '50%',
        backgroundColor: 'rgba(20, 20, 22, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        pointerEvents: 'none',
        zIndex: 25,
      }}
    >
      <div
        id="joystick-stick"
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '50px',
          height: '50px',
          borderRadius: '50%',
          backgroundColor: '#007aff',
          boxShadow: '0 4px 16px rgba(0, 122, 255, 0.6)',
          transform: `translate(calc(-50% + ${stickOffset.x}px), calc(-50% + ${stickOffset.y}px))`,
          transition: active ? 'none' : 'transform 0.15s ease-out',
        }}
      />
    </div>
  );
};
