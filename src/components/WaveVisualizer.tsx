import React, { useEffect, useRef } from 'react';

interface WaveVisualizerProps {
  status: 'ACTIVA' | 'DEGRADADA' | 'SIN LÍNEA DE VISTA';
  signalPercent: number;
}

export const WaveVisualizer: React.FC<WaveVisualizerProps> = ({ status, signalPercent }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let phase = 0;

    const render = () => {
      animId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const midY = height / 2;

      if (status === 'SIN LÍNEA DE VISTA') {
        // Flat obstructed line with dashed red marker
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(0, midY);
        ctx.lineTo(width, midY);
        ctx.stroke();
        ctx.setLineDash([]);
        return;
      }

      phase += status === 'ACTIVA' ? 0.08 : 0.04;

      // Draw primary carrier sine wave
      const amplitude = status === 'ACTIVA' ? (height * 0.32 * (signalPercent / 100)) : height * 0.15;
      const frequency = status === 'ACTIVA' ? 0.04 : 0.025;

      // Glow effect
      ctx.shadowBlur = status === 'ACTIVA' ? 10 : 4;
      ctx.shadowColor = status === 'ACTIVA' ? '#38bdf8' : '#f59e0b';

      ctx.strokeStyle = status === 'ACTIVA' ? '#38bdf8' : '#f59e0b';
      ctx.lineWidth = 2.2;
      ctx.beginPath();

      for (let x = 0; x < width; x++) {
        // Base sine wave plus high-frequency digital telemetry modulation
        const modulation = Math.sin(x * 0.2 + phase * 2) * (amplitude * 0.2);
        const y = midY + Math.sin(x * frequency + phase) * amplitude + modulation;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      // Second harmonic sub-carrier wave
      ctx.shadowBlur = 0;
      ctx.strokeStyle = status === 'ACTIVA' ? 'rgba(168, 85, 247, 0.45)' : 'rgba(245, 158, 11, 0.3)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const y = midY + Math.cos(x * (frequency * 1.5) - phase) * (amplitude * 0.55);
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [status, signalPercent]);

  return (
    <div className="w-full h-14 bg-slate-950/70 border border-white/5 rounded-xl overflow-hidden relative flex items-center justify-center">
      <canvas ref={canvasRef} width={260} height={56} className="w-full h-full block" />
      {status === 'SIN LÍNEA DE VISTA' && (
        <span className="absolute text-[10px] uppercase font-bold tracking-wider text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/40">
          Enlace Ocluido por Topografía
        </span>
      )}
    </div>
  );
};
