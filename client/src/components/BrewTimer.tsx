import { useState, useEffect } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Droplets, Zap, Leaf } from "lucide-react";
import { useUpdateLog } from "@/hooks/use-logs";
import { type Tea, type TeaLog } from "@shared/schema";

interface BrewTimerProps {
  tea: Tea;
  teaLog?: TeaLog;
  onComplete?: () => void;
  showControls?: boolean;
}

export function BrewTimer({ 
  tea,
  teaLog,
  onComplete,
  showControls = false
}: BrewTimerProps) {
  const personalSettings = teaLog?.timerSettings as any;
  const initialMethod = personalSettings?.method || 'oriental';
  const initialInfusion = teaLog?.currentInfusion || 1;

  const [method, setMethod] = useState<'oriental' | 'occidental'>(initialMethod);
  const [infusion, setInfusion] = useState(initialInfusion);
  const [isActive, setIsActive] = useState(false);
  
  const getInitialSeconds = () => {
    const base = method === 'oriental' ? (tea.orientalDuration || 20) : (tea.occidentalDuration || 180);
    const inc = method === 'oriental' ? (tea.orientalInfusionIncrement || 10) : (tea.occidentalInfusionIncrement || 30);
    return base + (infusion - 1) * inc;
  };

  const getInitialTemp = () => {
    return method === 'oriental' ? (tea.orientalTemp || 95) : (tea.occidentalTemp || 85);
  };

  const [seconds, setSeconds] = useState(getInitialSeconds());
  const [totalSeconds, setTotalSeconds] = useState(getInitialSeconds());
  const [temp, setTemp] = useState(getInitialTemp());
  
  const updateLog = useUpdateLog();

  useEffect(() => {
    const s = getInitialSeconds();
    setSeconds(s);
    setTotalSeconds(s);
    setTemp(getInitialTemp());
  }, [method, infusion, tea]);

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
    updateLog.mutate({
      teaId: tea.id,
      incrementBrew: true,
      currentInfusion: infusion + 1,
      status: 'drinking'
    });
    setInfusion(i => i + 1);
    if (onComplete) onComplete();
  };

  const handleSaveSettings = () => {
    updateLog.mutate({
      teaId: tea.id,
      timerSettings: { temp, method, infusion }
    });
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    const s = getInitialSeconds();
    setSeconds(s);
    setTotalSeconds(s);
  };

  const progress = ((totalSeconds - seconds) / totalSeconds) * 100;

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const secs = time % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="flex flex-col items-center gap-6 p-4 w-full">
      <div className="flex flex-wrap justify-center gap-2 mb-4">
        <Button 
          variant={method === 'oriental' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setMethod('oriental')}
          className="rounded-full gap-2"
        >
          <Zap className="w-4 h-4" /> Oriental
        </Button>
        <Button 
          variant={method === 'occidental' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => setMethod('occidental')}
          className="rounded-full gap-2"
        >
          <Leaf className="w-4 h-4" /> Occidental
        </Button>
      </div>

      <div className="flex items-center gap-8 mb-4">
        <div className="text-center">
          <p className="text-xs uppercase text-muted-foreground font-bold mb-1">Infusion</p>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setInfusion(Math.max(1, infusion - 1))}>-</Button>
            <span className="text-xl font-bold">{infusion}</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setInfusion(infusion + 1)}>+</Button>
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs uppercase text-muted-foreground font-bold mb-1">Temp</p>
          <p className="text-xl font-bold">{temp}°C</p>
        </div>
      </div>

      {tea.washingStep && infusion === 1 && (
        <div className="mb-4 p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center gap-3 text-blue-700 text-sm animate-in fade-in slide-in-from-top-2">
          <Droplets className="w-4 h-4" />
          Recommended wash: {tea.washingDuration || 10} seconds
        </div>
      )}

      <div className="w-64 h-64 relative">
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
          className="rounded-full w-16 h-16 p-0 shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          {isActive ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
        </Button>
        
        <Button
          onClick={resetTimer}
          variant="outline"
          size="icon"
          className="rounded-full w-12 h-12"
        >
          <RotateCcw className="w-5 h-5 text-muted-foreground" />
        </Button>

        {showControls && (
          <Button
            onClick={handleSaveSettings}
            variant="ghost"
            size="sm"
            className="text-xs text-primary"
            disabled={updateLog.isPending}
          >
            Save Preference
          </Button>
        )}
      </div>

      <p className="text-sm text-muted-foreground text-center max-w-xs italic">
        {isActive 
          ? "The essence of the leaves is coming alive..." 
          : "Select your method and infusion to begin."}
      </p>
    </div>
  );
}
