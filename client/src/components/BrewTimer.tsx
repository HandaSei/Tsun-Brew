import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Droplets, Zap, Leaf, Plus, X, BellOff, Clock } from "lucide-react";
import { useUpdateLog } from "@/hooks/use-logs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { type Tea, type TeaLog } from "@shared/schema";
import { Input } from "@/components/ui/input";

const ALARM_SOUND_URL = "https://res.cloudinary.com/dq9nrlsb9/video/upload/v1771025474/zapsplat_multimedia_ui_processing_or_timer_tone_musical_warm_mallets_85166_an2opt.mp3";

export interface BrewTimerHandle {
  resetToRecommended: () => void;
}

interface BrewTimerProps {
  tea: Tea;
  teaLog?: TeaLog;
  onComplete?: () => void;
  showControls?: boolean;
}

export const BrewTimer = forwardRef<BrewTimerHandle, BrewTimerProps>(function BrewTimer({ 
  tea,
  teaLog,
  onComplete,
  showControls = false
}, ref) {
  const personalSettings = teaLog?.timerSettings as any;
  const orientalEnabled = tea.orientalTimerEnabled !== false;
  const occidentalEnabled = tea.occidentalTimerEnabled !== false;
  const savedMethod = personalSettings?.method;
  const initialMethod = (() => {
    if (savedMethod === 'oriental' && orientalEnabled) return 'oriental';
    if (savedMethod === 'occidental' && occidentalEnabled) return 'occidental';
    if (orientalEnabled) return 'oriental';
    if (occidentalEnabled) return 'occidental';
    return 'oriental';
  })();
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
  const [alarmActive, setAlarmActive] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  const updateLog = useUpdateLog();
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const audio = new Audio(ALARM_SOUND_URL);
    audio.loop = true;
    audio.preload = "auto";
    audioRef.current = audio;
    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  const requestNotificationPermission = useCallback(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then((perm) => {
        console.log("Notification permission:", perm);
      }).catch((err) => console.log("Permission request error:", err));
    }
  }, []);

  const stopAlarm = useCallback(() => {
    setAlarmActive(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data && event.data.type === "STOP_ALARM") {
        stopAlarm();
      }
    };
    navigator.serviceWorker?.addEventListener("message", handler);
    return () => {
      navigator.serviceWorker?.removeEventListener("message", handler);
    };
  }, [stopAlarm]);

  const triggerAlarm = useCallback(() => {
    setAlarmActive(true);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((err) => {
        console.error("Audio play failed:", err);
        // Fallback for browsers that require interaction
        toast({
          title: "Timer Done!",
          description: "Click here to stop the alarm.",
          action: <Button variant="outline" size="sm" onClick={() => {
            if (audioRef.current) {
              audioRef.current.play().catch(e => console.error("Manual play failed:", e));
              setAlarmActive(true);
            }
          }}>Start Audio</Button>
        });
      });
    }

    // Keep the tab active
    try {
      window.focus();
    } catch (e) {
      console.error("Focus failed:", e);
    }

    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const notif = new Notification("Tsun Brew - Timer Done", {
          body: `Your ${tea.name} brew is ready!`,
          icon: "/icon-192.png",
          tag: "brew-timer",
          requireInteraction: true,
          silent: false,
        });
        notif.onclick = () => {
          window.focus();
          stopAlarm();
          notif.close();
        };
      } catch (directErr) {
        console.log("Direct notification failed, trying service worker:", directErr);
        if ("serviceWorker" in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification("Tsun Brew - Timer Done", {
              body: `Your ${tea.name} brew is ready!`,
              icon: "/icon-192.png",
              badge: "/icon-192.png",
              requireInteraction: true,
              tag: "brew-timer",
            });
          }).catch((swErr) => console.log("SW notification failed:", swErr));
        }
      }
    } else {
      console.log("Notification status:", "Notification" in window ? Notification.permission : "not supported");
    }
  }, [tea.name, toast]);

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
    triggerAlarm();
    if (user) {
      // Use a longer delay for the mutation to allow the user to see the zero
      // and prevent immediate unmount/re-render while the alarm starts
      setTimeout(() => {
        updateLog.mutate({
          teaId: tea.id,
          incrementBrew: true,
          currentInfusion: infusion + 1,
          status: 'drinking'
        });
      }, 2000);
    }
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

  const toggleTimer = () => {
    if (alarmActive) stopAlarm();
    if (!isActive) {
      requestNotificationPermission();
      // Resume audio context or play silent sound to unlock audio
      if (audioRef.current) {
        // Playing and immediately pausing to "unlock" the audio element for later
        audioRef.current.play().then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
        }).catch((e) => console.log("Audio unlock failed:", e));
      }
    }
    setIsActive(!isActive);
  };
  
  const resetTimer = () => {
    if (alarmActive) stopAlarm();
    setIsActive(false);
    const s = getInitialSeconds();
    setSeconds(s);
    setTotalSeconds(s);
  };

  const resetToRecommended = useCallback(() => {
    const newODuration = tea.orientalDuration ?? 20;
    const newOIncrement = tea.orientalInfusionIncrement ?? 10;
    const newOccInfusions = (tea.occidentalInfusions as number[]) ?? [tea.occidentalDuration ?? 180];
    setODuration(newODuration);
    setOIncrement(newOIncrement);
    setOccInfusions(newOccInfusions);
    setTemp(method === 'oriental' ? (tea.orientalTemp ?? 85) : (tea.occidentalTemp ?? 85));
    setWashingDuration(tea.washingDuration ?? 10);
    setOrientalLeafAmount(tea.orientalLeafAmount ?? "");
    setOrientalWaterAmount(tea.orientalWaterAmount ?? "");
    setOccidentalLeafAmount(tea.occidentalLeafAmount ?? "");
    setOccidentalWaterAmount(tea.occidentalWaterAmount ?? "");
    setInfusion(1);
    setIsActive(false);
    const newSeconds = method === 'oriental'
      ? newODuration
      : (newOccInfusions[0] || 180);
    setSeconds(newSeconds);
    setTotalSeconds(newSeconds);
    toast({ title: "Reset", description: "Timer settings restored to recommended values." });
  }, [tea, method, toast]);

  useImperativeHandle(ref, () => ({
    resetToRecommended,
  }), [resetToRecommended]);

  const progress = (seconds / totalSeconds) * 100;

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const secs = time % 60;
    return `${minutes}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (!orientalEnabled && !occidentalEnabled) {
    return (
      <div className="flex flex-col items-center gap-4 p-6 w-full text-center">
        <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
          <Clock className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">No brewing methods are enabled for this tea.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 p-0 w-full min-h-[70vh] md:min-h-0 justify-center">
      <div className="flex flex-wrap justify-center gap-2 mb-1">
        {orientalEnabled && (
          <Button 
            variant={method === 'oriental' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => { setMethod('oriental'); setTemp(personalSettings?.temp ?? tea.orientalTemp ?? 85); }}
            className="rounded-full gap-2"
          >
            <Zap className="w-4 h-4" /> Oriental
          </Button>
        )}
        {occidentalEnabled && (
          <Button 
            variant={method === 'occidental' ? 'default' : 'outline'} 
            size="sm" 
            onClick={() => { setMethod('occidental'); setTemp(personalSettings?.temp ?? tea.occidentalTemp ?? 85); }}
            className="rounded-full gap-2"
          >
            <Leaf className="w-4 h-4" /> Occidental
          </Button>
        )}
      </div>

      {showControls && (
        <div className="grid grid-cols-2 gap-2 w-full max-w-[325px] p-2 bg-secondary/20 rounded-xl border border-border/50 animate-in fade-in slide-in-from-top-2">
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Temperature (°C)</label>
            <Input type="number" value={temp} onChange={e => setTemp(parseInt(e.target.value) || 0)} className="h-8 text-xs" data-testid="input-timer-temp" />
          </div>
          <div className="space-y-1 flex flex-col items-center justify-center">
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Infusion</label>
            <div className="flex items-center gap-1.5 h-10">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-10 w-10 rounded-full border-2 hover:bg-primary/10 active:scale-95 transition-transform" 
                onClick={() => setInfusion(Math.max(1, infusion - 1))}
              >
                <span className="text-xl font-bold">-</span>
              </Button>
              <div className="flex flex-col items-center min-w-[2.5rem]">
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
        <div className="mb-0 p-2 bg-[hsl(var(--wash-bg))] border border-[hsl(var(--wash-border))] rounded-md flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2 w-full max-w-[325px]">
          <div className="flex items-center gap-2 text-[hsl(var(--wash-text))] text-sm font-medium">
            <Droplets className="w-4 h-4" />
            Wash: {washingDuration}s
          </div>
          {showControls && (
            <div className="flex items-center gap-3">
              <label className="text-[10px] font-bold uppercase text-[hsl(var(--wash-text)/0.7)]">Edit (s)</label>
              <Input 
                type="number" 
                value={washingDuration} 
                onChange={e => setWashingDuration(parseInt(e.target.value) || 0)} 
                className="h-8 w-16 text-xs bg-background/50 border-[hsl(var(--wash-border))]"
              />
            </div>
          )}
        </div>
      )}

      <div className="w-56 h-56 sm:w-64 sm:h-64 md:w-56 md:h-56 relative my-0 transition-all duration-300">
        <CircularProgressbar
          value={progress}
          text={formatTime(seconds)}
          styles={buildStyles({
            textSize: '1.25rem',
            pathColor: 'hsl(var(--primary))',
            textColor: 'hsl(var(--foreground))',
            trailColor: 'hsl(var(--muted))',
            pathTransitionDuration: 0.5,
          })}
        />
      </div>

      <div className="flex items-center gap-6 sm:gap-8 mt-4 md:mt-0">
        {alarmActive ? (
          <Button
            onClick={stopAlarm}
            size="lg"
            variant="destructive"
            className="rounded-full px-8 h-16 shadow-xl animate-pulse gap-3 text-lg font-bold"
            data-testid="button-stop-alarm"
          >
            <BellOff className="w-8 h-8" />
            Stop Alarm
          </Button>
        ) : (
          <>
            <Button
              onClick={toggleTimer}
              size="lg"
              className="rounded-full w-20 h-20 sm:w-24 sm:h-24 p-0 shadow-xl hover:shadow-2xl transition-all active:scale-95"
              data-testid="button-toggle-timer"
            >
              {isActive ? <Pause className="w-10 h-10 sm:w-12 sm:h-12" /> : <Play className="w-10 h-10 sm:w-12 sm:h-12 ml-1" />}
            </Button>
            
            <Button
              onClick={resetTimer}
              variant="outline"
              size="icon"
              className="rounded-full w-14 h-14 sm:w-16 sm:h-16 border-2"
              data-testid="button-reset-timer"
            >
              <RotateCcw className="w-6 h-6 sm:w-7 sm:h-7 text-muted-foreground" />
            </Button>

            {showControls && (
              <Button
                onClick={handleSaveSettings}
                variant="ghost"
                size="sm"
                className="text-xs text-primary h-10 px-3"
                disabled={updateLog.isPending}
                data-testid="button-save-timer-settings"
              >
                Save Preference
              </Button>
            )}
          </>
        )}
      </div>

      {(() => {
        const currentLeaf = method === 'oriental' ? (orientalLeafAmount || tea.orientalLeafAmount) : (occidentalLeafAmount || tea.occidentalLeafAmount);
        const currentWater = method === 'oriental' ? (orientalWaterAmount || tea.orientalWaterAmount) : (occidentalWaterAmount || tea.occidentalWaterAmount);
        return (currentLeaf || currentWater) && !showControls ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Leaf className="w-3.5 h-3.5" />
            {currentLeaf && currentWater
              ? <span>{currentLeaf} of leaves for {currentWater} of water</span>
              : currentLeaf
                ? <span>{currentLeaf}</span>
                : <span>{currentWater}</span>
            }
          </div>
        ) : null;
      })()}

      <p className="text-sm text-muted-foreground text-center max-w-xs italic empty:hidden">
        {alarmActive
          ? "Your brew is ready! Tap stop to silence the alarm."
          : isActive 
            ? "The essence of the leaves is coming alive..." 
            : ""}
      </p>
    </div>
  );
});
