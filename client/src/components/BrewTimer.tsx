import { useState, useEffect } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Droplets, Zap, Leaf, Plus, X } from "lucide-react";
import { useUpdateLog } from "@/hooks/use-logs";
import { useToast } from "@/hooks/use-toast";
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
  const initialInfusion = 1;

  const [method, setMethod] = useState<'oriental' | 'occidental'>(initialMethod);
  const [infusion, setInfusion] = useState(initialInfusion);
  const [isActive, setIsActive] = useState(false);
  
  // Editable fields for personal use
  const [oDuration, setODuration] = useState(personalSettings?.orientalDuration ?? tea.orientalDuration ?? 20);
  const [oIncrement, setOIncrement] = useState(personalSettings?.orientalIncrement ?? tea.orientalInfusionIncrement ?? 10);
  const [occInfusions, setOccInfusions] = useState<number[]>(personalSettings?.occidentalInfusions ?? (tea.occidentalInfusions as number[]) ?? [tea.occidentalDuration ?? 180]);
  const [temp, setTemp] = useState(personalSettings?.temp ?? (method === 'oriental' ? tea.orientalTemp : tea.occidentalTemp) ?? 85);
  const [washingDuration, setWashingDuration] = useState(personalSettings?.washingDuration ?? tea.washingDuration ?? 10);
  const [orientalLeafAmount, setOrientalLeafAmount] = useState(personalSettings?.orientalLeafAmount ?? tea.orientalLeafAmount ?? "");
  const [orientalWaterAmount, setOrientalWaterAmount] = useState(personalSettings?.orientalWaterAmount ?? tea.orientalWaterAmount ?? "");
  const [occidentalLeafAmount, setOccidentalLeafAmount] = useState(personalSettings?.occidentalLeafAmount ?? tea.occidentalLeafAmount ?? "");
  const [occidentalWaterAmount, setOccidentalWaterAmount] = useState(personalSettings?.occidentalWaterAmount ?? tea.occidentalWaterAmount ?? "");

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
  const { toast } = useToast();

  // Update initial settings when teaLog changes (on load/refresh)
  useEffect(() => {
    if (personalSettings) {
      setTemp(personalSettings.temp ?? temp);
      setMethod(personalSettings.method ?? method);
      setODuration(personalSettings.orientalDuration ?? oDuration);
      setOIncrement(personalSettings.orientalIncrement ?? oIncrement);
      setOccInfusions(personalSettings.occidentalInfusions ?? occInfusions);
      setWashingDuration(personalSettings.washingDuration ?? washingDuration);
      setOrientalLeafAmount(personalSettings.orientalLeafAmount ?? orientalLeafAmount);
      setOrientalWaterAmount(personalSettings.orientalWaterAmount ?? orientalWaterAmount);
      setOccidentalLeafAmount(personalSettings.occidentalLeafAmount ?? occidentalLeafAmount);
      setOccidentalWaterAmount(personalSettings.occidentalWaterAmount ?? occidentalWaterAmount);
    }
  }, [teaLog?.timerSettings]);

  useEffect(() => {
    const s = getInitialSeconds();
    setSeconds(s);
    setTotalSeconds(s);
  }, [method, infusion, tea, oDuration, oIncrement, occInfusions]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive && seconds > 0) {
      interval = setInterval(() => {
        setSeconds((s: number) => s - 1);
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
        occidentalInfusions: occInfusions,
        washingDuration: washingDuration,
        orientalLeafAmount: orientalLeafAmount || undefined,
        orientalWaterAmount: orientalWaterAmount || undefined,
        occidentalLeafAmount: occidentalLeafAmount || undefined,
        occidentalWaterAmount: occidentalWaterAmount || undefined,
      },
      status: teaLog?.status || 'want_to_try'
    } as any, {
      onSuccess: () => {
        toast({ title: "Success", description: "Your custom timer has been saved." });
      },
      onError: (err: any) => {
        toast({ title: "Error", description: err.message || "Failed to save timer", variant: "destructive" });
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
            <Input type="number" value={temp} onChange={e => setTemp(parseInt(e.target.value) || 0)} className="h-8 text-xs" data-testid="input-timer-temp" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Type</label>
            <div className="h-8 flex items-center px-2 bg-background/50 rounded border border-border/50 text-[10px] text-foreground truncate uppercase font-bold tracking-tight">
              {tea.type}
            </div>
          </div>
          {tea.origin && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Origin</label>
              <div className="h-8 flex items-center px-2 bg-background/50 rounded border border-border/50 text-[10px] text-foreground truncate">
                {tea.origin}
              </div>
            </div>
          )}
          {tea.cultivar && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Cultivar</label>
              <div className="h-8 flex items-center px-2 bg-background/50 rounded border border-border/50 text-[10px] text-foreground truncate">
                {tea.cultivar}
              </div>
            </div>
          )}
          <div className="space-y-2 flex flex-col items-center justify-center col-span-2 mt-2">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Infusion</label>
            <div className="flex items-center gap-4 h-10">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 rounded-full border-2 hover:bg-primary/10 active:scale-95 transition-transform" 
                onClick={() => setInfusion(Math.max(1, infusion - 1))}
              >
                <span className="text-xl font-bold">-</span>
              </Button>
              <div className="flex flex-col items-center min-w-[3rem]">
                <span className="text-3xl font-display font-black text-primary leading-none">{infusion}</span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
                  {infusion === 1 ? '1st' : infusion === 2 ? '2nd' : infusion === 3 ? '3rd' : `${infusion}th`}
                </span>
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 rounded-full border-2 hover:bg-primary/10 active:scale-95 transition-transform" 
                onClick={() => setInfusion(infusion + 1)}
              >
                <span className="text-xl font-bold">+</span>
              </Button>
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
                {occInfusions.map((dur, idx) => {
                  const label = idx === 0 ? "1st" : idx === 1 ? "2nd" : idx === 2 ? "3rd" : `${idx + 1}th`;
                  return (
                    <div key={idx} className="flex flex-col gap-1">
                      <span className="text-[8px] text-muted-foreground font-bold text-center">{label}</span>
                      <div className="flex items-center gap-1 bg-background rounded border p-1">
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
                    </div>
                  );
                })}
                <div className="flex flex-col gap-1">
                  <span className="text-[8px] invisible">add</span>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setOccInfusions([...occInfusions, 180])}>
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="col-span-2 grid grid-cols-2 gap-4 pt-2 border-t border-border/30">
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Leaf Amount</label>
              <Input 
                value={method === 'oriental' ? orientalLeafAmount : occidentalLeafAmount} 
                onChange={e => method === 'oriental' ? setOrientalLeafAmount(e.target.value) : setOccidentalLeafAmount(e.target.value)} 
                placeholder={method === 'oriental' ? (tea.orientalLeafAmount || "e.g. 5g") : (tea.occidentalLeafAmount || "e.g. 3g")} 
                className="h-8 text-xs" 
                data-testid="input-timer-leaf" 
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Water Amount</label>
              <Input 
                value={method === 'oriental' ? orientalWaterAmount : occidentalWaterAmount} 
                onChange={e => method === 'oriental' ? setOrientalWaterAmount(e.target.value) : setOccidentalWaterAmount(e.target.value)} 
                placeholder={method === 'oriental' ? (tea.orientalWaterAmount || "e.g. 100ml") : (tea.occidentalWaterAmount || "e.g. 250ml")} 
                className="h-8 text-xs" 
                data-testid="input-timer-water" 
              />
            </div>
          </div>
        </div>
      )}

      {method === 'oriental' && tea.washingStep && infusion === 1 && (
        <div className="mb-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3 text-blue-700 text-sm font-medium">
            <Droplets className="w-4 h-4" />
            Recommended wash: {washingDuration} seconds
          </div>
          {showControls && (
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-bold uppercase text-blue-600/70">Edit Wash (s)</label>
              <Input 
                type="number" 
                value={washingDuration} 
                onChange={e => setWashingDuration(parseInt(e.target.value) || 0)} 
                className="h-7 w-16 text-xs bg-white/50 border-blue-200"
              />
            </div>
          )}
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

      <p className="text-sm text-muted-foreground text-center max-w-xs italic mb-2">
        {isActive 
          ? "The essence of the leaves is coming alive..." 
          : "Ready to brew? Check your settings and begin."}
      </p>

      <div className="w-full max-w-sm mt-4 p-5 bg-secondary/10 rounded-2xl border border-border/50 space-y-4 animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Settings className="w-3.5 h-3.5" />
            {method === 'oriental' ? 'Oriental (Gongfu)' : 'Occidental (Western)'} Parameters
          </h4>
          <Badge variant="outline" className="text-[10px] h-5 bg-background/50 border-primary/20 text-primary">
            Recommended
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Temperature</p>
            <p className="font-medium flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-orange-500" />
              {method === 'oriental' ? tea.orientalTemp : tea.occidentalTemp}°C
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Initial Duration</p>
            <p className="font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              {method === 'oriental' ? tea.orientalDuration : tea.occidentalDuration}s
            </p>
          </div>
          
          {method === 'oriental' ? (
            <>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Increment</p>
                <p className="font-medium flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-green-500" />
                  +{tea.orientalInfusionIncrement}s
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Max Infusions</p>
                <p className="font-medium flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-500" />
                  {tea.orientalMaxInfusions}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Max Infusions</p>
                <p className="font-medium flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-500" />
                  {tea.occidentalMaxInfusions}
                </p>
              </div>
              <div className="space-y-1" /> {/* Spacer */}
            </>
          )}

          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Leaf Amount</p>
            <p className="font-medium flex items-center gap-1.5">
              <Leaf className="w-3.5 h-3.5 text-emerald-600" />
              {method === 'oriental' ? tea.orientalLeafAmount : tea.occidentalLeafAmount || "Standard"}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Water Amount</p>
            <p className="font-medium flex items-center gap-1.5">
              <Droplets className="w-3.5 h-3.5 text-cyan-600" />
              {method === 'oriental' ? tea.orientalWaterAmount : tea.occidentalWaterAmount || "Standard"}
            </p>
          </div>
        </div>

        {method === 'oriental' && tea.washingStep && (
          <div className="pt-3 border-t border-border/30">
            <div className="p-3 bg-blue-50/50 border border-blue-100/50 rounded-xl flex items-center gap-3 text-blue-700 text-xs font-medium">
              <Droplets className="w-3.5 h-3.5" />
              Recommended wash: {tea.washingDuration || 10} seconds
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
