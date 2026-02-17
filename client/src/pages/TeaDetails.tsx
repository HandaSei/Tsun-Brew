import { useRoute } from "wouter";
import { useTea, useTeaBySlug, useUpdateTea } from "@/hooks/use-teas";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Tabs kept for edit dialog only
import { BrewTimer, type BrewTimerHandle } from "@/components/BrewTimer";
import { useUpdateLog, useLogs } from "@/hooks/use-logs";
import { 
  Loader2, 
  Leaf, 
  MapPin, 
  Thermometer, 
  Clock, 
  BookOpen, 
  Star,
  Plus,
  Settings,
  Edit2,
  Droplets,
  Zap,
  X,
  RotateCcw,
  Tag
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  const [timerSettingsOpen, setTimerSettingsOpen] = useState(false);
  const brewTimerRef = useRef<BrewTimerHandle>(null);

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

  const form = useForm({
    resolver: zodResolver(insertTeaSchema.partial()),
    defaultValues: {
      name: "",
      type: "",
      description: "",
      origin: "",
      cultivar: "",
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
        cultivar: tea.cultivar || "",
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
      
      <div className="bg-card border-b border-border/50 relative overflow-hidden">
        <div className="container mx-auto px-4 py-6 md:py-8 relative">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <div className="w-full max-w-[320px] aspect-square rounded-md bg-secondary/30 relative shrink-0 group mx-auto md:mx-0" style={{ perspective: '800px' }}>
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

            <div className="flex-1 space-y-6 w-full pt-2">
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
                              <TabsList className="grid w-full grid-cols-3 mb-6">
                                <TabsTrigger value="general">General</TabsTrigger>
                                <TabsTrigger value="oriental">Oriental (Gongfu)</TabsTrigger>
                                <TabsTrigger value="occidental">Occidental (Western)</TabsTrigger>
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
                                        <FormControl><Input {...field} /></FormControl>
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
                </div>
              </div>

              <div>
                <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4" data-testid="text-tea-name">{tea.name}</h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                  {tea.origin && (
                    <div className="flex items-center gap-1.5" data-testid="text-origin">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{tea.origin}</span>
                    </div>
                  )}
                  {tea.origin && tea.cultivar && <span className="opacity-20">•</span>}
                  {tea.cultivar && (
                    <div className="flex items-center gap-1.5" data-testid="text-cultivar">
                      <Tag className="w-3.5 h-3.5" />
                      <span>{tea.cultivar}</span>
                    </div>
                  )}
                </div>
              </div>

              <ScoreWidget teaId={tea.id} />
            </div>
          </div>
        </div>
      </div>
      {tea.description && (
        <div className="container mx-auto px-4 pt-6">
          <div className="max-w-2xl mx-auto">
            <p className="text-base leading-relaxed text-muted-foreground">{tea.description}</p>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {!userHideParams && (
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="font-display text-2xl mb-4">Recommended Brewing Parameters</h3>
            
            {tea.showBrewingNote && tea.brewingNote && (
              <div className="mb-4 p-4 bg-accent/10 border border-accent/20 rounded-xl text-sm text-foreground whitespace-pre-wrap">
                <div className="flex items-center gap-2 mb-2 font-semibold text-accent-foreground">
                  <BookOpen className="w-4 h-4" />
                  Brewing Note
                </div>
                {tea.brewingNote}
              </div>
            )}

            {(tea.showOriental !== false || tea.showOccidental !== false) && (
              <div className={`grid grid-cols-1 ${tea.showOriental !== false && tea.showOccidental !== false ? 'sm:grid-cols-2' : ''} gap-6`}>
                {tea.showOriental !== false && (
                  <div className="space-y-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                    <h4 className="font-bold text-primary flex items-center gap-2">
                      <Zap className="w-4 h-4" /> Oriental (Gongfu)
                    </h4>
                    <div className="text-sm space-y-1.5">
                      {tea.orientalLeafAmount && tea.orientalWaterAmount ? (
                        <p className="text-muted-foreground">{tea.orientalLeafAmount} of leaves for {tea.orientalWaterAmount} of water</p>
                      ) : tea.orientalLeafAmount ? (
                        <p><span className="text-muted-foreground">Leaf:</span> {tea.orientalLeafAmount}</p>
                      ) : tea.orientalWaterAmount ? (
                        <p><span className="text-muted-foreground">Water:</span> {tea.orientalWaterAmount}</p>
                      ) : null}
                      {tea.orientalTemp != null && <p><span className="text-muted-foreground">Temp:</span> {tea.orientalTemp}°C</p>}
                      {tea.orientalDuration != null && <p><span className="text-muted-foreground">Initial:</span> {tea.orientalDuration}s</p>}
                      {tea.orientalInfusionIncrement != null && <p><span className="text-muted-foreground">Increment:</span> +{tea.orientalInfusionIncrement}s</p>}
                      {tea.orientalMaxInfusions != null && <p><span className="text-muted-foreground">Max:</span> {tea.orientalMaxInfusions} infusions</p>}
                      {tea.orientalTemp == null && tea.orientalDuration == null && !tea.orientalLeafAmount && !tea.orientalWaterAmount && (
                        <p className="text-muted-foreground italic">No parameters set</p>
                      )}
                    </div>
                  </div>
                )}
                {tea.showOccidental !== false && (
                  <div className="space-y-3 p-4 bg-secondary/20 rounded-xl border border-border">
                    <h4 className="font-bold text-foreground flex items-center gap-2">
                      <Leaf className="w-4 h-4" /> Occidental (Western)
                    </h4>
                    <div className="text-sm space-y-1.5">
                      {tea.occidentalLeafAmount && tea.occidentalWaterAmount ? (
                        <p className="text-muted-foreground">{tea.occidentalLeafAmount} of leaves for {tea.occidentalWaterAmount} of water</p>
                      ) : tea.occidentalLeafAmount ? (
                        <p><span className="text-muted-foreground">Leaf:</span> {tea.occidentalLeafAmount}</p>
                      ) : tea.occidentalWaterAmount ? (
                        <p><span className="text-muted-foreground">Water:</span> {tea.occidentalWaterAmount}</p>
                      ) : null}
                      {tea.occidentalTemp != null && <p><span className="text-muted-foreground">Temp:</span> {tea.occidentalTemp}°C</p>}
                      {tea.occidentalInfusions && Array.isArray(tea.occidentalInfusions) && (tea.occidentalInfusions as number[]).length > 0 && (
                        <div className="space-y-1 mt-1">
                          <p className="text-muted-foreground font-medium">Infusions:</p>
                          <div className="flex flex-wrap gap-2">
                            {(tea.occidentalInfusions as number[]).map((s, i) => (
                              <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/40 border border-border text-xs">
                                <span className="font-semibold">{i + 1}{i === 0 ? 'st' : i === 1 ? 'nd' : i === 2 ? 'rd' : 'th'}</span>
                                <span className="text-muted-foreground">{s}s</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {tea.occidentalTemp == null && !tea.occidentalInfusions && !tea.occidentalLeafAmount && !tea.occidentalWaterAmount && (
                        <p className="text-muted-foreground italic">No parameters set</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tea.showOriental === false && tea.showOccidental === false && !tea.showBrewingNote && (
              <p className="text-muted-foreground text-sm italic">No recommended parameters available for this tea.</p>
            )}

            {tea.washingStep && (
              <div className="mt-4 p-3 bg-[hsl(var(--wash-bg))] border border-[hsl(var(--wash-border))] rounded-md flex items-center gap-3 text-[hsl(var(--wash-text))] text-sm">
                <Droplets className="w-4 h-4" />
                Recommended wash: {tea.washingDuration || 10} seconds
              </div>
            )}
          </div>
          )}

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
                        <RotateCcw className="w-4 h-4" /> Reset Tea Preferences
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
              showControls={!!user}
            />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
