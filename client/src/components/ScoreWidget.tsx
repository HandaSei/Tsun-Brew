import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { ScoringSystem, TeaScore, SiteSettings } from "@shared/schema";

interface ScoreWidgetProps {
  teaId: number;
  compact?: boolean;
}

function ScoreLogo({ definition, size = "sm" }: { definition: any; size?: "sm" | "md" }) {
  if (!definition.logoUrl) return null;
  const sizeClass = size === "sm" ? "w-4 h-4" : "w-6 h-6";
  return <img src={definition.logoUrl} alt="" className={`${sizeClass} object-contain inline-block`} />;
}

function formatScore(score: number, system: ScoringSystem & { definitions: ScoreDefinition[] }) {
  const def = system.definitions?.find(d => d.scoreValue === score);
  const logo = def?.logoUrl ? <ScoreLogo definition={def} /> : null;
  const text = def?.label ? <span>{def.label} ({score})</span> : <span>{score}/{system.maxScore}</span>;
  
  return (
    <span className="inline-flex items-center gap-1.5">
      {logo}
      {text}
    </span>
  );
}

function normalizeScore(score: number, fromMax: number, toMax: number): number {
  return Math.round((score / fromMax) * toMax * 10) / 10;
}

export function ScoreWidget({ teaId, compact = false }: ScoreWidgetProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSystemId, setSelectedSystemId] = useState<string>("");
  const [selectedScore, setSelectedScore] = useState<string>("");

  const { data: systems } = useQuery<ScoringSystem[]>({
    queryKey: ["/api/scoring-systems"],
  });

  const { data: scoreData } = useQuery<{ userScores: TeaScore[]; communityScores: { scoringSystemId: number; avgScore: number; voteCount: number }[] }>({
    queryKey: ["/api/teas", teaId, "scores"],
  });

  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
  });

  const { data: userPref } = useQuery<any>({
    queryKey: ["/api/user-preferences"],
    enabled: !!user,
  });

  const submitScore = useMutation({
    mutationFn: async (data: { teaId: number; scoringSystemId: number; score: number }) => {
      return apiRequest("POST", "/api/tea-scores", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teas", teaId, "scores"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-scores"] });
      setDialogOpen(false);
    },
  });

  const activeSystems = (systems || []).filter(s => s.isActive);
  const minVotes = settings?.minCommunityVotes ?? 15;
  const preferredSystemId = userPref?.preferredScoringSystemId;
  const preferredSystem = activeSystems.find(s => s.id === preferredSystemId) || activeSystems[0];

  const userScores = scoreData?.userScores || [];
  const communityScores = scoreData?.communityScores || [];

  const getBestCommunityDisplay = () => {
    if (!preferredSystem) return null;
    const direct = communityScores.find(c => c.scoringSystemId === preferredSystem.id);
    if (direct && direct.voteCount >= minVotes) {
      return { avg: direct.avgScore, count: direct.voteCount, system: preferredSystem };
    }
    for (const c of communityScores) {
      if (c.voteCount >= minVotes) {
        const sys = activeSystems.find(s => s.id === c.scoringSystemId);
        if (sys) {
          const normalized = normalizeScore(c.avgScore, sys.maxScore, preferredSystem.maxScore);
          return { avg: normalized, count: c.voteCount, system: preferredSystem };
        }
      }
    }
    const totalVotes = communityScores.reduce((sum, c) => sum + c.voteCount, 0);
    if (totalVotes > 0) {
      return { avg: 0, count: totalVotes, notEnough: true, system: preferredSystem };
    }
    return null;
  };

  const getUserScoreDisplay = () => {
    if (!user || userScores.length === 0) return null;
    const direct = userScores.find(s => s.scoringSystemId === preferredSystem?.id);
    if (direct && preferredSystem) {
      return { score: direct.score, system: preferredSystem };
    }
    const first = userScores[0];
    const sys = activeSystems.find(s => s.id === first.scoringSystemId);
    if (sys) return { score: first.score, system: sys };
    return null;
  };

  const communityDisplay = getBestCommunityDisplay();
  const userScoreDisplay = getUserScoreDisplay();

  const openScoreDialog = () => {
    const defaultSystem = preferredSystem || activeSystems[0];
    if (defaultSystem) {
      setSelectedSystemId(String(defaultSystem.id));
      const existingScore = userScores.find(s => s.scoringSystemId === defaultSystem.id);
      setSelectedScore(existingScore ? String(existingScore.score) : "");
    }
    setDialogOpen(true);
  };

  const handleSystemChange = (val: string) => {
    setSelectedSystemId(val);
    const existing = userScores.find(s => s.scoringSystemId === Number(val));
    setSelectedScore(existing ? String(existing.score) : "");
  };

  const currentDialogSystem = activeSystems.find(s => s.id === Number(selectedSystemId));
  const maxScore = currentDialogSystem?.maxScore || 10;

  if (activeSystems.length === 0) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {userScoreDisplay && (
          <Badge variant="outline" className="gap-1 py-0.5 text-xs border-primary/20" data-testid={`badge-user-score-${teaId}`}>
            <Star className="w-3 h-3 fill-primary/30 text-primary" />
            {formatScore(userScoreDisplay.score, userScoreDisplay.system)}
          </Badge>
        )}
        {communityDisplay && !communityDisplay.notEnough && (
          <Badge variant="secondary" className="gap-1 py-0.5 text-xs" data-testid={`badge-community-score-${teaId}`}>
            {formatScore(communityDisplay.avg, communityDisplay.system)}
            <span className="text-muted-foreground ml-0.5">({communityDisplay.count})</span>
          </Badge>
        )}
        {user && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1" onClick={openScoreDialog} data-testid={`button-rate-tea-${teaId}`}>
                <Star className="w-3 h-3" />
                {userScoreDisplay ? "Edit" : "Rate"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Rate this tea</DialogTitle>
              </DialogHeader>
              <ScoreDialogContent
                activeSystems={activeSystems}
                selectedSystemId={selectedSystemId}
                selectedScore={selectedScore}
                maxScore={maxScore}
                currentDialogSystem={currentDialogSystem}
                onSystemChange={handleSystemChange}
                onScoreChange={setSelectedScore}
                onSubmit={() => {
                  if (selectedScore && selectedSystemId) {
                    submitScore.mutate({ teaId, scoringSystemId: Number(selectedSystemId), score: Number(selectedScore) });
                  }
                }}
                isPending={submitScore.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        {userScoreDisplay && (
          <div className="flex items-center gap-2" data-testid={`display-user-score-${teaId}`}>
            <span className="text-sm text-muted-foreground">Your score:</span>
            <Badge variant="outline" className="gap-1.5 py-1 px-3 border-primary/30 text-primary font-semibold">
              <Star className="w-3.5 h-3.5 fill-primary/30" />
              {formatScore(userScoreDisplay.score, userScoreDisplay.system)}
            </Badge>
          </div>
        )}

        {communityDisplay && (
          <div className="flex items-center gap-2" data-testid={`display-community-score-${teaId}`}>
            <span className="text-sm text-muted-foreground">Community:</span>
            {communityDisplay.notEnough ? (
              <span className="text-xs text-muted-foreground">{communityDisplay.count}/{minVotes} votes needed</span>
            ) : (
              <Badge variant="secondary" className="gap-1.5 py-1 px-3 font-semibold">
                {formatScore(communityDisplay.avg, communityDisplay.system)}
                <span className="text-muted-foreground font-normal ml-1">({communityDisplay.count} votes)</span>
              </Badge>
            )}
          </div>
        )}
      </div>

      {user && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 rounded-full" onClick={openScoreDialog} data-testid={`button-rate-tea-${teaId}`}>
              <Star className="w-4 h-4" />
              {userScoreDisplay ? "Change Score" : "Rate This Tea"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Rate this tea</DialogTitle>
            </DialogHeader>
            <ScoreDialogContent
              activeSystems={activeSystems}
              selectedSystemId={selectedSystemId}
              selectedScore={selectedScore}
              maxScore={maxScore}
              currentDialogSystem={currentDialogSystem}
              onSystemChange={handleSystemChange}
              onScoreChange={setSelectedScore}
              onSubmit={() => {
                if (selectedScore && selectedSystemId) {
                  submitScore.mutate({ teaId, scoringSystemId: Number(selectedSystemId), score: Number(selectedScore) });
                }
              }}
              isPending={submitScore.isPending}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function ScoreDialogContent({
  activeSystems,
  selectedSystemId,
  selectedScore,
  maxScore,
  currentDialogSystem,
  onSystemChange,
  onScoreChange,
  onSubmit,
  isPending,
}: {
  activeSystems: ScoringSystem[];
  selectedSystemId: string;
  selectedScore: string;
  maxScore: number;
  currentDialogSystem: ScoringSystem | undefined;
  onSystemChange: (val: string) => void;
  onScoreChange: (val: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}) {
  return (
    <div className="space-y-4 pt-2">
      {activeSystems.length > 1 && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Scoring System</label>
          <Select value={selectedSystemId} onValueChange={onSystemChange}>
            <SelectTrigger data-testid="select-scoring-system">
              <SelectValue placeholder="Choose system" />
            </SelectTrigger>
            <SelectContent>
              {activeSystems.map(s => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name} (1-{s.maxScore})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <label className="text-sm font-medium">
          Score {currentDialogSystem ? `(1-${currentDialogSystem.maxScore})` : ""}
        </label>
        {maxScore <= 10 ? (
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: maxScore }, (_, i) => i + 1).map(val => (
              <Button
                key={val}
                variant={selectedScore === String(val) ? "default" : "outline"}
                size="sm"
                onClick={() => onScoreChange(String(val))}
                data-testid={`button-score-${val}`}
              >
                {val}
              </Button>
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={1}
              max={maxScore}
              value={selectedScore || 1}
              onChange={e => onScoreChange(e.target.value)}
              className="flex-1 accent-primary"
              data-testid="slider-score"
            />
            <span className="text-lg font-bold min-w-[3ch] text-center">{selectedScore || "?"}</span>
          </div>
        )}
      </div>

      {currentDialogSystem?.logoUrl && selectedScore && (
        <div className="flex items-center justify-center gap-2 text-lg font-semibold py-2">
          {formatScore(Number(selectedScore), currentDialogSystem)}
        </div>
      )}

      <Button
        className="w-full"
        onClick={onSubmit}
        disabled={!selectedScore || isPending}
        data-testid="button-submit-score"
      >
        {isPending ? "Saving..." : "Submit Score"}
      </Button>
    </div>
  );
}
