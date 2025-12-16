import { useEffect, useRef } from "react";

interface AudioVisualizerProps {
  audioLevel: number;
  isActive: boolean;
  className?: string;
}

export function AudioVisualizer({ audioLevel, isActive, className = "" }: AudioVisualizerProps) {
  const bars = 5;
  
  return (
    <div className={`flex items-end gap-0.5 h-6 ${className}`}>
      {Array.from({ length: bars }).map((_, i) => {
        const threshold = (i + 1) / bars;
        const isLit = isActive && audioLevel >= threshold * 0.8;
        const barHeight = 4 + i * 4;
        
        return (
          <div
            key={i}
            className={`w-1 rounded-full transition-all duration-75 ${
              isLit
                ? i >= bars - 1
                  ? "bg-destructive"
                  : i >= bars - 2
                  ? "bg-yellow-500 dark:bg-yellow-400"
                  : "bg-green-500 dark:bg-green-400"
                : "bg-muted"
            }`}
            style={{ height: `${barHeight}px` }}
          />
        );
      })}
    </div>
  );
}

interface WaveformVisualizerProps {
  audioLevel: number;
  isActive: boolean;
  className?: string;
}

export function WaveformVisualizer({ audioLevel, isActive, className = "" }: WaveformVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const dataRef = useRef<number[]>(Array(50).fill(0));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const { width, height } = canvas;
      
      dataRef.current.shift();
      dataRef.current.push(isActive ? audioLevel + Math.random() * 0.1 : 0);
      
      ctx.clearRect(0, 0, width, height);
      
      const barWidth = width / dataRef.current.length;
      const centerY = height / 2;
      
      ctx.fillStyle = isActive ? "hsl(340, 75%, 55%)" : "hsl(0, 0%, 40%)";
      
      dataRef.current.forEach((level, i) => {
        const barHeight = Math.max(2, level * height * 0.8);
        const x = i * barWidth;
        ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight);
      });
      
      animationRef.current = requestAnimationFrame(draw);
    };
    
    draw();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioLevel, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={40}
      className={`rounded-md bg-background/50 ${className}`}
    />
  );
}

interface LevelMeterProps {
  level: number;
  orientation?: "horizontal" | "vertical";
  className?: string;
}

export function LevelMeter({ level, orientation = "vertical", className = "" }: LevelMeterProps) {
  const segments = 12;
  
  if (orientation === "vertical") {
    return (
      <div className={`flex flex-col-reverse gap-0.5 w-3 ${className}`}>
        {Array.from({ length: segments }).map((_, i) => {
          const threshold = (i + 1) / segments;
          const isLit = level >= threshold * 0.9;
          
          return (
            <div
              key={i}
              className={`h-2 w-full rounded-sm transition-all duration-75 ${
                isLit
                  ? i >= segments - 2
                    ? "bg-destructive"
                    : i >= segments - 4
                    ? "bg-yellow-500 dark:bg-yellow-400"
                    : "bg-green-500 dark:bg-green-400"
                  : "bg-muted"
              }`}
            />
          );
        })}
      </div>
    );
  }
  
  return (
    <div className={`flex gap-0.5 h-3 ${className}`}>
      {Array.from({ length: segments }).map((_, i) => {
        const threshold = (i + 1) / segments;
        const isLit = level >= threshold * 0.9;
        
        return (
          <div
            key={i}
            className={`w-2 h-full rounded-sm transition-all duration-75 ${
              isLit
                ? i >= segments - 2
                  ? "bg-destructive"
                  : i >= segments - 4
                  ? "bg-yellow-500 dark:bg-yellow-400"
                  : "bg-green-500 dark:bg-green-400"
                : "bg-muted"
            }`}
          />
        );
      })}
    </div>
  );
}
