import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type User } from "@shared/routes";
import { useAuth } from "@/hooks/use-auth";
import { Navigation } from "@/components/Navigation";
import { Loader2, ShieldAlert, Plus, Pencil, Trash2, Palette, Link as LinkIcon } from "lucide-react";
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
import type { TeaType, SiteSettings, FooterLink, Page } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";
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
  const [displayFont, setDisplayFont] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");

  useEffect(() => {
    if (settings) {
      setSiteName(settings.siteName || "");
      setStatusTag(settings.statusTag || "");
      setLogoUrl(settings.logoUrl || "");
      setDisplayFont(settings.displayFont || "");
      setFaviconUrl(settings.faviconUrl || "");
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
    updateMutation.mutate({ siteName, statusTag, logoUrl, displayFont, faviconUrl });
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
    </div>
  );
}

function BottomBarTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: footerLinks, isLoading: linksLoading } = useQuery<FooterLink[]>({
    queryKey: ["/api/footer-links"],
  });

  const { data: allPages, isLoading: pagesLoading } = useQuery<Page[]>({
    queryKey: ["/api/pages"],
  });

  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<FooterLink | null>(null);
  const [linkLabel, setLinkLabel] = useState("");
  const [linkSlug, setLinkSlug] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const [pageDialogOpen, setPageDialogOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<Page | null>(null);
  const [pageTitle, setPageTitle] = useState("");
  const [pageSlug, setPageSlug] = useState("");
  const [pageContent, setPageContent] = useState("");
  const [deletePageConfirm, setDeletePageConfirm] = useState<string | null>(null);

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

  const openCreatePage = () => {
    setEditingPage(null);
    setPageTitle("");
    setPageSlug("");
    setPageContent("");
    setPageDialogOpen(true);
  };

  const openEditPage = (page: Page) => {
    setEditingPage(page);
    setPageTitle(page.title);
    setPageSlug(page.slug);
    setPageContent(page.content);
    setPageDialogOpen(true);
  };

  const createLinkMutation = useMutation({
    mutationFn: async (data: { label: string; pageSlug: string; sortOrder?: number }) => {
      return apiRequest("POST", "/api/footer-links", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/footer-links"] });
      setLinkDialogOpen(false);
      toast({ title: "Footer Link Created" });
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
      setDeleteConfirm(null);
      toast({ title: "Footer Link Deleted" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const createPageMutation = useMutation({
    mutationFn: async (data: { slug: string; title: string; content: string }) => {
      return apiRequest("POST", "/api/pages", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      setPageDialogOpen(false);
      toast({ title: "Page Created" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const updatePageMutation = useMutation({
    mutationFn: async ({ slug, data }: { slug: string; data: Partial<{ title: string; content: string }> }) => {
      return apiRequest("PATCH", `/api/pages/${slug}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      setPageDialogOpen(false);
      toast({ title: "Page Updated" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deletePageMutation = useMutation({
    mutationFn: async (slug: string) => {
      return apiRequest("DELETE", `/api/pages/${slug}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages"] });
      queryClient.invalidateQueries({ queryKey: ["/api/footer-links"] });
      setDeletePageConfirm(null);
      toast({ title: "Page Deleted" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const handleLinkSubmit = () => {
    const data = { label: linkLabel, pageSlug: linkSlug, sortOrder: 0 };
    if (editingLink) {
      updateLinkMutation.mutate({ id: editingLink.id, data });
    } else {
      createLinkMutation.mutate(data);
    }
  };

  const handlePageSubmit = () => {
    const slug = pageSlug.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
    if (editingPage) {
      updatePageMutation.mutate({ slug: editingPage.slug, data: { title: pageTitle, content: pageContent } });
    } else {
      createPageMutation.mutate({ slug, title: pageTitle, content: pageContent });
    }
  };

  const autoSlug = (title: string) => {
    setPageTitle(title);
    if (!editingPage) {
      setPageSlug(title.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, ""));
    }
  };

  const isLoading = linksLoading || pagesLoading;
  if (isLoading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Footer Links</h3>
            <p className="text-muted-foreground text-sm">Links displayed in the bottom bar. Each links to a page.</p>
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
                <TableHead>Label</TableHead>
                <TableHead>Page Slug</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(footerLinks || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                    No footer links yet. Add one above.
                  </TableCell>
                </TableRow>
              )}
              {(footerLinks || []).map((link) => (
                <TableRow key={link.id} data-testid={`row-footer-link-${link.id}`}>
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

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold">Pages</h3>
            <p className="text-muted-foreground text-sm">Create and manage simple content pages. Link them in the footer above.</p>
          </div>
          <Button onClick={openCreatePage} data-testid="button-add-page">
            <Plus className="w-4 h-4 mr-2" />
            New Page
          </Button>
        </div>

        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(allPages || []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                    No pages yet. Create one above.
                  </TableCell>
                </TableRow>
              )}
              {(allPages || []).map((page) => (
                <TableRow key={page.id} data-testid={`row-page-${page.slug}`}>
                  <TableCell className="font-medium">{page.title}</TableCell>
                  <TableCell className="text-muted-foreground">/page/{page.slug}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {page.updatedAt ? new Date(page.updatedAt).toLocaleDateString() : "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEditPage(page)} data-testid={`button-edit-page-${page.slug}`}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {deletePageConfirm === page.slug ? (
                        <div className="flex items-center gap-1">
                          <Button variant="destructive" size="sm" onClick={() => deletePageMutation.mutate(page.slug)} data-testid={`button-confirm-delete-page-${page.slug}`}>
                            Confirm
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setDeletePageConfirm(null)}>
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button variant="ghost" size="icon" onClick={() => setDeletePageConfirm(page.slug)} data-testid={`button-delete-page-${page.slug}`}>
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
              <Input value={linkLabel} onChange={(e) => setLinkLabel(e.target.value)} placeholder="e.g. About" data-testid="input-link-label" />
            </div>
            <div className="space-y-2">
              <Label>Page Slug</Label>
              <Input value={linkSlug} onChange={(e) => setLinkSlug(e.target.value)} placeholder="e.g. about" data-testid="input-link-slug" />
              <p className="text-xs text-muted-foreground">The page this link points to. Must match an existing page slug.</p>
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

      <Dialog open={pageDialogOpen} onOpenChange={setPageDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPage ? "Edit Page" : "Create New Page"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={pageTitle} onChange={(e) => autoSlug(e.target.value)} placeholder="e.g. About Us" data-testid="input-page-title" />
            </div>
            {!editingPage && (
              <div className="space-y-2">
                <Label>Slug</Label>
                <Input value={pageSlug} onChange={(e) => setPageSlug(e.target.value)} placeholder="e.g. about-us" data-testid="input-page-slug" />
                <p className="text-xs text-muted-foreground">URL-friendly name. Auto-generated from title. Will be accessible at /page/{pageSlug || "..."}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={pageContent}
                onChange={(e) => setPageContent(e.target.value)}
                placeholder="Write the page content here..."
                rows={12}
                className="font-mono text-sm"
                data-testid="textarea-page-content"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPageDialogOpen(false)}>Cancel</Button>
            <Button onClick={handlePageSubmit} disabled={!pageTitle.trim() || (!editingPage && !pageSlug.trim()) || createPageMutation.isPending || updatePageMutation.isPending} data-testid="button-save-page">
              {createPageMutation.isPending || updatePageMutation.isPending ? "Saving..." : editingPage ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
            <TabsTrigger value="bottom-bar" data-testid="tab-bottom-bar">Bottom Bar</TabsTrigger>
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

          <TabsContent value="bottom-bar">
            <BottomBarTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
