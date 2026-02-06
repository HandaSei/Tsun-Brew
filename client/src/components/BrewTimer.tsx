import { useState, useEffect } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Droplets, Zap, Leaf, Plus, X } from "lucide-react";
import { useUpdateLog } from "@/hooks/use-logs";
import { type Tea, type TeaLog } from "@shared/schema";
import { Input } from "@/components/ui/input";

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
  
  // Editable fields for personal use
  const [oDuration, setODuration] = useState(personalSettings?.orientalDuration ?? tea.orientalDuration ?? 20);
  const [oIncrement, setOIncrement] = useState(personalSettings?.orientalIncrement ?? tea.orientalInfusionIncrement ?? 10);
  const [occInfusions, setOccInfusions] = useState<number[]>(personalSettings?.occidentalInfusions ?? (tea.occidentalInfusions as number[]) ?? [tea.occidentalDuration ?? 180]);
  const [temp, setTemp] = useState(personalSettings?.temp ?? (method === 'oriental' ? tea.orientalTemp : tea.occidentalTemp) ?? 85);

  const getInitialSeconds = () => {
    if (method === 'oriental') {
      return oDuration + (infusion - 1) * oIncrement;
    } else {
      return occInfusions[Math.min(infusion - 1, occInfusions.length - 1)] || 180;
    }
  };

  const [seconds, setSeconds] = useState(getInitialSeconds());
  const [totalSeconds, setTotalSeconds] = useState(getInitialSeconds());
  
  const updateLog = useUpdateLog();

  useEffect(() => {
    const s = getInitialSeconds();
    setSeconds(s);
    setTotalSeconds(s);
  }, [method, infusion, tea, oDuration, oIncrement, occInfusions]);

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
      timerSettings: { 
        temp, 
        method, 
        infusion,
        orientalDuration: oDuration,
        orientalIncrement: oIncrement,
        occidentalInfusions: occInfusions
      }
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
          onClick={() => { setMethod('oriental'); setTemp(tea.orientalTemp || 95); }}
          className="rounded-full gap-2"
        >
          <Zap className="w-4 h-4" /> Oriental
        </Button>
        <Button 
          variant={method === 'occidental' ? 'default' : 'outline'} 
          size="sm" 
          onClick={() => { setMethod('occidental'); setTemp(tea.occidentalTemp || 85); }}
          className="rounded-full gap-2"
        >
          <Leaf className="w-4 h-4" /> Occidental
        </Button>
      </div>

      {showControls && (
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm p-4 bg-secondary/20 rounded-xl border border-border/50 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Temperature (°C)</label>
            <Input type="number" value={temp} onChange={e => setTemp(parseInt(e.target.value) || 0)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Infusion</label>
            <div className="flex items-center gap-2 h-8">
              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setInfusion(Math.max(1, infusion - 1))}>-</Button>
              <span className="text-xs font-bold">{infusion}</span>
              <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setInfusion(infusion + 1)}>+</Button>
            </div>
          </div>
          
          {method === 'oriental' ? (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Initial (s)</label>
                <Input type="number" value={oDuration} onChange={e => setODuration(parseInt(e.target.value) || 0)} className="h-8 text-xs" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-muted-foreground">Increment (s)</label>
                <Input type="number" value={oIncrement} onChange={e => setOIncrement(parseInt(e.target.value) || 0)} className="h-8 text-xs" />
              </div>
            </>
          ) : (
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Occidental Infusions (s)</label>
              <div className="flex flex-wrap gap-2">
                {occInfusions.map((dur, idx) => (
                  <div key={idx} className="flex items-center gap-1 bg-background rounded border p-1">
                    <Input 
                      type="number" 
                      value={dur} 
                      onChange={e => {
                        const newInfusions = [...occInfusions];
                        newInfusions[idx] = parseInt(e.target.value) || 0;
                        setOccInfusions(newInfusions);
                      }}
                      className="h-6 w-12 text-[10px] border-none p-0 text-center"
                    />
                    <Button variant="ghost" size="icon" className="h-4 w-4" onClick={() => setOccInfusions(occInfusions.filter((_, i) => i !== idx))}>
                      <X className="w-2 h-2" />
                    </Button>
                  </div>
                ))}
                <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => setOccInfusions([...occInfusions, 180])}>
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {method === 'oriental' && tea.washingStep && infusion === 1 && (
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
          : "Ready to brew? Check your settings and begin."}
      </p>
    </div>
  );
}
