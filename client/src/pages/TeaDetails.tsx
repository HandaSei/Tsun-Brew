import { useRoute, Link } from "wouter";
import { useTea, useTeaBySlug, useUpdateTea, useTeaGrades, useCreateTeaGrade, useUpdateTeaGrade, useDeleteTeaGrade } from "@/hooks/use-teas";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Tabs kept for edit dialog only
import { BrewTimer, type BrewTimerHandle } from "@/components/BrewTimer";
import { AuthModal } from "@/components/AuthModal";
import { useUpdateLog, useLogs } from "@/hooks/use-logs";
import { 
  Loader2, 
  Leaf, 
  MapPin, 
  BookOpen, 
  Star,
  Plus,
  Settings,
  Edit2,
  X,
  RotateCcw,
  Tag,
  ChevronDown,
  Award,
  Trash2,
  GripVertical
} from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import type { TeaGrade } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CultivarSelect } from "@/components/CultivarSelect";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertTeaSchema } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useTeaTypes, getTeaTypeColor } from "@/hooks/use-tea-types";
import { ScoreWidget } from "@/components/ScoreWidget";
import { DialogDescription } from "@/components/ui/dialog";

const MAX_VISIBLE_CULTIVARS = 5;

function CultivarTags({ cultivars }: { cultivars: string[] | null }) {
  const [showAll, setShowAll] = useState(false);

  if (!cultivars || cultivars.length === 0) return null;

  const visible = cultivars.slice(0, MAX_VISIBLE_CULTIVARS);
  const hidden = cultivars.slice(MAX_VISIBLE_CULTIVARS);

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 flex-wrap" data-testid="cultivar-tags">
        <Tag className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        {visible.map((name) => (
          <Link
            key={name}
            href={`/browse?cultivars=${encodeURIComponent(name.toLowerCase())}`}
            data-testid={`cultivar-tag-${name}`}
          >
            <Badge
              variant="secondary"
              className="cursor-pointer text-xs"
            >
              {name}
            </Badge>
          </Link>
        ))}
        {hidden.length > 0 && (
          <button
            onClick={() => setShowAll(true)}
            className="text-xs text-primary font-medium hover:underline"
            data-testid="button-show-all-cultivars"
          >
            +{hidden.length} more
          </button>
        )}
      </div>

      <Dialog open={showAll} onOpenChange={setShowAll}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>All Cultivars</DialogTitle>
            <DialogDescription className="sr-only">Full list of cultivars for this tea</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {cultivars.map((name) => (
              <Link
                key={name}
                href={`/browse?cultivars=${encodeURIComponent(name.toLowerCase())}`}
                onClick={() => setShowAll(false)}
                data-testid={`cultivar-dialog-tag-${name}`}
              >
                <Badge
                  variant="secondary"
                  className="cursor-pointer text-sm"
                >
                  {name}
                </Badge>
              </Link>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function TeaDetails() {
  const [, teaParams] = useRoute("/tea/:slug");
  const [, customParams] = useRoute("/custom-tea/:slug");
  const slug = teaParams?.slug || customParams?.slug || "";
  const { data: tea, isLoading } = useTeaBySlug(slug);
  const { data: logs } = useLogs();
  const { user } = useAuth();
  const updateLog = useUpdateLog();
  const updateTea = useUpdateTea();
  const { toast } = useToast();
  const { data: teaTypes } = useTeaTypes();
  const [isEditing, setIsEditing] = useState(false);
  const [listSelectOpen, setListSelectOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [timerSettingsOpen, setTimerSettingsOpen] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<TeaGrade | null>(null);
  const [gradeRestored, setGradeRestored] = useState(false);
  const [gradeImageOpen, setGradeImageOpen] = useState<TeaGrade | null>(null);
  const [showAllGrades, setShowAllGrades] = useState(false);
  const [editGradeOpen, setEditGradeOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<TeaGrade | null>(null);
  const [newGradeName, setNewGradeName] = useState("");
  const [newGradePhoto, setNewGradePhoto] = useState("");
  const [newGradeDescription, setNewGradeDescription] = useState("");
  const brewTimerRef = useRef<BrewTimerHandle>(null);

  const { data: teaGrades } = useTeaGrades(tea?.id || 0);
  const createGrade = useCreateTeaGrade();
  const updateGrade = useUpdateTeaGrade();
  const deleteGrade = useDeleteTeaGrade();

  const teaLog = logs?.find(l => l.teaId === tea?.id);
  const isAdmin = user?.role === 'admin' || user?.role === 'mod';
  const userPrefs = (teaLog?.timerSettings as any) || {};
  
  const [userHideOriental, setUserHideOriental] = useState(false);
  const [userHideOccidental, setUserHideOccidental] = useState(false);
  const [userHideParams, setUserHideParams] = useState(false);
  const [userNote, setUserNote] = useState("");
  const [userShowNote, setUserShowNote] = useState(false);

  useEffect(() => {
    if (teaLog?.timerSettings) {
      const prefs = teaLog.timerSettings as any;
      setUserHideOriental(!!prefs.hideOriental);
      setUserHideOccidental(!!prefs.hideOccidental);
      setUserHideParams(!!prefs.hideParams);
      setUserNote(prefs.userNote || "");
      setUserShowNote(!!prefs.showUserNote);
    }
  }, [teaLog?.timerSettings]);

  useEffect(() => {
    if (gradeRestored || !teaGrades || teaGrades.length === 0) return;
    const savedGradeId = (teaLog?.timerSettings as any)?.selectedGradeId;
    if (savedGradeId) {
      const found = teaGrades.find((g: any) => g.id === savedGradeId);
      if (found) setSelectedGrade(found);
    }
    setGradeRestored(true);
  }, [teaGrades, teaLog, gradeRestored]);

  const form = useForm({
    resolver: zodResolver(insertTeaSchema.partial()),
    defaultValues: {
      name: "",
      type: "",
      description: "",
      origin: "",
      cultivar: [],
      photoUrl: "",
      recommendedTemp: undefined,
      recommendedDuration: undefined,
      orientalTemp: undefined,
      orientalDuration: undefined,
      orientalInfusionIncrement: undefined,
      orientalMaxInfusions: undefined,
      occidentalTemp: undefined,
      occidentalDuration: undefined,
      occidentalInfusions: undefined,
      washingStep: false,
      washingDuration: undefined,
      orientalLeafAmount: "",
      orientalWaterAmount: "",
      occidentalLeafAmount: "",
      occidentalWaterAmount: "",
      showOriental: true,
      showOccidental: true,
      orientalTimerEnabled: true,
      occidentalTimerEnabled: true,
      brewingNote: "",
      showBrewingNote: false,
    }
  });

  useEffect(() => {
    if (tea) {
      form.reset({
        name: tea.name,
        type: tea.type,
        description: tea.description,
        origin: tea.origin || "",
        cultivar: tea.cultivar || [],
        photoUrl: tea.photoUrl || "",
        recommendedTemp: tea.recommendedTemp ?? undefined,
        recommendedDuration: tea.recommendedDuration ?? undefined,
        orientalTemp: tea.orientalTemp ?? undefined,
        orientalDuration: tea.orientalDuration ?? undefined,
        orientalInfusionIncrement: tea.orientalInfusionIncrement ?? undefined,
        orientalMaxInfusions: tea.orientalMaxInfusions ?? undefined,
        occidentalTemp: tea.occidentalTemp ?? undefined,
        occidentalDuration: tea.occidentalDuration ?? undefined,
        occidentalInfusions: tea.occidentalInfusions ?? undefined,
        washingStep: !!tea.washingStep,
        washingDuration: tea.washingDuration ?? undefined,
        orientalLeafAmount: tea.orientalLeafAmount || "",
        orientalWaterAmount: tea.orientalWaterAmount || "",
        occidentalLeafAmount: tea.occidentalLeafAmount || "",
        occidentalWaterAmount: tea.occidentalWaterAmount || "",
        showOriental: tea.showOriental !== false,
        showOccidental: tea.showOccidental !== false,
        orientalTimerEnabled: tea.orientalTimerEnabled !== false,
        occidentalTimerEnabled: tea.occidentalTimerEnabled !== false,
        brewingNote: tea.brewingNote || "",
        showBrewingNote: !!tea.showBrewingNote,
      });
    }
  }, [tea, form]);

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

  if (!tea) return <div>Not found</div>;

  const handleAddToList = (status: string) => {
    updateLog.mutate({
      teaId: tea.id,
      status
    });
    setListSelectOpen(false);
  };

  const onEditSubmit = (data: any) => {
    updateTea.mutate({ id: tea.id, ...data }, {
      onSuccess: () => {
        setIsEditing(false);
        toast({ title: "Success", description: "Tea updated successfully" });
      },
      onError: (err: any) => {
        console.error("Update error:", err);
        toast({ title: "Error", description: err.message || "Failed to update tea", variant: "destructive" });
      }
    });
  };

  const personalSettings = teaLog?.timerSettings as any;
  const method = personalSettings?.method || 'oriental';
  
  const initialSeconds = personalSettings?.duration || 
    (method === 'oriental' ? tea.orientalDuration : tea.occidentalDuration) || 
    tea.recommendedDuration || 60;
    
  const initialTemp = personalSettings?.temp || 
    (method === 'oriental' ? tea.orientalTemp : tea.occidentalTemp) || 
    tea.recommendedTemp || 85;

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      <Navigation />
      
      <div className="glass-card relative overflow-hidden rounded-none border-t-0 border-x-0">
        <div className="container mx-auto px-4 py-4 md:py-8 relative">
          <div className="flex flex-col md:flex-row gap-4 md:gap-6 items-start">
            <div className="w-full max-w-[340px] aspect-square rounded-md bg-primary/20 relative shrink-0 group mx-auto md:mx-0" style={{ perspective: '800px' }}>
              <div className="w-full h-full rounded-md overflow-hidden shadow-2xl shadow-foreground/10 transition-transform duration-500 ease-out group-hover:[transform:rotateY(-4deg)_rotateX(2deg)_scale(1.02)]" style={{ transformStyle: 'preserve-3d' }}>
              {tea.photoUrl ? (
                <img src={tea.photoUrl} alt={tea.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-primary/20">
                  <Leaf className="w-24 h-24" />
                </div>
              )}
              </div>
              <div className="absolute -bottom-2 left-2 right-2 h-4 rounded-md bg-foreground/5 blur-md" />
            </div>

            <div className="flex-1 space-y-2 w-full pt-2">
              <div className="flex items-center justify-between w-full gap-3">
                <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold shadow-sm" style={getTeaTypeColor(teaTypes, tea.type, tea as any).style}>{tea.type}</span>
                
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Dialog open={isEditing} onOpenChange={setIsEditing}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" data-testid="button-edit-tea">
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="text-2xl">Edit Tea Details</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-6 pt-4">
                            <Tabs defaultValue="general" className="w-full">
                              <TabsList className="grid w-full grid-cols-4 mb-6">
                                <TabsTrigger value="general">General</TabsTrigger>
                                <TabsTrigger value="oriental">Oriental</TabsTrigger>
                                <TabsTrigger value="occidental">Occidental</TabsTrigger>
                                <TabsTrigger value="grades">Tea Grades</TabsTrigger>
                              </TabsList>

                              <TabsContent value="general" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Name</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                          <FormControl>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {(teaTypes || []).map(t => (
                                              <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <FormField
                                  control={form.control}
                                  name="description"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Description</FormLabel>
                                      <FormControl><Textarea {...field} className="min-h-[100px]" /></FormControl>
                                    </FormItem>
                                  )}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="origin"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Origin</FormLabel>
                                        <FormControl><Input {...field} /></FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="cultivar"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Cultivar</FormLabel>
                                        <FormControl>
                                          <CultivarSelect
                                            value={field.value || []}
                                            onChange={field.onChange}
                                            placeholder="Select cultivars..."
                                          />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <FormField
                                  control={form.control}
                                  name="photoUrl"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Photo URL</FormLabel>
                                      <FormControl><Input {...field} /></FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TabsContent>

                              <TabsContent value="oriental" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="orientalTemp"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Temp (°C)</FormLabel>
                                        <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="orientalDuration"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Base Duration (s)</FormLabel>
                                        <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="orientalInfusionIncrement"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Increment (s)</FormLabel>
                                        <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="orientalMaxInfusions"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Max Infusions</FormLabel>
                                        <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                              </TabsContent>

                              <TabsContent value="occidental" className="space-y-4">
                                <div className="space-y-4">
                                  <FormLabel>Infusion Durations (seconds)</FormLabel>
                                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {(form.watch("occidentalInfusions" as any) || []).map((_: any, index: number) => (
                                      <div key={index} className="flex items-center gap-1">
                                        <Input
                                          type="number"
                                          className="h-8 text-xs"
                                          value={form.watch(`occidentalInfusions.${index}` as any)}
                                          onChange={e => {
                                            const current = [...form.getValues("occidentalInfusions" as any)];
                                            current[index] = parseInt(e.target.value);
                                            form.setValue("occidentalInfusions" as any, current);
                                          }}
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-6 w-6"
                                          onClick={() => {
                                            const current = [...form.getValues("occidentalInfusions" as any)];
                                            current.splice(index, 1);
                                            form.setValue("occidentalInfusions" as any, current);
                                          }}
                                        >
                                          <X className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    ))}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs"
                                      onClick={() => {
                                        const current = form.getValues("occidentalInfusions" as any) || [];
                                        form.setValue("occidentalInfusions" as any, [...current, 180]);
                                      }}
                                    >
                                      <Plus className="w-3 h-3 mr-1" /> Add
                                    </Button>
                                  </div>
                                </div>
                                <FormField
                                  control={form.control}
                                  name="occidentalTemp"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Temp (°C)</FormLabel>
                                      <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                                    </FormItem>
                                  )}
                                />
                              </TabsContent>

                              <TabsContent value="grades" className="space-y-4">
                                <div className="space-y-3">
                                  {teaGrades?.map((grade) => (
                                    <div key={grade.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                      <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0">
                                        {grade.photoUrl ? (
                                          <img src={grade.photoUrl} alt={grade.name} className="w-full h-full object-cover" />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                            <Leaf className="w-5 h-5" />
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm truncate">{grade.name}</p>
                                        {grade.description && <p className="text-xs text-muted-foreground truncate">{grade.description}</p>}
                                      </div>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0"
                                        onClick={() => {
                                          setEditingGrade(grade);
                                          setNewGradeName(grade.name);
                                          setNewGradePhoto(grade.photoUrl || "");
                                          setNewGradeDescription(grade.description || "");
                                          setEditGradeOpen(true);
                                        }}
                                        data-testid={`button-edit-grade-${grade.id}`}
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="shrink-0 text-destructive"
                                        onClick={() => {
                                          if (confirm(`Delete grade "${grade.name}"?`)) {
                                            deleteGrade.mutate({ id: grade.id, teaId: tea.id });
                                          }
                                        }}
                                        data-testid={`button-delete-grade-${grade.id}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                                <Separator />
                                <div className="space-y-3">
                                  <h4 className="text-sm font-semibold">{editingGrade ? "Edit Grade" : "Add New Grade"}</h4>
                                  <Input
                                    placeholder="Grade name"
                                    value={newGradeName}
                                    onChange={e => setNewGradeName(e.target.value)}
                                    data-testid="input-grade-name"
                                  />
                                  <Input
                                    placeholder="Photo URL"
                                    value={newGradePhoto}
                                    onChange={e => setNewGradePhoto(e.target.value)}
                                    data-testid="input-grade-photo"
                                  />
                                  <Textarea
                                    placeholder="Description (optional)"
                                    value={newGradeDescription}
                                    onChange={e => setNewGradeDescription(e.target.value)}
                                    className="min-h-[60px]"
                                    data-testid="input-grade-description"
                                  />
                                  <div className="flex gap-2">
                                    <Button
                                      type="button"
                                      className="flex-1"
                                      disabled={!newGradeName.trim() || createGrade.isPending || updateGrade.isPending}
                                      onClick={() => {
                                        if (editingGrade) {
                                          updateGrade.mutate({
                                            id: editingGrade.id,
                                            teaId: tea.id,
                                            name: newGradeName.trim(),
                                            photoUrl: newGradePhoto.trim() || undefined,
                                            description: newGradeDescription.trim() || undefined,
                                          }, {
                                            onSuccess: () => {
                                              setEditingGrade(null);
                                              setNewGradeName("");
                                              setNewGradePhoto("");
                                              setNewGradeDescription("");
                                              toast({ title: "Updated", description: "Grade updated." });
                                            }
                                          });
                                        } else {
                                          createGrade.mutate({
                                            teaId: tea.id,
                                            name: newGradeName.trim(),
                                            photoUrl: newGradePhoto.trim() || undefined,
                                            description: newGradeDescription.trim() || undefined,
                                            sortOrder: (teaGrades?.length || 0),
                                          }, {
                                            onSuccess: () => {
                                              setNewGradeName("");
                                              setNewGradePhoto("");
                                              setNewGradeDescription("");
                                              toast({ title: "Created", description: "New grade added." });
                                            }
                                          });
                                        }
                                      }}
                                      data-testid="button-save-grade"
                                    >
                                      {editingGrade ? "Update Grade" : "Add Grade"}
                                    </Button>
                                    {editingGrade && (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => {
                                          setEditingGrade(null);
                                          setNewGradeName("");
                                          setNewGradePhoto("");
                                          setNewGradeDescription("");
                                        }}
                                      >
                                        Cancel
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </TabsContent>
                            </Tabs>
                            <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={updateTea.isPending}>
                              {updateTea.isPending ? "Saving..." : "Save Changes"}
                            </Button>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                  )}
                  {user && (
                    teaLog ? (
                      <Dialog open={listSelectOpen} onOpenChange={setListSelectOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="default" className="gap-2" data-testid="button-change-status">
                            <Edit2 className="w-4 h-4" />
                            {teaLog.status === "drinking" ? "Drinking" : teaLog.status === "want_to_try" ? "Want to Try" : "Not Rebuying"}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm">
                          <DialogHeader>
                            <DialogTitle>Change status</DialogTitle>
                          </DialogHeader>
                          <div className="flex flex-col gap-3 pt-2">
                            <Button
                              variant="outline"
                              className="justify-start gap-3 h-auto py-3 px-4"
                              onClick={() => handleAddToList("drinking")}
                              disabled={updateLog.isPending}
                              data-testid="button-list-drinking"
                            >
                              <Leaf className="w-5 h-5 text-primary" />
                              <div className="text-left">
                                <div className="font-medium">Drinking</div>
                                <div className="text-xs text-muted-foreground">Currently brewing this tea</div>
                              </div>
                            </Button>
                            <Button
                              variant="outline"
                              className="justify-start gap-3 h-auto py-3 px-4"
                              onClick={() => handleAddToList("want_to_try")}
                              disabled={updateLog.isPending}
                              data-testid="button-list-want-to-try"
                            >
                              <Star className="w-5 h-5 text-accent" />
                              <div className="text-left">
                                <div className="font-medium">Want to Try</div>
                                <div className="text-xs text-muted-foreground">On my wishlist</div>
                              </div>
                            </Button>
                            <Button
                              variant="outline"
                              className="justify-start gap-3 h-auto py-3 px-4"
                              onClick={() => handleAddToList("not_rebuying")}
                              disabled={updateLog.isPending}
                              data-testid="button-list-not-rebuying"
                            >
                              <X className="w-5 h-5 text-destructive" />
                              <div className="text-left">
                                <div className="font-medium">Not Rebuying</div>
                                <div className="text-xs text-muted-foreground">Tried it, not for me</div>
                              </div>
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <Dialog open={listSelectOpen} onOpenChange={setListSelectOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="gap-2"
                            disabled={updateLog.isPending}
                            data-testid="button-add-to-list"
                          >
                            <Plus className="w-4 h-4" /> Add to List
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-sm">
                          <DialogHeader>
                            <DialogTitle>Add to which list?</DialogTitle>
                          </DialogHeader>
                          <div className="flex flex-col gap-3 pt-2">
                            <Button
                              variant="outline"
                              className="justify-start gap-3 h-auto py-3 px-4"
                              onClick={() => handleAddToList("drinking")}
                              disabled={updateLog.isPending}
                              data-testid="button-list-drinking"
                            >
                              <Leaf className="w-5 h-5 text-primary" />
                              <div className="text-left">
                                <div className="font-medium">Drinking</div>
                                <div className="text-xs text-muted-foreground">Currently brewing this tea</div>
                              </div>
                            </Button>
                            <Button
                              variant="outline"
                              className="justify-start gap-3 h-auto py-3 px-4"
                              onClick={() => handleAddToList("want_to_try")}
                              disabled={updateLog.isPending}
                              data-testid="button-list-want-to-try"
                            >
                              <Star className="w-5 h-5 text-accent" />
                              <div className="text-left">
                                <div className="font-medium">Want to Try</div>
                                <div className="text-xs text-muted-foreground">On my wishlist</div>
                              </div>
                            </Button>
                            <Button
                              variant="outline"
                              className="justify-start gap-3 h-auto py-3 px-4"
                              onClick={() => handleAddToList("not_rebuying")}
                              disabled={updateLog.isPending}
                              data-testid="button-list-not-rebuying"
                            >
                              <X className="w-5 h-5 text-destructive" />
                              <div className="text-left">
                                <div className="font-medium">Not Rebuying</div>
                                <div className="text-xs text-muted-foreground">Tried it, not for me</div>
                              </div>
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )
                  )}
                  {!user && (
                    <Button variant="outline" size="sm" className="gap-2" onClick={() => setAuthModalOpen(true)} data-testid="button-visitor-add-list">
                      <Plus className="w-4 h-4" /> Sign up to save
                    </Button>
                  )}
                </div>
              </div>

              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-1" data-testid="text-tea-name">{tea.name}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  {tea.origin && (
                    <div className="flex items-center gap-1.5" data-testid="text-origin">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{tea.origin}</span>
                    </div>
                  )}
                </div>
              </div>

              <ScoreWidget teaId={tea.id} />
              {tea.description && (
                <p className="text-base leading-relaxed text-muted-foreground mt-4">{tea.description}</p>
              )}
            </div>
          </div>
          <CultivarTags cultivars={tea.cultivar} />
        </div>
      </div>

      {teaGrades && teaGrades.length > 0 && (
        <div className="container mx-auto px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg flex items-center gap-2" data-testid="text-tea-grades-title">
                  <Award className="w-5 h-5 text-primary" />
                  Tea Grades
                </h3>
              </div>
              <div className="flex flex-wrap gap-3" data-testid="tea-grades-list">
                {(showAllGrades ? teaGrades : teaGrades.slice(0, 5)).map((grade) => (
                  <div
                    key={grade.id}
                    className="flex flex-col items-center gap-1.5 cursor-pointer group"
                    onClick={() => setGradeImageOpen(grade)}
                    data-testid={`tea-grade-${grade.id}`}
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-border/50 group-hover:border-primary/50 transition-colors shadow-sm bg-muted">
                      {grade.photoUrl ? (
                        <img src={grade.photoUrl} alt={grade.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <Leaf className="w-6 h-6" />
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-medium text-center max-w-[72px] truncate">{grade.name}</span>
                  </div>
                ))}
              </div>
              {teaGrades.length > 5 && !showAllGrades && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 w-full gap-1 text-muted-foreground"
                  onClick={() => setShowAllGrades(true)}
                  data-testid="button-show-all-grades"
                >
                  <ChevronDown className="w-4 h-4" />
                  Show all {teaGrades.length} grades
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={!!gradeImageOpen} onOpenChange={(open) => !open && setGradeImageOpen(null)}>
        <DialogContent className="max-w-[70vw] max-h-[80vh] p-2">
          <DialogHeader className="sr-only">
            <DialogTitle>{gradeImageOpen?.name}</DialogTitle>
          </DialogHeader>
          {gradeImageOpen && (
            <div className="flex flex-col items-center gap-3">
              {gradeImageOpen.photoUrl ? (
                <img
                  src={gradeImageOpen.photoUrl}
                  alt={gradeImageOpen.name}
                  className="max-w-full max-h-[60vh] object-contain rounded-lg"
                />
              ) : (
                <div className="w-full aspect-square max-w-md flex items-center justify-center bg-muted rounded-lg">
                  <Leaf className="w-20 h-20 text-muted-foreground" />
                </div>
              )}
              <div className="text-center px-4 pb-2">
                <h4 className="font-display text-xl font-bold">{gradeImageOpen.name}</h4>
                {gradeImageOpen.description && (
                  <p className="text-sm text-muted-foreground mt-1">{gradeImageOpen.description}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <div className="flex items-center justify-between w-full mb-6">
              <h3 className="font-display text-2xl">Brew Timer</h3>
              {user && (
                <Dialog open={timerSettingsOpen} onOpenChange={setTimerSettingsOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" data-testid="button-timer-settings">
                      <Settings className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-sm">
                    <DialogHeader>
                      <DialogTitle>User Preferences</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-muted-foreground">Visibility</h4>
                        <div className="flex items-center justify-between rounded-md border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">Hide Oriental Timer</p>
                            <p className="text-xs text-muted-foreground">Hide the oriental method from your timer</p>
                          </div>
                          <Switch checked={userHideOriental} onCheckedChange={setUserHideOriental} data-testid="switch-user-hide-oriental" />
                        </div>
                        <div className="flex items-center justify-between rounded-md border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">Hide Occidental Timer</p>
                            <p className="text-xs text-muted-foreground">Hide the occidental method from your timer</p>
                          </div>
                          <Switch checked={userHideOccidental} onCheckedChange={setUserHideOccidental} data-testid="switch-user-hide-occidental" />
                        </div>
                        <div className="flex items-center justify-between rounded-md border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">Hide Recommended Parameters</p>
                            <p className="text-xs text-muted-foreground">Hide the brewing parameters section below</p>
                          </div>
                          <Switch checked={userHideParams} onCheckedChange={setUserHideParams} data-testid="switch-user-hide-params" />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-3">
                        <h4 className="text-sm font-semibold text-muted-foreground">Personal Note</h4>
                        <div className="flex items-center justify-between rounded-md border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <p className="text-sm font-medium">Show My Note</p>
                            <p className="text-xs text-muted-foreground">Display your personal brewing note</p>
                          </div>
                          <Switch checked={userShowNote} onCheckedChange={setUserShowNote} data-testid="switch-user-show-note" />
                        </div>
                        {userShowNote && (
                          <Textarea
                            value={userNote}
                            onChange={e => setUserNote(e.target.value)}
                            placeholder="Your personal brewing instructions or notes..."
                            className="min-h-[80px]"
                            data-testid="input-user-note"
                          />
                        )}
                      </div>

                      <Separator />

                      {selectedGrade && (
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          onClick={() => {
                            brewTimerRef.current?.resetGradePreferences();
                            setTimerSettingsOpen(false);
                          }}
                          data-testid="button-reset-grade-preferences"
                        >
                          <RotateCcw className="w-4 h-4" /> Reset {selectedGrade.name} Preferences
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        onClick={() => {
                          brewTimerRef.current?.resetToRecommended();
                          setUserHideOriental(false);
                          setUserHideOccidental(false);
                          setUserHideParams(false);
                          setUserNote('');
                          setUserShowNote(false);
                          updateLog.mutate({
                            teaId: tea.id,
                            timerSettings: {},
                            status: teaLog?.status || 'drinking',
                          });
                          setTimerSettingsOpen(false);
                        }}
                        data-testid="button-reset-preferences"
                      >
                        <RotateCcw className="w-4 h-4" /> Reset All Tea Preferences
                      </Button>

                      <Button
                        className="w-full"
                        onClick={() => {
                          const existingSettings = (teaLog?.timerSettings as any) || {};
                          updateLog.mutate({
                            teaId: tea.id,
                            timerSettings: {
                              ...existingSettings,
                              hideOriental: userHideOriental,
                              hideOccidental: userHideOccidental,
                              hideParams: userHideParams,
                              userNote: userNote || undefined,
                              showUserNote: userShowNote,
                            },
                            status: teaLog?.status || 'want_to_try'
                          } as any, {
                            onSuccess: () => {
                              toast({ title: "Saved", description: "Your preferences have been saved." });
                              setTimerSettingsOpen(false);
                            },
                            onError: (err: any) => {
                              toast({ title: "Error", description: err.message || "Failed to save preferences", variant: "destructive" });
                            }
                          });
                        }}
                        disabled={updateLog.isPending}
                        data-testid="button-save-timer-prefs"
                      >
                        {updateLog.isPending ? "Saving..." : "Save Preferences"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
            </div>

            {userShowNote && userNote && (
              <div className="mb-4 w-full p-4 bg-accent/10 border border-accent/20 rounded-xl text-sm text-foreground whitespace-pre-wrap">
                <div className="flex items-center gap-2 mb-2 font-semibold text-accent-foreground">
                  <BookOpen className="w-4 h-4" />
                  My Note
                </div>
                {userNote}
              </div>
            )}

            <BrewTimer 
              ref={brewTimerRef}
              tea={{
                ...tea,
                orientalTimerEnabled: userHideOriental ? false : tea.orientalTimerEnabled,
                occidentalTimerEnabled: userHideOccidental ? false : tea.occidentalTimerEnabled,
              }}
              teaLog={teaLog}
              showControls={true}
              grades={teaGrades}
              selectedGrade={selectedGrade}
              onSelectGrade={setSelectedGrade}
            />
          </div>
        </div>
      </div>
      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      <Footer />
    </div>
  );
}
