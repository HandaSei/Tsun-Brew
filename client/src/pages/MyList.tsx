import { useLogs } from "@/hooks/use-logs";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Timer, Coffee, CheckCircle } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { BrewTimer } from "@/components/BrewTimer";

export default function MyList() {
  const { user } = useAuth();
  const { data: logs, isLoading } = useLogs();
  const [, setLocation] = useLocation();

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
  const completed = logs?.filter(log => log.status === 'completed') || [];

  const TeaListItem = ({ log }: { log: any }) => {
    return (
      <div className="glass-card p-4 rounded-xl flex items-center gap-4 group transition-all hover:shadow-lg">
        <Link href={`/tea/${log.tea.id}`} className="flex-1 flex items-center gap-4">
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
            <p className="text-sm text-muted-foreground">{log.tea.type}</p>
          </div>
        </Link>
        
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-muted-foreground uppercase tracking-wider">Brews</p>
            <p className="font-mono font-medium text-lg">{log.totalBrews || 0}</p>
          </div>

          <Dialog>
            <DialogTrigger asChild>
              <Button size="icon" variant="outline" className="rounded-full w-10 h-10 border-primary/20 hover:bg-primary hover:text-white">
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
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20">
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
              <div className="p-2 rounded-full bg-amber-100 text-amber-700">
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

          {/* Completed */}
          {completed.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-full bg-slate-100 text-slate-700">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <h2 className="text-2xl font-display font-bold text-muted-foreground">Finished</h2>
                <Badge variant="secondary" className="ml-auto rounded-full">{completed.length}</Badge>
              </div>
              
              <div className="grid gap-4 opacity-75">
                {completed.map(log => <TeaListItem key={log.id} log={log} />)}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
