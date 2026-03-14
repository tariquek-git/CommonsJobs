import { useState, useEffect } from 'react';

export function useCountUp(target: number, duration = 600, active = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active || target === 0) { setCount(target); return; }

    let start = 0;
    const startTime = performance.now();

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);

      setCount(current);
      if (progress < 1) start = requestAnimationFrame(tick);
    };

    start = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(start);
  }, [target, duration, active]);

  return count;
}
