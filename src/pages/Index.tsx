import { useEffect, useRef } from 'react';
import { SamsungSlashGame } from '@/game/SamsungSlashGame';

const Index = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<SamsungSlashGame | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const game = new SamsungSlashGame(canvasRef.current);
    gameRef.current = game;

    const onResize = () => game.resize();
    window.addEventListener('resize', onResize);

    return () => {
      game.destroy();
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100vw',
        height: '100vh',
        display: 'block',
        touchAction: 'none',
        cursor: 'crosshair',
      }}
    />
  );
};

export default Index;
