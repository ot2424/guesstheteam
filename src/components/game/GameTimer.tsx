import { useEffect, useState } from 'react';

interface Props {
  startedAt: number;
  active: boolean;
  onTick?: (seconds: number) => void;
}

export function GameTimer({ startedAt, active, onTick }: Props) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      const s = Math.floor((Date.now() - startedAt) / 1000);
      setElapsed(s);
      onTick?.(s);
    }, 1000);
    return () => clearInterval(id);
  }, [active, onTick, startedAt]);

  const mins = Math.floor(elapsed / 60).toString().padStart(2, '0');
  const secs = (elapsed % 60).toString().padStart(2, '0');

  return (
    <span className="bebas text-xl tracking-widest text-gray-300">
      {mins}:{secs}
    </span>
  );
}
