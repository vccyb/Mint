'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface VoiceInputOptions {
  /** Called with accumulated transcribed text during/after recording */
  onTranscript: (text: string) => void;
  /** Returns the current base text to append to */
  getBaseText: () => string;
}

export type VoiceState = 'idle' | 'connecting' | 'recording' | 'processing' | 'error';

export function useVoiceInput(options: VoiceInputOptions) {
  const [state, setState] = useState<VoiceState>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [interimText, setInterimText] = useState('');

  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const chunksRef = useRef<Int16Array[]>([]);
  const sessionIdRef = useRef<string | null>(null);
  const sendTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectAbortRef = useRef<AbortController | null>(null);
  const baseTextRef = useRef('');
  const accumulatedTextRef = useRef('');
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const recorderAvailable =
    typeof window !== 'undefined' &&
    typeof navigator?.mediaDevices?.getUserMedia === 'function';

  const cleanup = useCallback(() => {
    if (connectAbortRef.current) {
      connectAbortRef.current.abort();
      connectAbortRef.current = null;
    }
    if (sendTimerRef.current) {
      clearInterval(sendTimerRef.current);
      sendTimerRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    chunksRef.current = [];
  }, []);

  // Convert Int16Array PCM to base64 string
  const pcmToBase64 = useCallback((pcm: Int16Array): string => {
    const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }, []);

  // Combine accumulated Int16Array chunks into one
  const combineChunks = useCallback((): Int16Array | null => {
    const chunks = chunksRef.current;
    if (chunks.length === 0) return null;
    const totalLen = chunks.reduce((s, c) => s + c.length, 0);
    const combined = new Int16Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      combined.set(c, offset);
      offset += c.length;
    }
    chunksRef.current = [];
    return combined;
  }, []);

  // Send accumulated PCM to server and get latest text
  const sendChunk = useCallback(
    async (isLast: boolean) => {
      const pcm = combineChunks();
      const audio = pcm ? pcmToBase64(pcm) : '';

      try {
        const res = await fetch('/api/stt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'chunk',
            sessionId: sessionIdRef.current,
            audio,
            isLast,
          }),
        });
        const data = await res.json();

        if (data.error) {
          if (sendTimerRef.current) {
            clearInterval(sendTimerRef.current);
            sendTimerRef.current = null;
          }
          setVoiceError(data.error);
          setState('error');
          return;
        }

        if (data.text) {
          // Doubao returns the full text so far for this session
          accumulatedTextRef.current = data.text;
          const base = baseTextRef.current;
          const full = base ? base + ' ' + data.text : data.text;
          optionsRef.current.onTranscript(full);
          setInterimText(data.text);
        }
      } catch (err) {
        if (sendTimerRef.current) {
          clearInterval(sendTimerRef.current);
          sendTimerRef.current = null;
        }
        setVoiceError(`发送音频失败: ${(err as Error).message}`);
        setState('error');
      }
    },
    [combineChunks, pcmToBase64],
  );

  const startRecording = useCallback(async () => {
    setVoiceError(null);
    setInterimText('');
    accumulatedTextRef.current = '';
    baseTextRef.current = optionsRef.current.getBaseText();

    try {
      // 1. Connect to STT server
      setState('connecting');
      const abortController = new AbortController();
      connectAbortRef.current = abortController;
      const connectTimeout = setTimeout(() => abortController.abort(), 8000);

      let startData: { sessionId?: string; error?: string };
      try {
        const startRes = await fetch('/api/stt', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' }),
          signal: abortController.signal,
        });
        clearTimeout(connectTimeout);
        connectAbortRef.current = null;
        startData = await startRes.json();
      } catch (err) {
        clearTimeout(connectTimeout);
        connectAbortRef.current = null;
        if ((err as Error).name === 'AbortError') {
          setVoiceError('连接 ASR 服务超时，请检查网络后重试');
        } else {
          setVoiceError(`连接 ASR 服务失败: ${(err as Error).message}`);
        }
        setState('error');
        return;
      }

      if (startData.error) {
        setVoiceError(startData.error);
        setState('error');
        return;
      }

      sessionIdRef.current = startData.sessionId ?? null;

      // 2. Get microphone stream
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });
      streamRef.current = stream;

      // 3. Create AudioContext at 16kHz for PCM capture
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      // ScriptProcessor: bufferSize=4096 → 256ms at 16kHz
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e: AudioProcessingEvent) => {
        const float32 = e.inputBuffer.getChannelData(0);
        const int16 = new Int16Array(float32.length);
        for (let i = 0; i < float32.length; i++) {
          const s = Math.max(-1, Math.min(1, float32[i]));
          int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        chunksRef.current.push(int16);
      };

      source.connect(processor);
      processor.connect(audioCtx.destination);

      setState('recording');

      // 4. Send audio chunks every 300ms
      sendTimerRef.current = setInterval(() => {
        if (chunksRef.current.length > 0) {
          sendChunk(false);
        }
      }, 300);
    } catch (err) {
      cleanup();
      const msg = (err as Error).name === 'NotAllowedError'
        ? '麦克风权限被拒绝，请在浏览器设置中允许麦克风访问'
        : `无法启动录音: ${(err as Error).message}`;
      setVoiceError(msg);
      setState('error');

      // Clean up session if started
      if (sessionIdRef.current) {
        fetch(`/api/stt?sessionId=${sessionIdRef.current}`, { method: 'DELETE' }).catch(() => {});
        sessionIdRef.current = null;
      }
    }
  }, [cleanup, sendChunk]);

  const stopRecording = useCallback(async () => {
    // Stop the timer first
    if (sendTimerRef.current) {
      clearInterval(sendTimerRef.current);
      sendTimerRef.current = null;
    }

    // Send remaining chunks as last packet
    setState('processing');
    setInterimText('正在识别...');

    await sendChunk(true);

    // Clean up audio resources
    cleanup();
    sessionIdRef.current = null;

    setState('idle');
    setInterimText('');
  }, [cleanup, sendChunk]);

  const toggleRecording = useCallback(() => {
    if (state === 'recording') {
      stopRecording();
    } else if (state === 'connecting') {
      // Cancel in-flight connection
      cleanup();
      sessionIdRef.current = null;
      setState('idle');
      setInterimText('');
    } else if (state === 'idle') {
      startRecording();
    }
  }, [state, startRecording, stopRecording, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
      if (sessionIdRef.current) {
        fetch(`/api/stt?sessionId=${sessionIdRef.current}`, { method: 'DELETE' }).catch(() => {});
      }
    };
  }, [cleanup]);

  const isListening = state === 'recording' || state === 'connecting';

  return {
    state,
    isListening,
    isProcessing: state === 'processing',
    voiceError,
    interimText,
    recorderAvailable,
    toggleRecording,
  };
}
