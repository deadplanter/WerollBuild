import { useState, useEffect, useRef, useCallback } from 'react';
import { PresenceStatus } from '../types/dnd';

export function useUserActivity() {
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>('active');
  const [idleSeconds, setIdleSeconds] = useState<number>(0);
  const lastActiveRef = useRef<number>(Date.now());

  const resetActivity = useCallback(() => {
    lastActiveRef.current = Date.now();
    setIdleSeconds(0);
    setPresenceStatus('active');
  }, []);

  useEffect(() => {
    const handleUserInteraction = () => {
      lastActiveRef.current = Date.now();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setPresenceStatus('afk');
      } else {
        lastActiveRef.current = Date.now();
        setPresenceStatus('active');
      }
    };

    window.addEventListener('mousemove', handleUserInteraction, { passive: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true });
    window.addEventListener('click', handleUserInteraction, { passive: true });
    window.addEventListener('touchstart', handleUserInteraction, { passive: true });
    window.addEventListener('scroll', handleUserInteraction, { passive: true });
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const interval = setInterval(() => {
      if (document.hidden) {
        setPresenceStatus('afk');
        setIdleSeconds((prev) => prev + 1);
        return;
      }

      const elapsedSec = Math.floor((Date.now() - lastActiveRef.current) / 1000);
      setIdleSeconds(elapsedSec);

      if (elapsedSec <= 60) {
        setPresenceStatus('active');
      } else if (elapsedSec <= 180) {
        setPresenceStatus('idle');
      } else if (elapsedSec <= 600) {
        setPresenceStatus('thinking');
      } else {
        setPresenceStatus('afk');
      }
    }, 1000);

    return () => {
      window.removeEventListener('mousemove', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('touchstart', handleUserInteraction);
      window.removeEventListener('scroll', handleUserInteraction);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(interval);
    };
  }, []);

  return { presenceStatus, idleSeconds, resetActivity };
}
