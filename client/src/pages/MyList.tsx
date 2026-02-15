import { useLogs, useUpdateLog, useDeleteLog } from "@/hooks/use-logs";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/use-auth";
import { useTeaTypes, getTeaTypeColor } from "@/hooks/use-tea-types";

import { Button } from "@/components/ui/button";
import { Loader2, Plus, Timer, Coffee, CheckCircle, XCircle, MoreVertical, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { BrewTimer } from "@/components/BrewTimer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MyList() {
  const { user, isLoading: authLoading } = useAuth();
  const { data: logs, isLoading } = useLogs();
  const { data: teaTypes } = useTeaTypes();
  const updateLog = useUpdateLog();
  const deleteLog = useDeleteLog();
  const [, setLocation] = useLocation();

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary/30" />
        </div>
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary/30" />
        </div>
      </div>
    );
  }

  // Group logs by status
  const drinking = logs?.filter(log => log.status === 'drinking') || [];
  const wantToTry = logs?.filter(log => log.status === 'want_to_try') || [];
  const notRebuying = logs?.filter(log => log.status === 'not_rebuying') || [];

  const TeaListItem = ({ log }: { log: any }) => {
    const handleStatusChange = (newStatus: string) => {
      updateLog.mutate({
        teaId: log.tea.id,
        status: newStatus
      } as any);
    };

    const handleDelete = () => {
      if (confirm(`Remove ${log.tea.name} from your list?`)) {
        deleteLog.mutate(log.tea.id);
      }
    };

    return (
      <div className="glass-card p-4 rounded-xl flex items-center gap-4 group transition-all hover:shadow-lg">
        <Link href={`/${(log.tea as any).isCustom ? 'custom-tea' : 'tea'}/${(log.tea as any).slug}`} className="flex-1 flex items-center gap-4">
          <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary">
            {log.tea.photoUrl ? (
              <img src={log.tea.photoUrl} alt={log.tea.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary/30">
                <Coffee className="w-6 h-6" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-display font-bold text-lg group-hover:text-primary transition-colors">{log.tea.name}</h3>
            <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold shadow-sm mt-1" style={getTeaTypeColor(teaTypes, log.tea.type, log.tea as any).style} data-testid={`badge-type-${log.tea.id}`}>{log.tea.type}</span>
          </div>
        </Link>
        
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Brews</p>
            <p className="font-mono font-medium text-lg">{log.totalBrews || 0}</p>
          </div>

          <div className="flex items-center gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="icon" variant="outline" className="rounded-full border-primary/20">
                  <Timer className="w-4 h-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <div className="pt-6">
                  <h3 className="text-center font-display text-2xl mb-2">{log.tea.name}</h3>
                  <BrewTimer 
                    tea={log.tea}
                    teaLog={log}
                    showControls={true}
                  />
                </div>
              </DialogContent>
            </Dialog>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost" className="rounded-full w-10 h-10">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleStatusChange('drinking')}>
                  Move to Drinking
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('want_to_try')}>
                  Move to Want to Try
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusChange('not_rebuying')}>
                  Move to Not Rebuying
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleDelete} className="text-destructive focus:text-destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete from List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <header className="mb-10">
          <h1 className="text-4xl font-display font-bold mb-2">My Tea Collection</h1>
          <p className="text-muted-foreground">Track your journey through the world of tea.</p>
        </header>

        <div className="space-y-12">
          {/* Currently Drinking */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-full bg-primary/10 text-primary">
                <Coffee className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-display font-bold">Currently Drinking</h2>
              <Badge variant="secondary" className="ml-auto rounded-full">{drinking.length}</Badge>
            </div>
            
            {drinking.length > 0 ? (
              <div className="grid gap-4">
                {drinking.map(log => <TeaListItem key={log.id} log={log} />)}
              </div>
            ) : (
              <div className="text-center py-8 border-2 border-dashed border-border rounded-xl">
                <p className="text-muted-foreground mb-4">You're not drinking any teas right now.</p>
                <Link href="/">
                  <Button variant="outline">Browse Teas</Button>
                </Link>
              </div>
            )}
          </section>

          {/* Want to Try */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-full bg-accent/15 text-accent">
                <Plus className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-display font-bold">Want to Try</h2>
              <Badge variant="secondary" className="ml-auto rounded-full">{wantToTry.length}</Badge>
            </div>
            
            <div className="grid gap-4">
              {wantToTry.map(log => <TeaListItem key={log.id} log={log} />)}
              {wantToTry.length === 0 && (
                <p className="text-muted-foreground italic pl-2">Your wishlist is empty.</p>
              )}
            </div>
          </section>

          {/* Not Rebuying */}
          {notRebuying.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-full bg-destructive/10 text-destructive">
                  <XCircle className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-display font-bold text-muted-foreground">Not Rebuying</h2>
                <Badge variant="secondary" className="ml-auto rounded-full">{notRebuying.length}</Badge>
              </div>
              
              <div className="grid gap-4 opacity-60">
                {notRebuying.map(log => <TeaListItem key={log.id} log={log} />)}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
