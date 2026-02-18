import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type User } from "@shared/routes";
import { useAuth } from "@/hooks/use-auth";
import { Navigation } from "@/components/Navigation";
import { Loader2, ShieldAlert, Plus, Pencil, Trash2, Palette, Link as LinkIcon, ArrowUp, ArrowDown, CheckCircle, Eye, Flame, Users, Skull, Handshake, Ban, Heart, Star, Sparkles, AlertTriangle, ThumbsDown, ThumbsUp, Zap, Crown, Shield, Swords, XCircle, Coffee, Timer, MessageSquare } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useTeaTypes } from "@/hooks/use-tea-types";
import type { TeaType, SiteSettings, FooterLink, CollectionPhrase, ScoringSystem, ScoreDefinition } from "@shared/schema";
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";

const ICON_MAP: Record<string, any> = {
  CheckCircle, Eye, Flame, Users, Skull, Handshake, Ban, Heart, Star, Sparkles, AlertTriangle, ThumbsDown, ThumbsUp, Zap, Crown, Shield, Swords, XCircle, Coffee, Timer, MessageSquare, Plus,
};

const ICON_NAMES = Object.keys(ICON_MAP);

const STATUS_LABELS: Record<string, string> = {
  drinking: "Currently Drinking",
  want_to_try: "Want to Try",
  not_rebuying: "Not Rebuying",
};

