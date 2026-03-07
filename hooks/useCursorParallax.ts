"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CursorParallaxOptions = {
  paused: boolean;
  reducedMotion: boolean;
  maxOffsetPx?: number;
  lerpFactor?: number;
};

type CursorParallaxResult = {
  enabled: boolean;
  getOffset: (strength: number) => { x: number; y: number };
};

export function useCursorParallax({
  paused,
  reducedMotion,
  maxOffsetPx = 10,
  lerpFactor = 0.12
}: CursorParallaxOptions): CursorParallaxResult {
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });
  const pausedRef = useRef(paused);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    pausedRef.current = paused;
    if (paused) {
      targetRef.current = { x: 0, y: 0 };
    }
  }, [paused]);

  useEffect(() => {
    const coarsePointer =
      typeof window !== "undefined" &&
      (window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window);

    if (reducedMotion || coarsePointer) {
      setEnabled(false);
      setOffset({ x: 0, y: 0 });
      targetRef.current = { x: 0, y: 0 };
      currentRef.current = { x: 0, y: 0 };
      return;
    }

    setEnabled(true);

    const onMouseMove = (event: MouseEvent) => {
      if (pausedRef.current) {
        targetRef.current = { x: 0, y: 0 };
        return;
      }

      const xNorm = (event.clientX / window.innerWidth - 0.5) * 2;
      const yNorm = (event.clientY / window.innerHeight - 0.5) * 2;

      targetRef.current = {
        x: xNorm * maxOffsetPx,
        y: yNorm * maxOffsetPx
      };
    };

    let rafId = 0;

    const tick = () => {
      const desiredX = pausedRef.current ? 0 : targetRef.current.x;
      const desiredY = pausedRef.current ? 0 : targetRef.current.y;

      currentRef.current.x += (desiredX - currentRef.current.x) * lerpFactor;
      currentRef.current.y += (desiredY - currentRef.current.y) * lerpFactor;

      setOffset({ x: currentRef.current.x, y: currentRef.current.y });
      rafId = window.requestAnimationFrame(tick);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.cancelAnimationFrame(rafId);
    };
  }, [lerpFactor, maxOffsetPx, reducedMotion]);

  return useMemo(
    () => ({
      enabled,
      getOffset: (strength: number) => ({
        x: enabled ? offset.x * strength : 0,
        y: enabled ? offset.y * strength : 0
      })
    }),
    [enabled, offset.x, offset.y]
  );
}
