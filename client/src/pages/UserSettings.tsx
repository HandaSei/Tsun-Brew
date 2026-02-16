import { useAuth } from "@/hooks/use-auth";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Loader2, Settings, Star } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { ScoringSystem, UserPreference } from "@shared/schema";
import { useState, useEffect } from "react";

export default function UserSettings() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: systems } = useQuery<ScoringSystem[]>({
    queryKey: ["/api/scoring-systems"],
  });

  const { data: userPref, isLoading: prefLoading } = useQuery<UserPreference | null>({
    queryKey: ["/api/user-preferences"],
    enabled: !!user,
  });

  const [selectedSystem, setSelectedSystem] = useState<string>("");

  useEffect(() => {
    if (userPref?.preferredScoringSystemId) {
      setSelectedSystem(String(userPref.preferredScoringSystemId));
    } else if (systems && systems.length > 0) {
      const active = systems.filter(s => s.isActive);
      if (active.length > 0) {
        setSelectedSystem(String(active[0].id));
      }
    }
  }, [userPref, systems]);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/");
    }
  }, [authLoading, user, setLocation]);

  const updatePrefMutation = useMutation({
    mutationFn: async (data: { preferredScoringSystemId: number | null }) => {
      return apiRequest("PATCH", "/api/user-preferences", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-preferences"] });
      toast({ title: "Preferences saved", description: "Your preferred scoring system has been updated." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (authLoading || prefLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary/30" />
        </div>
      </div>
    );
  }

  const activeSystems = (systems || []).filter(s => s.isActive);

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-primary/10 p-3 rounded-full text-primary">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Settings</h1>
            <p className="text-muted-foreground">Customize your experience, {user.username}.</p>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Scoring Preferences</h2>
            </div>

            <div className="space-y-3">
              <Label>Preferred Scoring System</Label>
              <p className="text-sm text-muted-foreground">Community scores will be shown using this system. Your scores can use any system.</p>
              {activeSystems.length > 0 ? (
                <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                  <SelectTrigger data-testid="select-preferred-scoring">
                    <SelectValue placeholder="Choose a scoring system" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSystems.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name} (1-{s.maxScore})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground italic">No scoring systems available yet.</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => updatePrefMutation.mutate({ preferredScoringSystemId: selectedSystem ? Number(selectedSystem) : null })}
                disabled={updatePrefMutation.isPending}
                data-testid="button-save-preferences"
              >
                {updatePrefMutation.isPending ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}
