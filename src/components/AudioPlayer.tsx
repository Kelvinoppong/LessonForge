"use client";

import { useEffect, useRef, useState } from "react";
import { buttonStyles } from "@/components/ui";

type Props = {
  src?: string;
  /** Fallback text read by the browser's speech synthesis if there's no audio file. */
  fallbackText: string;
  onError?: (detail: string) => void;
  onPlay?: () => void;
};

/**
 * Plays a listening clip, with browser speech synthesis as a fallback.
 *
 * A listening exercise with no audio is not an exercise, so when the hosted clip
 * is missing or fails to load we synthesize locally rather than showing a dead
 * button. Either way the failure is reported, because the guardrail monitor
 * treats audio errors as a signal that the variant is broken.
 */
export function AudioPlayer({ src, fallbackText, onError, onPlay }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [plays, setPlays] = useState(0);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [src]);

  const speakFallback = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      onError?.("No audio source and speech synthesis unavailable");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(fallbackText);
    utterance.lang = "es-ES";
    utterance.rate = 0.9;
    utterance.onstart = () => setPlaying(true);
    utterance.onend = () => setPlaying(false);
    utterance.onerror = () => {
      setPlaying(false);
      onError?.("Speech synthesis failed");
    };

    setUsedFallback(true);
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const play = async () => {
    setPlays((n) => n + 1);
    onPlay?.();

    if (!src) {
      speakFallback();
      return;
    }

    try {
      audioRef.current ??= new Audio(src);
      const audio = audioRef.current;
      audio.onplay = () => setPlaying(true);
      audio.onended = () => setPlaying(false);
      audio.currentTime = 0;
      await audio.play();
    } catch (err) {
      onError?.(`Audio playback failed: ${(err as Error).message}`);
      speakFallback();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={play} className={buttonStyles.primary} aria-live="polite">
        <span aria-hidden className="text-lg leading-none">
          {playing ? "🔊" : "▶"}
        </span>
        {plays === 0 ? "Listen" : "Play again"}
      </button>

      {usedFallback ? (
        <p className="text-xs text-bee-500">
          Using your browser&apos;s voice — hosted audio was unavailable.
        </p>
      ) : null}
    </div>
  );
}
