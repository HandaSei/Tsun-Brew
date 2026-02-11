import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type User } from "@shared/routes";
import { useAuth } from "@/hooks/use-auth";
import { Navigation } from "@/components/Navigation";
import { Loader2, ShieldAlert, Plus, Pencil, Trash2, Palette } from "lucide-react";
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
import type { TeaType, SiteSettings } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

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

function BrandingTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
  });

  const [siteName, setSiteName] = useState("");
  const [statusTag, setStatusTag] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [fontFamily, setFontFamily] = useState("");

  useEffect(() => {
    if (settings) {
      setSiteName(settings.siteName || "");
      setStatusTag(settings.statusTag || "");
      setLogoUrl(settings.logoUrl || "");
      setFontFamily(settings.fontFamily || "");
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

  const handleSave = () => {
    updateMutation.mutate({ siteName, statusTag, logoUrl, fontFamily });
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
          <Label>Display Font</Label>
          <Input value={fontFamily} onChange={(e) => setFontFamily(e.target.value)} placeholder="Cormorant Garamond" data-testid="input-font-family" />
          <p className="text-xs text-muted-foreground">Google Font name for display headings. Must be a valid Google Fonts family name.</p>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-branding">
            {updateMutation.isPending ? "Saving..." : "Save Branding"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (user && user.role !== "admin") {
    setLocation("/");
    return null;
  }

  if (!user) return null;

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
          <TabsList data-testid="tabs-admin">
            <TabsTrigger value="users" data-testid="tab-users">Users</TabsTrigger>
            <TabsTrigger value="tea-types" data-testid="tab-tea-types">Tea Types</TabsTrigger>
            <TabsTrigger value="branding" data-testid="tab-branding">Branding</TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <UsersTab user={user} />
          </TabsContent>

          <TabsContent value="tea-types">
            <TeaTypesTab />
          </TabsContent>

          <TabsContent value="branding">
            <BrandingTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
