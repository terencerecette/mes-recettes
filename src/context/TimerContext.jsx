import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { playTimerChime, unlockAudio } from '../utils/sound.js';

const TimerContext = createContext(null);

export function TimerProvider({ children }) {
  const [initialSeconds, setInitialSeconds] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [label, setLabel] = useState('Minuteur');
  const [isOpen, setIsOpen] = useState(false);

  const endTimeRef = useRef(null);
  const chimePlayedRef = useRef(false);

  useEffect(() => {
    if (!isRunning) return undefined;

    const tick = () => {
      if (!endTimeRef.current) return;
      const diffMs = endTimeRef.current - Date.now();
      const nextSeconds = Math.max(0, Math.ceil(diffMs / 1000));
      setRemainingSeconds(nextSeconds);

      if (diffMs <= 0) {
        setIsRunning(false);
        setIsFinished(true);
        setIsOpen(true);
        endTimeRef.current = null;
        if (!chimePlayedRef.current) {
          chimePlayedRef.current = true;
          playTimerChime();
        }
      }
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [isRunning]);

  const startTimer = useCallback((seconds, timerLabel = 'Minuteur') => {
    const cleanSeconds = Math.max(1, Math.round(Number(seconds) || 0));
    unlockAudio();
    chimePlayedRef.current = false;
    setInitialSeconds(cleanSeconds);
    setRemainingSeconds(cleanSeconds);
    setLabel(timerLabel || 'Minuteur');
    setIsFinished(false);
    endTimeRef.current = Date.now() + cleanSeconds * 1000;
    setIsRunning(true);
    setIsOpen(true);
  }, []);

  const togglePause = useCallback(() => {
    unlockAudio();
    if (isFinished) return;
    if (isRunning) {
      if (endTimeRef.current) {
        const left = Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000));
        setRemainingSeconds(left);
      }
      endTimeRef.current = null;
      setIsRunning(false);
    } else if (remainingSeconds > 0) {
      chimePlayedRef.current = false;
      endTimeRef.current = Date.now() + remainingSeconds * 1000;
      setIsRunning(true);
    }
  }, [isFinished, isRunning, remainingSeconds]);

  const addMinute = useCallback(() => {
    unlockAudio();
    if (isFinished) {
      chimePlayedRef.current = false;
      setIsFinished(false);
      setInitialSeconds(60);
      setRemainingSeconds(60);
      endTimeRef.current = Date.now() + 60 * 1000;
      setIsRunning(true);
      return;
    }

    const base = isRunning && endTimeRef.current
      ? Math.max(0, Math.ceil((endTimeRef.current - Date.now()) / 1000))
      : remainingSeconds;
    const next = base + 60;
    setInitialSeconds((prev) => Math.max(prev, next));
    setRemainingSeconds(next);
    if (isRunning) {
      endTimeRef.current = Date.now() + next * 1000;
    }
  }, [isFinished, isRunning, remainingSeconds]);

  const resetTimer = useCallback(() => {
    chimePlayedRef.current = false;
    endTimeRef.current = null;
    setIsRunning(false);
    setIsFinished(false);
    setRemainingSeconds(initialSeconds);
  }, [initialSeconds]);

  const clearTimer = useCallback(() => {
    chimePlayedRef.current = false;
    endTimeRef.current = null;
    setIsRunning(false);
    setIsFinished(false);
    setInitialSeconds(0);
    setRemainingSeconds(0);
    setLabel('Minuteur');
    setIsOpen(false);
  }, []);

  const dismissFinished = useCallback(() => {
    setIsFinished(false);
  }, []);

  const hasTimer = initialSeconds > 0 || remainingSeconds > 0 || isFinished;

  return (
    <TimerContext.Provider
      value={{
        initialSeconds,
        remainingSeconds,
        isRunning,
        isFinished,
        label,
        isOpen,
        hasTimer,
        setOpen: setIsOpen,
        startTimer,
        togglePause,
        addMinute,
        resetTimer,
        clearTimer,
        dismissFinished,
      }}
    >
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) {
    throw new Error('useTimer doit être utilisé dans un TimerProvider');
  }
  return ctx;
}
