import { useEffect, useState } from 'react';

interface Countdown {
  minutes: number;
  seconds: number;
  formatted: string; // e.g., "4m 52s"
  nextBoundary: Date; // Exact Date of the next interval mark
}

/**
 * React hook that counts down to the next N-minute boundary.
 * 
 * @param intervalMinutes The interval in minutes (e.g., 1, 5, 15, 30, 60)
 * @returns Countdown info + next boundary time
 */
const useNextInterval = (intervalMinutes: number = 15): Countdown => {
  if (intervalMinutes <= 0) {
    throw new Error('intervalMinutes must be greater than 0');
  }

  const calculateNextBoundary = (now: Date): Date => {
    const next = new Date(now);

    const minutes = next.getMinutes();
    const remainder = minutes % intervalMinutes;

    if (remainder === 0) {
      // Exactly on a boundary → go to next one
      next.setMinutes(minutes + intervalMinutes);
    } else {
      // Round up to next boundary
      next.setMinutes(minutes + (intervalMinutes - remainder));
    }

    // Reset seconds and milliseconds
    next.setSeconds(0);
    next.setMilliseconds(0);

    return next;
  };

  const [nextBoundary, setNextBoundary] = useState<Date>(() =>
    calculateNextBoundary(new Date())
  );

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const next = calculateNextBoundary(now);

      if (next.getTime() !== nextBoundary.getTime()) {
        setNextBoundary(next);
      }
    };

    update(); // Initial sync

    const interval = setInterval(update, 1000);

    return () => clearInterval(interval);
  }, [intervalMinutes, nextBoundary]);

  const now = new Date();
  const diffMs = Math.max(0, nextBoundary.getTime() - now.getTime());

  const totalMinutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);

  const formatted = `${totalMinutes}m ${seconds.toString().padStart(2, '0')}s`;

  return {
    minutes: totalMinutes,
    seconds,
    formatted,
    nextBoundary,
  };
}

export default useNextInterval