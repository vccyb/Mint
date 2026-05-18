'use client';

import { Mic, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAudioLevel } from './use-audio-level';
import type { VoiceState } from './use-voice-input';

interface VoiceMicButtonProps {
  state: VoiceState;
  disabled?: boolean;
  onClick: () => void;
}

export function VoiceMicButton({
  state,
  disabled,
  onClick,
}: VoiceMicButtonProps) {
  const { audioLevel } = useAudioLevel(state === 'recording');

  if (typeof window === 'undefined') return null;

  const isRecording = state === 'recording';
  const isConnecting = state === 'connecting';
  const isProcessing = state === 'processing';
  const isActive = isRecording || isConnecting;

  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all duration-150 cursor-pointer',
        isRecording
          ? 'text-red-500'
          : isConnecting
            ? 'text-amber-500'
            : isProcessing
              ? 'text-amber-500'
              : 'text-text-tertiary hover:text-text',
      )}
      aria-label={
        isRecording
          ? 'Stop recording'
          : isProcessing
            ? 'Processing...'
            : 'Start voice input'
      }
      disabled={disabled || isConnecting || isProcessing}
    >
      {isConnecting || isProcessing ? (
        <Loader2 className="h-[14px] w-[14px] animate-spin" />
      ) : (
        <Mic className="h-[14px] w-[14px] transition-all duration-200" />
      )}
      {isRecording && (
        <span
          className="absolute inset-[-3px] rounded-xl border-2 border-red-400 pointer-events-none transition-all duration-100"
          style={{
            transform: `scale(${1 + audioLevel * 0.4})`,
            opacity: 0.3 + audioLevel * 0.7,
          }}
        />
      )}
      {isRecording && audioLevel < 0.01 && (
        <span className="absolute inset-[-3px] rounded-xl border-2 border-red-300 pointer-events-none animate-pulse opacity-30" />
      )}
    </button>
  );
}
