'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Provides real-time audio volume level (0-1) from the microphone.
 * Gracefully degrades to always returning 0 if getUserMedia fails.
 */
export function useAudioLevel(active: boolean): { audioLevel: number } {
  const [audioLevel, setAudioLevel] = useState(0);
  const rafRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const levelRef = useRef(0);

  const cleanup = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    levelRef.current = 0;
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    if (!active) {
      cleanup();
      return;
    }

    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;

        const ctx = new AudioContext();
        audioCtxRef.current = ctx;

        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.fftSize);

        function tick() {
          if (cancelled) return;
          analyser.getByteTimeDomainData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const v = (dataArray[i] - 128) / 128;
            sum += v * v;
          }
          const rms = Math.sqrt(sum / dataArray.length);
          // Smooth with exponential moving average
          levelRef.current = levelRef.current * 0.7 + rms * 0.3;
          setAudioLevel(levelRef.current);
          rafRef.current = requestAnimationFrame(tick);
        }

        tick();
      } catch {
        // getUserMedia denied or unavailable — audioLevel stays 0
      }
    }

    start();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [active, cleanup]);

  return { audioLevel };
}
