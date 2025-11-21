"use client";

import { type ReactNode, useEffect, useRef } from "react";
import Lenis from "@studio-freight/lenis";

export type LenisScrollState = {
  scroll: number;
  limit: number;
  velocity: number;
  direction: 1 | -1;
  progress: number;
};

type LenisProviderProps = {
  children: ReactNode;
  /** Optional callback that receives throttled Lenis scroll state */
  onScroll?: (state: LenisScrollState) => void;
  /** Additional Lenis constructor options */
  options?: Partial<ConstructorParameters<typeof Lenis>[0]>;
};

export function LenisProvider({ children, onScroll, options }: LenisProviderProps) {
  const frameRef = useRef<number>();
  const scrollCallbackRef = useRef(onScroll);

  useEffect(() => {
    scrollCallbackRef.current = onScroll;
  }, [onScroll]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const lenis = new Lenis({
      duration: 1.15,
      lerp: 0.08,
      smoothWheel: true,
      syncTouch: false,
      ...options,
    });

    const raf = (time: number) => {
      lenis.raf(time);
      frameRef.current = requestAnimationFrame(raf);
    };
    frameRef.current = requestAnimationFrame(raf);

    let ticking = false;
    const handleScroll = (event: LenisScrollState) => {
      if (!scrollCallbackRef.current) return;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        scrollCallbackRef.current?.(event);
        ticking = false;
      });
    };

    if (scrollCallbackRef.current) {
      lenis.on("scroll", handleScroll);
    }

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      if (scrollCallbackRef.current) {
        lenis.off("scroll", handleScroll);
      }
      lenis.destroy();
    };
  }, [options]);

  return <>{children}</>;
}