function UsersTab({ user }: { user: NonNullable<ReturnType<typeof useAuth>["user"]> }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: [api.admin.getUsers.path],
    queryFn: async () => {
      const res = await fetch(api.admin.getUsers.path);
      if (!res.ok) throw new Error("Failed to fetch users");
      return api.admin.getUsers.responses[200].parse(await res.json());
    },
    enabled: user.role === "admin",
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: "user" | "mod" | "admin" }) => {
      const path = api.admin.updateRole.path.replace(":id", id.toString());
      const res = await fetch(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.getUsers.path] });
      toast({ title: "Role Updated", description: "User permissions have been modified." });
    },
    onError: (err) => {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Username</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users?.map((u: User) => (
            <TableRow key={u.id}>
              <TableCell className="font-medium">{u.username}</TableCell>
              <TableCell>
                <Badge variant={u.role === "admin" ? "destructive" : u.role === "mod" ? "default" : "secondary"}>
                  {u.role}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {new Date(u.createdAt || "").toLocaleDateString()}
              </TableCell>
              <TableCell className="text-right">
                <Select 
                  defaultValue={u.role} 
                  onValueChange={(val) => updateRoleMutation.mutate({ id: u.id, role: val as any })}
                  disabled={u.id === user?.id}
                >
                  <SelectTrigger className="w-[120px] ml-auto" data-testid={`select-role-${u.id}`}>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="mod">Moderator</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}

function TeaTypesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: teaTypes, isLoading } = useTeaTypes();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingType, setEditingType] = useState<TeaType | null>(null);
  const [formName, setFormName] = useState("");
  const [formHue, setFormHue] = useState(120);
  const [formSaturation, setFormSaturation] = useState(30);
  const [formLightness, setFormLightness] = useState(40);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const openCreate = () => {
    setEditingType(null);
    setFormName("");
    setFormHue(120);
    setFormSaturation(30);
    setFormLightness(40);
    setDialogOpen(true);
  };

  const openEdit = (t: TeaType) => {
    setEditingType(t);
    setFormName(t.name);
    setFormHue(t.colorHue);
    setFormSaturation(t.colorSaturation);
    setFormLightness(t.colorLightness);
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; colorHue: number; colorSaturation: number; colorLightness: number }) => {
      return apiRequest("POST", "/api/tea-types", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tea-types"] });
      setDialogOpen(false);
      toast({ title: "Tea Type Created" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { name: string; colorHue: number; colorSaturation: number; colorLightness: number } }) => {
      return apiRequest("PATCH", `/api/tea-types/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tea-types"] });
      setDialogOpen(false);
      toast({ title: "Tea Type Updated" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/tea-types/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tea-types"] });
      setDeleteConfirm(null);
      toast({ title: "Tea Type Deleted" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    const data = { name: formName, colorHue: formHue, colorSaturation: formSaturation, colorLightness: formLightness };
    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const previewBg = `hsl(${formHue}, ${formSaturation}%, ${formLightness}%)`;
  const previewFg = formLightness > 55 ? `hsl(${formHue}, ${Math.min(formSaturation + 20, 100)}%, 15%)` : `hsl(${formHue}, ${Math.min(formSaturation + 10, 100)}%, 95%)`;

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">Manage the tea types available in the catalog. Each type has a custom color for badges and cards.</p>
        <Button onClick={openCreate} data-testid="button-add-tea-type">
          <Plus className="w-4 h-4 mr-2" />
          Add Type
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Color</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>HSL Values</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(teaTypes || []).map((t) => {
              const bg = `hsl(${t.colorHue}, ${t.colorSaturation}%, ${t.colorLightness}%)`;
              const fg = t.colorLightness > 55 ? `hsl(${t.colorHue}, ${Math.min(t.colorSaturation + 20, 100)}%, 15%)` : `hsl(${t.colorHue}, ${Math.min(t.colorSaturation + 10, 100)}%, 95%)`;
              return (
                <TableRow key={t.id} data-testid={`row-tea-type-${t.id}`}>
                  <TableCell>
                    <div className="w-8 h-8 rounded-md border border-border" style={{ backgroundColor: bg }} />
                  </TableCell>
                  <TableCell>
                    <Badge className="font-medium" style={{ backgroundColor: bg, color: fg, borderColor: `hsl(${t.colorHue}, ${t.colorSaturation}%, ${Math.max(t.colorLightness - 10, 0)}%)` }}>
                      {t.name}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    H:{t.colorHue} S:{t.colorSaturation}% L:{t.colorLightness}%
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)} data-testid={`button-edit-type-${t.id}`}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {deleteConfirm === t.id ? (
                        <div className="flex items-center gap-1">
                          <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(t.id)} data-testid={`button-confirm-delete-type-${t.id}`}>
                            Confirm
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(t.id)} data-testid={`button-delete-type-${t.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingType ? "Edit Tea Type" : "Add New Tea Type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Pu-erh" data-testid="input-type-name" />
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" /> Color Preview
              </Label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-md border border-border" style={{ backgroundColor: previewBg }} />
                <Badge className="font-medium text-sm" style={{ backgroundColor: previewBg, color: previewFg }}>
                  {formName || "Preview"}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hue ({formHue})</Label>
              <input type="range" min="0" max="360" value={formHue} onChange={(e) => setFormHue(Number(e.target.value))} className="w-full accent-primary" data-testid="slider-hue" />
            </div>
            <div className="space-y-2">
              <Label>Saturation ({formSaturation}%)</Label>
              <input type="range" min="0" max="100" value={formSaturation} onChange={(e) => setFormSaturation(Number(e.target.value))} className="w-full accent-primary" data-testid="slider-saturation" />
            </div>
            <div className="space-y-2">
              <Label>Lightness ({formLightness}%)</Label>
              <input type="range" min="10" max="90" value={formLightness} onChange={(e) => setFormLightness(Number(e.target.value))} className="w-full accent-primary" data-testid="slider-lightness" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formName.trim() || createMutation.isPending || updateMutation.isPending} data-testid="button-save-type">
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingType ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScoringSystemsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: systems, isLoading } = useQuery<(ScoringSystem & { definitions: ScoreDefinition[] })[]>({
    queryKey: ["/api/scoring-systems"],
  });
  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<(ScoringSystem & { definitions: ScoreDefinition[] }) | null>(null);
  const [formName, setFormName] = useState("");
  const [formMaxScore, setFormMaxScore] = useState(10);
  const [formIsActive, setFormIsActive] = useState(true);
  const [scoreDefs, setScoreDefs] = useState<{ value: number; label: string; logoUrl: string }[]>([]);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [minVotes, setMinVotes] = useState(15);

  useEffect(() => {
    if (settings) {
      setMinVotes(settings.minCommunityVotes ?? 15);
    }
  }, [settings]);

  useEffect(() => {
    if (editingSystem) {
      setFormName(editingSystem.name);
      setFormMaxScore(editingSystem.maxScore);
      setFormIsActive(editingSystem.isActive);
      const existingDefs = editingSystem.definitions?.map(d => ({
        value: d.scoreValue,
        label: d.label || "",
        logoUrl: d.logoUrl || ""
      })) || [];
      if (existingDefs.length > 0) {
        setScoreDefs(existingDefs);
      } else {
        const defaults = [];
        for (let i = 1; i <= editingSystem.maxScore; i++) {
          defaults.push({ value: i, label: `${i}`, logoUrl: "" });
        }
        setScoreDefs(defaults);
      }
    } else {
      setFormName("");
      setFormMaxScore(10);
      setFormIsActive(true);
      setScoreDefs([]);
    }
  }, [editingSystem]);

  useEffect(() => {
    if (formMaxScore > 0) {
      setScoreDefs(prev => {
        const next = [];
        for (let i = 1; i <= formMaxScore; i++) {
          const existing = prev.find(p => p.value === i);
          next.push(existing || { value: i, label: `${i}`, logoUrl: "" });
        }
        return next;
      });
    }
  }, [formMaxScore]);

  const openCreate = () => {
    setEditingSystem(null);
    setFormName("");
    setFormMaxScore(10);
    setFormIsActive(true);
    setScoreDefs([]);
    setDialogOpen(true);
  };

  const openEdit = (s: ScoringSystem & { definitions: ScoreDefinition[] }) => {
    setEditingSystem(s);
    setDialogOpen(true);
  };

  const createMutation = useMutation({
    mutationFn: async (data: any) => apiRequest("POST", "/api/scoring-systems", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scoring-systems"] });
      setDialogOpen(false);
      toast({ title: "Scoring System Created" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => apiRequest("PATCH", `/api/scoring-systems/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scoring-systems"] });
      setDialogOpen(false);
      toast({ title: "Scoring System Updated" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => apiRequest("DELETE", `/api/scoring-systems/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scoring-systems"] });
      setDeleteConfirm(null);
      toast({ title: "Scoring System Deleted" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<SiteSettings>) => apiRequest("PATCH", "/api/site-settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      toast({ title: "Settings Updated" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    const data = {
      name: formName,
      maxScore: formMaxScore,
      isActive: formIsActive,
      definitions: scoreDefs.map(d => ({
        scoreValue: d.value,
        label: d.label,
        logoUrl: d.logoUrl || null
      }))
    };
    if (editingSystem) {
      updateMutation.mutate({ id: editingSystem.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-muted-foreground text-sm">Define scoring systems users can rate teas with. Each system has its own scale.</p>
        <Button onClick={openCreate} data-testid="button-add-scoring-system">
          <Plus className="w-4 h-4 mr-2" />
          Add System
        </Button>
      </div>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Max Score</TableHead>
              <TableHead>Options</TableHead>
              <TableHead>Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(systems || []).map((s) => (
              <TableRow key={s.id} data-testid={`row-scoring-system-${s.id}`}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.maxScore}</TableCell>
                <TableCell>
                  <div className="flex gap-1 flex-wrap max-w-xs">
                    {s.definitions?.slice(0, 5).map(d => (
                      <Badge key={d.id} variant="outline" className="text-[10px] px-1.5 py-0">
                        {d.logoUrl && <img src={d.logoUrl} alt="" className="w-2.5 h-2.5 mr-1" />}
                        {d.label}
                      </Badge>
                    ))}
                    {(s.definitions?.length || 0) > 5 && <span className="text-[10px] text-muted-foreground">+{(s.definitions?.length || 0) - 5} more</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={s.isActive ? "default" : "secondary"}>
                    {s.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(s)} data-testid={`button-edit-scoring-${s.id}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {deleteConfirm === s.id ? (
                      <div className="flex items-center gap-1">
                        <Button variant="destructive" size="sm" onClick={() => deleteMutation.mutate(s.id)} data-testid={`button-confirm-delete-scoring-${s.id}`}>
                          Confirm
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(s.id)} data-testid={`button-delete-scoring-${s.id}`}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <Card className="p-6 space-y-4">
        <h3 className="text-lg font-semibold">Community Score Threshold</h3>
        <p className="text-sm text-muted-foreground">Community average score for a tea is only shown after this many votes are reached.</p>
        <div className="flex items-center gap-3 flex-wrap">
          <Input
            type="number"
            value={minVotes}
            onChange={(e) => setMinVotes(Number(e.target.value))}
            className="w-32"
            min={1}
            data-testid="input-min-community-votes"
          />
          <span className="text-sm text-muted-foreground">votes required</span>
          <Button
            onClick={() => updateSettingsMutation.mutate({ minCommunityVotes: minVotes })}
            disabled={updateSettingsMutation.isPending}
            data-testid="button-save-min-votes"
          >
            {updateSettingsMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSystem ? "Edit Scoring System" : "Add Scoring System"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. 5 Stars" data-testid="input-scoring-name" />
              </div>
              <div className="space-y-2">
                <Label>Maximum Score</Label>
                <Input type="number" value={formMaxScore} onChange={(e) => setFormMaxScore(Number(e.target.value))} min={1} max={50} data-testid="input-scoring-max" />
                <p className="text-xs text-muted-foreground">Limit 50 for custom options.</p>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold">Scoring Options</Label>
              <div className="space-y-3">
                {scoreDefs.map((def, idx) => (
                  <div key={def.value} className="grid grid-cols-[3rem_1fr_1fr] items-center gap-3 p-3 rounded-lg border bg-card/50">
                    <div className="text-center font-bold text-lg text-primary">{def.value}</div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Label</Label>
                      <Input
                        value={def.label}
                        onChange={(e) => {
                          const next = [...scoreDefs];
                          next[idx].label = e.target.value;
                          setScoreDefs(next);
                        }}
                        placeholder={`Score ${def.value}`}
                        className="h-8 text-sm"
                        data-testid={`input-label-${def.value}`}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] uppercase text-muted-foreground">Logo URL</Label>
                      <Input
                        value={def.logoUrl}
                        onChange={(e) => {
                          const next = [...scoreDefs];
                          next[idx].logoUrl = e.target.value;
                          setScoreDefs(next);
                        }}
                        placeholder="https://..."
                        className="h-8 text-sm"
                        data-testid={`input-logo-${def.value}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3 shadow-sm bg-accent/10">
              <div className="space-y-0.5">
                <Label className="text-base">Active</Label>
                <p className="text-xs text-muted-foreground">Only active systems can be used for scoring.</p>
              </div>
              <Switch checked={formIsActive} onCheckedChange={setFormIsActive} data-testid="switch-scoring-active" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={!formName.trim() || createMutation.isPending || updateMutation.isPending} data-testid="button-save-scoring">
              {createMutation.isPending || updateMutation.isPending ? "Saving..." : editingSystem ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BrandingTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
  });

  const [siteName, setSiteName] = useState("");
  const [statusTag, setStatusTag] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [displayFont, setDisplayFont] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [trendingWindowHours, setTrendingWindowHours] = useState(48);
  const [trendingRefreshHours, setTrendingRefreshHours] = useState(24);

  useEffect(() => {
    if (settings) {
      setSiteName(settings.siteName || "");
      setStatusTag(settings.statusTag || "");
      setLogoUrl(settings.logoUrl || "");
      setDisplayFont(settings.displayFont || "");
      setFaviconUrl(settings.faviconUrl || "");
      setTrendingWindowHours((settings as any).trendingWindowHours ?? 48);
      setTrendingRefreshHours((settings as any).trendingRefreshHours ?? 24);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<SiteSettings>) => {
      return apiRequest("PATCH", "/api/site-settings", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/site-settings"] });
      toast({ title: "Branding Updated", description: "Site settings have been saved." });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const refreshTrendingMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/trending-teas/refresh");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trending-teas"] });
      toast({ title: "Trending Refreshed", description: "Trending teas have been recalculated." });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSave = () => {
    updateMutation.mutate({ siteName, statusTag, logoUrl, displayFont, faviconUrl, trendingWindowHours, trendingRefreshHours } as any);
  };

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground text-sm">Customize the look and feel of the site. Changes apply globally.</p>
      
      <Card className="p-6 space-y-5">
        <div className="space-y-2">
          <Label>Site Name</Label>
          <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="Tsun Brew" data-testid="input-site-name" />
          <p className="text-xs text-muted-foreground">Displayed in the navigation bar and browser tab.</p>
        </div>

        <div className="space-y-2">
          <Label>Status Tag</Label>
          <Input value={statusTag} onChange={(e) => setStatusTag(e.target.value)} placeholder="Open Alpha Build" data-testid="input-status-tag" />
          <p className="text-xs text-muted-foreground">Small label shown next to the site name. Leave empty to hide.</p>
        </div>

        <div className="space-y-2">
          <Label>Logo URL</Label>
          <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." data-testid="input-logo-url" />
          <p className="text-xs text-muted-foreground">URL to a logo image. If empty, uses the default leaf icon.</p>
        </div>

        <div className="space-y-2">
          <Label>Favicon URL</Label>
          <Input value={faviconUrl} onChange={(e) => setFaviconUrl(e.target.value)} placeholder="https://..." data-testid="input-favicon-url" />
          <p className="text-xs text-muted-foreground">URL to a favicon image (PNG or ICO). Shown in the browser tab. If empty, uses the default.</p>
        </div>

        <div className="space-y-2">
          <Label>Display Font</Label>
          <Input value={displayFont} onChange={(e) => setDisplayFont(e.target.value)} placeholder="Cormorant Garamond" data-testid="input-font-family" />
          <p className="text-xs text-muted-foreground">Google Font name for display headings. Must be a valid Google Fonts family name.</p>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-branding">
            {updateMutation.isPending ? "Saving..." : "Save Branding"}
          </Button>
        </div>
      </Card>

      <Card className="p-6 space-y-5">
        <h3 className="text-lg font-semibold">Trending Settings</h3>
        <p className="text-xs text-muted-foreground">Configure how the trending teas section works on the home page.</p>

        <div className="space-y-2">
          <Label>Trending Window (hours)</Label>
          <Input
            type="number"
            min={1}
            value={trendingWindowHours}
            onChange={(e) => setTrendingWindowHours(parseInt(e.target.value) || 48)}
            data-testid="input-trending-window"
          />
          <p className="text-xs text-muted-foreground">How far back to look for brew activity (default: 48 hours).</p>
        </div>

        <div className="space-y-2">
          <Label>Auto-Refresh Interval (hours)</Label>
          <Input
            type="number"
            min={1}
            value={trendingRefreshHours}
            onChange={(e) => setTrendingRefreshHours(parseInt(e.target.value) || 24)}
            data-testid="input-trending-refresh"
          />
          <p className="text-xs text-muted-foreground">How often trending data is automatically recalculated (default: 24 hours).</p>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => refreshTrendingMutation.mutate()}
            disabled={refreshTrendingMutation.isPending}
            data-testid="button-refresh-trending"
          >
            {refreshTrendingMutation.isPending ? "Refreshing..." : "Refresh Trending Now"}
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-trending">
            {updateMutation.isPending ? "Saving..." : "Save Trending Settings"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function BottomBarTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: footerLinks, isLoading: linksLoading } = useQuery<FooterLink[]>({
    queryKey: ["/api/footer-links"],
  });

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<FooterLink | null>(null);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkSlug, setLinkSlug] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const toSlug = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");

  const openCreateLink = () => {
    setEditingLink(null);
    setLinkLabel("");
    setLinkSlug("");
    setLinkDialogOpen(true);
  };

  const openEditLink = (link: FooterLink) => {
    setEditingLink(link);
    setLinkLabel(link.label);
    setLinkSlug(link.pageSlug);
    setLinkDialogOpen(true);
  };

  const handleLabelChange = (val: string) => {
    setLinkLabel(val);
    if (!editingLink) {
      setLinkSlug(toSlug(val));
    }
  };

  const createLinkMutation = useMutation({
    mutationFn: async (data: { label: string; pageSlug: string; sortOrder?: number }) => {
      return apiRequest("POST", "/api/footer-links", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/footer-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      setLinkDialogOpen(false);
      toast({ title: "Footer link and page created" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updateLinkMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<{ label: string; pageSlug: string; sortOrder: number }> }) => {
      return apiRequest("PATCH", `/api/footer-links/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/footer-links"] });
      setLinkDialogOpen(false);
      toast({ title: "Footer Link Updated" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (id: number) => {
      return apiRequest("DELETE", `/api/footer-links/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/footer-links"] });
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      setDeleteConfirm(null);
      toast({ title: "Footer link and its page deleted" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleLinkSubmit = () => {
    const slug = toSlug(linkSlug);
    const nextSort = editingLink ? (editingLink.sortOrder ?? 0) : (footerLinks || []).length;
    const data = { label: linkLabel, pageSlug: slug, sortOrder: nextSort };
    if (editingLink) {
      updateLinkMutation.mutate({ id: editingLink.id, data });
    } else {
      createLinkMutation.mutate(data);
    }
  };

  const sortedLinks = [...(footerLinks || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const swapLinks = (idx: number, direction: "up" | "down") => {
    const targetIdx = direction === "up" ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= sortedLinks.length) return;
    const linkA = sortedLinks[idx];
    const linkB = sortedLinks[targetIdx];
    const sortA = linkA.sortOrder ?? 0;
    const sortB = linkB.sortOrder ?? 0;
    updateLinkMutation.mutate({ id: linkA.id, data: { sortOrder: sortB } });
    updateLinkMutation.mutate({ id: linkB.id, data: { sortOrder: sortA } });
  };

  if (linksLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Footer Links</h3>
            <p className="text-muted-foreground text-sm">Add links to the bottom bar. Each link automatically creates an editable page. To edit page content, visit the page and click the Edit button.</p>
          </div>
          <Button onClick={openCreateLink} data-testid="button-add-footer-link">
            <Plus className="w-4 h-4 mr-2" />
            Add Link
          </Button>
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Order</TableHead>
                <TableHead>Label</TableHead>
                <TableHead>Page</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedLinks.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No footer links yet. Add one above.
                  </TableCell>
                </TableRow>
              )}
              {sortedLinks.map((link, idx) => (
                <TableRow key={link.id} data-testid={`row-footer-link-${link.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={idx === 0}
                        onClick={() => swapLinks(idx, "up")}
                        data-testid={`button-move-up-link-${link.id}`}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={idx === sortedLinks.length - 1}
                        onClick={() => swapLinks(idx, "down")}
                        data-testid={`button-move-down-link-${link.id}`}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{link.label}</TableCell>
                  <TableCell className="text-muted-foreground">/page/{link.pageSlug}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditLink(link)} data-testid={`button-edit-link-${link.id}`}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {deleteConfirm === link.id ? (
                        <div className="flex items-center gap-1">
                          <Button variant="destructive" size="sm" onClick={() => deleteLinkMutation.mutate(link.id)} data-testid={`button-confirm-delete-link-${link.id}`}>
                            Confirm
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeleteConfirm(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirm(link.id)} data-testid={`button-delete-link-${link.id}`}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLink ? "Edit Footer Link" : "Add Footer Link"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Label</Label>
              <Input value={linkLabel} onChange={(e) => handleLabelChange(e.target.value)} placeholder="e.g. About" data-testid="input-link-label" />
            </div>
            <div className="space-y-2">
              <Label>Page Slug</Label>
              <Input value={linkSlug} onChange={(e) => setLinkSlug(e.target.value)} placeholder="e.g. about" data-testid="input-link-slug" />
              <p className="text-xs text-muted-foreground">
                {editingLink
                  ? "The URL path for this page."
                  : "Auto-generated from label. A new editable page will be created at /page/" + (linkSlug || "...")}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleLinkSubmit} disabled={!linkLabel.trim() || !linkSlug.trim() || createLinkMutation.isPending || updateLinkMutation.isPending} data-testid="button-save-link">
              {createLinkMutation.isPending || updateLinkMutation.isPending ? "Saving..." : editingLink ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CollectionPhrasesTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: phrases, isLoading } = useQuery<CollectionPhrase[]>({
    queryKey: ["/api/collection-phrases"],
  });
  const [editingPhrase, setEditingPhrase] = useState<CollectionPhrase | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formPhrase, setFormPhrase] = useState("");
  const [formIcon, setFormIcon] = useState("CheckCircle");
  const [formHue, setFormHue] = useState(120);
  const [formSaturation, setFormSaturation] = useState(20);
  const [formLightness, setFormLightness] = useState(40);

  const statuses = ["drinking", "want_to_try", "not_rebuying"];

  const openEdit = (p: CollectionPhrase) => {
    setEditingPhrase(p);
    setFormPhrase(p.phrase);
    setFormIcon(p.icon);
    setFormHue(p.colorHue);
    setFormSaturation(p.colorSaturation);
    setFormLightness(p.colorLightness);
    setDialogOpen(true);
  };

  const updateMutation = useMutation({
    mutationFn: async (data: { ownerStatus: string; visitorStatus: string; phrase: string; icon: string; colorHue: number; colorSaturation: number; colorLightness: number }) => {
      return apiRequest("PATCH", "/api/collection-phrases", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/collection-phrases"] });
      setDialogOpen(false);
      toast({ title: "Phrase Updated" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!editingPhrase) return;
    updateMutation.mutate({
      ownerStatus: editingPhrase.ownerStatus,
      visitorStatus: editingPhrase.visitorStatus,
      phrase: formPhrase,
      icon: formIcon,
      colorHue: formHue,
      colorSaturation: formSaturation,
      colorLightness: formLightness,
    });
  };

  const getPhrase = (ownerStatus: string, visitorStatus: string) => {
    return phrases?.find(p => p.ownerStatus === ownerStatus && p.visitorStatus === visitorStatus);
  };

  const previewBg = `hsla(${formHue}, ${formSaturation}%, ${formLightness}%, 0.1)`;
  const previewFg = `hsl(${formHue}, ${formSaturation}%, ${formLightness}%)`;
  const previewBorder = `hsla(${formHue}, ${formSaturation}%, ${formLightness}%, 0.2)`;
  const PreviewIcon = ICON_MAP[formIcon] || CheckCircle;

  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">Customize the phrases shown when a visitor sees a tea that&apos;s also in their own collection. Each combination of the list owner&apos;s status and the visitor&apos;s status can have its own phrase, icon, and color. Leave a phrase blank to hide the badge for that combination.</p>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Owner&apos;s List</TableHead>
              <TableHead>Visitor&apos;s List</TableHead>
              <TableHead>Phrase</TableHead>
              <TableHead>Preview</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {statuses.map(ownerStatus =>
              statuses.map(visitorStatus => {
                const p = getPhrase(ownerStatus, visitorStatus);
                const IconComp = p ? (ICON_MAP[p.icon] || CheckCircle) : CheckCircle;
                const hasBadge = p && p.phrase;
                return (
                  <TableRow key={`${ownerStatus}-${visitorStatus}`} data-testid={`row-phrase-${ownerStatus}-${visitorStatus}`}>
                    <TableCell className="text-sm font-medium">{STATUS_LABELS[ownerStatus]}</TableCell>
                    <TableCell className="text-sm font-medium">{STATUS_LABELS[visitorStatus]}</TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                      {p?.phrase || <span className="italic">Empty (hidden)</span>}
                    </TableCell>
                    <TableCell>
                      {hasBadge ? (
                        <Badge variant="outline" className="px-2 py-0 h-5 text-[10px] rounded-full whitespace-nowrap" style={{
                          backgroundColor: `hsla(${p.colorHue}, ${p.colorSaturation}%, ${p.colorLightness}%, 0.1)`,
                          color: `hsl(${p.colorHue}, ${p.colorSaturation}%, ${p.colorLightness}%)`,
                          borderColor: `hsla(${p.colorHue}, ${p.colorSaturation}%, ${p.colorLightness}%, 0.2)`,
                        }}>
                          <IconComp className="w-3 h-3 mr-1" />
                          {p.phrase}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No badge</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => {
                        const phraseData = p || { id: 0, ownerStatus, visitorStatus, phrase: "", colorHue: 120, colorSaturation: 20, colorLightness: 40, icon: "CheckCircle" };
                        openEdit(phraseData as CollectionPhrase);
                      }} data-testid={`button-edit-phrase-${ownerStatus}-${visitorStatus}`}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Phrase: {editingPhrase ? `${STATUS_LABELS[editingPhrase.ownerStatus]} / ${STATUS_LABELS[editingPhrase.visitorStatus]}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Phrase</Label>
              <Input value={formPhrase} onChange={(e) => setFormPhrase(e.target.value)} placeholder="Leave empty to hide badge" data-testid="input-phrase-text" />
              <p className="text-xs text-muted-foreground">Leave blank to hide the badge for this combination.</p>
            </div>

            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={formIcon} onValueChange={setFormIcon}>
                <SelectTrigger data-testid="select-phrase-icon">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ICON_NAMES.map(name => {
                    const Ic = ICON_MAP[name];
                    return (
                      <SelectItem key={name} value={name}>
                        <span className="flex items-center gap-2">
                          <Ic className="w-4 h-4" />
                          {name}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Palette className="w-4 h-4" /> Color Preview
              </Label>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="px-2 py-0 h-5 text-[10px] rounded-full" style={{ backgroundColor: previewBg, color: previewFg, borderColor: previewBorder }}>
                  <PreviewIcon className="w-3 h-3 mr-1" />
                  {formPhrase || "Preview"}
                </Badge>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Hue ({formHue})</Label>
              <input type="range" min="0" max="360" value={formHue} onChange={(e) => setFormHue(Number(e.target.value))} className="w-full accent-primary" data-testid="slider-phrase-hue" />
            </div>
            <div className="space-y-2">
              <Label>Saturation ({formSaturation}%)</Label>
              <input type="range" min="0" max="100" value={formSaturation} onChange={(e) => setFormSaturation(Number(e.target.value))} className="w-full accent-primary" data-testid="slider-phrase-saturation" />
            </div>
            <div className="space-y-2">
              <Label>Lightness ({formLightness}%)</Label>
              <input type="range" min="10" max="90" value={formLightness} onChange={(e) => setFormLightness(Number(e.target.value))} className="w-full accent-primary" data-testid="slider-phrase-lightness" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={updateMutation.isPending} data-testid="button-save-phrase">
              {updateMutation.isPending ? "Saving..." : "Update"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function AdminPage() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary/30" />
      </div>
    );
  }

  if (!user) {
    setLocation("/auth");
    return null;
  }

  if (user.role !== "admin") {
    setLocation("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-destructive/10 p-3 rounded-full text-destructive">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage users, tea types, and site branding.</p>
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList data-testid="tabs-admin" className="flex-wrap">
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="tea-types" data-testid="tab-tea-types">Tea Types</TabsTrigger>
            <TabsTrigger value="scoring" data-testid="tab-scoring">Scoring</TabsTrigger>
            <TabsTrigger value="branding" data-testid="tab-branding">Branding</TabsTrigger>
            <TabsTrigger value="phrases" data-testid="tab-phrases">Collection Phrases</TabsTrigger>
            <TabsTrigger value="bottom-bar" data-testid="tab-bottom-bar">Bottom Bar</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersTab user={user} />
          </TabsContent>

          <TabsContent value="tea-types">
            <TeaTypesTab />
          </TabsContent>

          <TabsContent value="scoring">
            <ScoringSystemsTab />
          </TabsContent>

          <TabsContent value="branding">
            <BrandingTab />
          </TabsContent>

          <TabsContent value="phrases">
            <CollectionPhrasesTab />
          </TabsContent>

          <TabsContent value="bottom-bar">
            <BottomBarTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
