import { useState, useEffect, useRef } from "react";

interface CountdownTimerProps {
  totalSeconds?: number;
  initialHours?: number;
  initialMinutes?: number;
  initialSeconds?: number;
  onComplete?: () => void;
  className?: string;
}

export function CountdownTimer({ 
  totalSeconds,
  initialHours = 7, 
  initialMinutes = 10, 
  initialSeconds = 20,
  onComplete,
  className = "" 
}: CountdownTimerProps) {
  // Use totalSeconds if provided, otherwise calculate from hours/minutes/seconds
  const initialTotal = totalSeconds ?? (initialHours * 3600 + initialMinutes * 60 + initialSeconds);
  
  const [timeLeft, setTimeLeft] = useState(initialTotal);
  const timerRef = useRef<number | null>(null);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    // Reset completion flag when timer is restarted
    hasCompletedRef.current = false;
    setTimeLeft(initialTotal);
  }, [initialTotal]);

  useEffect(() => {
    if (timeLeft <= 0) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onComplete?.();
      }
      return;
    }

    // Only create interval if one doesn't exist
    if (!timerRef.current) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          const newTime = Math.max(0, prev - 1);
          if (newTime === 0 && !hasCompletedRef.current) {
            hasCompletedRef.current = true;
            onComplete?.();
          }
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeLeft, onComplete]);

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  const formatTime = (num: number) => num.toString().padStart(2, '0');

  return (
    <div 
      className={`bg-teal-primary text-white py-3 px-6 rounded-lg text-2xl font-bold text-center ${className}`} 
      data-testid="countdown-timer"
    >
      {formatTime(hours)}:{formatTime(minutes)}:{formatTime(seconds)}
    </div>
  );
}