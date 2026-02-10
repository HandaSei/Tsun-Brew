import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUpdateLog } from "@/hooks/use-logs";
import { Coffee, Plus, Ban, Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS = [
  { id: 'currently_drinking', label: 'Currently Drinking', icon: Coffee, color: 'text-primary bg-primary/10' },
  { id: 'want_to_try', label: 'Want to Try', icon: Plus, color: 'text-amber-600 bg-amber-50' },
  { id: 'not_rebuying', label: 'Not Rebuying', icon: Ban, color: 'text-slate-600 bg-slate-100' },
];

interface StatusUpdateDialogProps {
  teaId: number;
  currentStatus?: string;
  trigger?: React.ReactNode;
}

export function StatusUpdateDialog({ teaId, currentStatus, trigger }: StatusUpdateDialogProps) {
  const [open, setOpen] = useState(false);
  const updateLog = useUpdateLog();

  const handleUpdate = (status: string) => {
    updateLog.mutate({ teaId, status }, {
      onSuccess: () => setOpen(false)
    });
  };

  const currentOption = STATUS_OPTIONS.find(opt => opt.id === currentStatus);

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger || (
          <div className="flex flex-col gap-1">
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg border border-border/50 bg-white shadow-sm hover:shadow-md transition-all group",
              !currentStatus && "opacity-50"
            )}>
              {currentOption ? (
                <>
                  <currentOption.icon className={cn("w-4 h-4", currentOption.color.split(' ')[0])} />
                  <span className="text-sm font-medium flex-1">{currentOption.label}</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium flex-1">Add to My List</span>
                </>
              )}
              <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            {currentStatus && (
              <div className="h-1.5 w-full bg-secondary/30 rounded-full overflow-hidden">
                <div 
                  className={cn(
                    "h-full transition-all duration-500",
                    currentStatus === 'currently_drinking' ? "w-full bg-primary" : 
                    currentStatus === 'want_to_try' ? "w-1/2 bg-amber-400" : "w-full bg-slate-400"
                  )} 
                />
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Update Tea Status</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 pt-4">
            {STATUS_OPTIONS.map((option) => (
              <Button
                key={option.id}
                variant={currentStatus === option.id ? "secondary" : "outline"}
                className={cn(
                  "justify-start h-14 gap-4 px-4 rounded-xl transition-all",
                  currentStatus === option.id && "ring-2 ring-primary/20 border-primary/50"
                )}
                onClick={() => handleUpdate(option.id)}
                disabled={updateLog.isPending}
              >
                <div className={cn("p-2 rounded-full", option.color)}>
                  <option.icon className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-bold">{option.label}</div>
                  {currentStatus === option.id && (
                    <div className="text-[10px] uppercase tracking-wider text-primary font-bold">Current Status</div>
                  )}
                </div>
                {updateLog.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
