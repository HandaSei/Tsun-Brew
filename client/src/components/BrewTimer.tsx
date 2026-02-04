import { useState, useEffect } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Coffee } from "lucide-react";
import { useUpdateLog } from "@/hooks/use-logs";

interface BrewTimerProps {
  initialSeconds?: number;
  teaId: number;
  onComplete?: () => void;
}

export function BrewTimer({ initialSeconds = 180, teaId, onComplete }: BrewTimerProps) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const updateLog = useUpdateLog();

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((s) => s - 1);
      }, 1000);
    } else if (seconds === 0 && isActive) {
      setIsActive(false);
      handleComplete();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isActive, seconds]);

  const handleComplete = () => {
    // Play sound or notification here
    updateLog.mutate({
      teaId,
      incrementBrew: true,
      status: 'drinking'
    });
    if (onComplete) onComplete();
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setSeconds(initialSeconds);
  };

  const progress = ((initialSeconds - seconds) / initialSeconds) * 100;

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const secs = time % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4">
      <div className="w-48 h-48 relative">
        <CircularProgressbar
          value={progress}
          text={formatTime(seconds)}
          styles={buildStyles({
            textSize: '1.5rem',
            pathColor: 'hsl(var(--primary))',
            textColor: 'hsl(var(--foreground))',
            trailColor: 'hsl(var(--muted))',
            pathTransitionDuration: 0.5,
          })}
        />
      </div>

      <div className="flex items-center gap-4">
        <Button
          onClick={toggleTimer}
          size="lg"
          className="rounded-full w-14 h-14 p-0 shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          {isActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
        </Button>
        
        <Button
          onClick={resetTimer}
          variant="outline"
          size="icon"
          className="rounded-full w-12 h-12"
        >
          <RotateCcw className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>

      <p className="text-sm text-muted-foreground text-center max-w-xs">
        {isActive 
          ? "Relax and watch the leaves unfurl..." 
          : "Ready to brew? Start the timer."}
      </p>
    </div>
  );
}
