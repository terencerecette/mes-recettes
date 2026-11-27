import { useEffect, useRef, useState } from 'react';

export function useWakeLock(active) {
  const isSupported =
    typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  const [isActive, setIsActive] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!isSupported || !active) {
      if (sentinelRef.current) {
        sentinelRef.current.release().catch(() => {});
        sentinelRef.current = null;
      }
      setIsActive(false);
      return;
    }

    let cancelled = false;

    async function acquire() {
      try {
        if (document.visibilityState !== 'visible') return;
        const sentinel = await navigator.wakeLock.request('screen');
        if (cancelled) {
          sentinel.release().catch(() => {});
          return;
        }
        sentinelRef.current = sentinel;
        setIsActive(true);
        sentinel.addEventListener('release', () => {
          if (!cancelled) {
            setIsActive(false);
          }
        });
      } catch {
        if (!cancelled) {
          setIsActive(false);
        }
      }
    }

    acquire();

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && active && !cancelled) {
        acquire();
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (sentinelRef.current) {
        sentinelRef.current.release().catch(() => {});
        sentinelRef.current = null;
      }
      setIsActive(false);
    };
  }, [active, isSupported]);

  return { isSupported, isActive };
}
