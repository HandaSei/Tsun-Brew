import { useLogs, useUpdateLog, useDeleteLog, usePublicLogs } from "@/hooks/use-logs";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/use-auth";
import { useTeaTypes, getTeaTypeColor } from "@/hooks/use-tea-types";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import type { CollectionPhrase } from "@shared/schema";
import { ScoreWidget } from "@/components/ScoreWidget";

import { Button } from "@/components/ui/button";
import { Loader2, Plus, Timer, Coffee, CheckCircle, XCircle, MoreVertical, Trash2, UserPlus, Share2, Check, Eye, Flame, Users, Skull, Handshake, Ban, Heart, Star, Sparkles, AlertTriangle, ThumbsDown, ThumbsUp, Zap, Crown, Shield, Swords } from "lucide-react";
import { Link, useLocation, useRoute } from "wouter";
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

const ICON_MAP: Record<string, any> = {
  CheckCircle, Eye, Flame, Users, Skull, Handshake, Ban, Heart, Star, Sparkles, AlertTriangle, ThumbsDown, ThumbsUp, Zap, Crown, Shield, Swords, XCircle, Plus, Coffee, Timer,
};

export default function MyList() {
  const [, params] = useRoute("/:username/Collection");
  const username = params?.username;
  const { user, isLoading: authLoading } = useAuth();
  const isOwner = user && username && user.username.toLowerCase() === username.toLowerCase();
  
  const { data: myLogs } = useLogs();
  const { data: publicLogs, isLoading: isPublicLoading } = usePublicLogs(isOwner ? "" : (username || ""));
  
  const logs = isOwner ? myLogs : publicLogs;
  const isLoading = isOwner ? false : isPublicLoading;

  const { data: teaTypes } = useTeaTypes();
  const { data: collectionPhrases } = useQuery<CollectionPhrase[]>({
    queryKey: ["/api/collection-phrases"],
  });
  const updateLog = useUpdateLog();
  const deleteLog = useDeleteLog();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/${user?.username}/Collection`;
    const shareData = {
      title: 'Tsun Brew Collection',
      text: `Check out my tea collection on Tsun Brew!`,
      url: url,
    };

    if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Link copied!",
        description: "Your collection link has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  if (isLoading && !logs) {
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
    const myLogForTea = myLogs?.find(ml => ml.teaId === log.tea.id);
    const isInMyList = !!myLogForTea;

    const getPhrase = () => {
      if (!myLogs || !collectionPhrases) return null;
      const myLogForTea = myLogs.find(ml => ml.teaId === log.tea.id);
      
      // If the visitor doesn't have the tea, we can show a special phrase or nothing.
      // For now, we only show phrases for the 9 combinations where both have it.
      if (!myLogForTea) return null;

      const ownerStatus = log.status;
      const visitorStatus = myLogForTea.status;
      const phrase = collectionPhrases.find(
        p => p.ownerStatus === ownerStatus && p.visitorStatus === visitorStatus
      );
      
      if (!phrase || !phrase.phrase.trim()) return null;
      return phrase;
    };

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

    const handleAddToList = (status: string) => {
      updateLog.mutate({
        teaId: log.tea.id,
        status: status as any
      } as any);
    };

    return (
      <div className="glass-card p-4 rounded-xl flex items-center gap-4 group transition-all hover:shadow-lg">
        <div className="flex-1 flex items-center gap-4" onClick={(e) => {
          // If the click target is a button or inside a button (like the Rate/Edit button), don't navigate
          if ((e.target as HTMLElement).closest('button')) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}>
          <Link href={`/${(log.tea as any).isCustom ? 'custom-tea' : 'tea'}/${(log.tea as any).slug}`} className="flex items-center gap-4 flex-1">
            <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
              {log.tea.photoUrl ? (
                <img src={log.tea.photoUrl} alt={log.tea.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary/30">
                  <Coffee className="w-6 h-6" />
                </div>
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-bold text-lg group-hover:text-primary transition-colors truncate">{log.tea.name}</h3>
                {!isOwner && user && (() => {
                  const phraseData = getPhrase();
                  if (!phraseData) return null;
                  const IconComp = ICON_MAP[phraseData.icon] || CheckCircle;
                  const bg = `hsla(${phraseData.colorHue}, ${phraseData.colorSaturation}%, ${phraseData.colorLightness}%, 0.1)`;
                  const fg = `hsl(${phraseData.colorHue}, ${phraseData.colorSaturation}%, ${phraseData.colorLightness}%)`;
                  const border = `hsla(${phraseData.colorHue}, ${phraseData.colorSaturation}%, ${phraseData.colorLightness}%, 0.2)`;
                  return (
                    <Badge variant="outline" className="px-2 py-0 h-5 text-[10px] rounded-full animate-in fade-in zoom-in duration-300" style={{ backgroundColor: bg, color: fg, borderColor: border }} data-testid={`badge-phrase-${log.tea.id}`}>
                      <IconComp className="w-3 h-3 mr-1" />
                      {phraseData.phrase}
                    </Badge>
                  );
                })()}
              </div>
              <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold shadow-sm mt-1 w-fit" style={getTeaTypeColor(teaTypes, log.tea.type, log.tea as any).style} data-testid={`badge-type-${log.tea.id}`}>{log.tea.type}</span>
              <div className="mt-1" onClick={(e) => e.stopPropagation()}>
                <ScoreWidget teaId={log.tea.id} compact />
              </div>
            </div>
          </Link>
        </div>
        
        <div className="flex items-center gap-2 sm:gap-4">
          {!isOwner && user && !isInMyList && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="rounded-full gap-2 border-primary/20 bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-500/20 hover:text-yellow-700 dark:hover:text-yellow-300">
                  <UserPlus className="w-4 h-4" />
                  <span className="hidden sm:inline">Add to my list</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleAddToList('drinking')}>
                  Add to Drinking
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddToList('want_to_try')}>
                  Add to Want to Try
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddToList('not_rebuying')}>
                  Add to Not Rebuying
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

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
                    showControls={isOwner}
                  />
                </div>
              </DialogContent>
            </Dialog>

            {isOwner && (
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
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      <Navigation />
      
      <div className="container mx-auto px-4 py-8 relative">
        {isOwner && (
          <div className="md:hidden absolute top-2 right-4 z-10">
            <Button 
              variant="outline" 
              className="rounded-full gap-2 border-primary/20 hover:bg-primary/5 h-8 px-3 shadow-sm"
              onClick={handleShare}
              data-testid="button-share-list-mobile"
            >
              <Share2 className="w-3 h-3" />
              <span className="text-xs font-medium">Share List</span>
            </Button>
          </div>
        )}

        <header className="mb-10 mt-6 flex flex-row items-center justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-display font-bold mb-2">{username}'s Collection</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              {isOwner 
                ? "Track your journey through the world of tea." 
                : `Browsing ${username}'s favorite teas and brewing history.`}
            </p>
          </div>
        </header>

        {isOwner && (
          <Button 
            variant="outline" 
            className="hidden md:flex fixed bottom-6 left-6 z-[60] rounded-full gap-2 border-primary/20 bg-background/80 backdrop-blur-md hover:bg-primary/5 h-9 px-4 shadow-lg animate-in slide-in-from-bottom-4 duration-300"
            onClick={handleShare}
            data-testid="button-share-list"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="text-sm font-medium">{copied ? "Link Copied!" : "Share List"}</span>
          </Button>
        )}

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
                <p className="text-muted-foreground italic pl-2">
                  {isOwner ? "Your wishlist is empty." : `${username} hasn't added any teas to their wishlist.`}
                </p>
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
