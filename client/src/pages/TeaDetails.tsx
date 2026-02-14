import { useRoute } from "wouter";
import { useTea, useUpdateTea } from "@/hooks/use-teas";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// Tabs kept for edit dialog only
import { BrewTimer } from "@/components/BrewTimer";
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
  X
} from "lucide-react";
import { useState, useEffect } from "react";
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


export default function TeaDetails() {
  const [, params] = useRoute("/tea/:id");
  const id = parseInt(params?.id || "0");
  const { data: tea, isLoading } = useTea(id);
  const { data: logs } = useLogs();
  const { user } = useAuth();
  const updateLog = useUpdateLog();
  const updateTea = useUpdateTea();
  const { toast } = useToast();
  const { data: teaTypes } = useTeaTypes();
  const [isEditing, setIsEditing] = useState(false);
  const [listSelectOpen, setListSelectOpen] = useState(false);

  const teaLog = logs?.find(l => l.teaId === id);
  const isAdmin = user?.role === 'admin' || user?.role === 'mod';

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
        recommendedTemp: tea.recommendedTemp || 85,
        recommendedDuration: tea.recommendedDuration || 60,
        orientalTemp: tea.orientalTemp || 95,
        orientalDuration: tea.orientalDuration || 20,
        orientalInfusionIncrement: tea.orientalInfusionIncrement || 10,
        orientalMaxInfusions: tea.orientalMaxInfusions || 8,
        occidentalTemp: tea.occidentalTemp || 85,
        occidentalDuration: tea.occidentalDuration || 180,
        occidentalInfusions: tea.occidentalInfusions || [180],
        washingStep: !!tea.washingStep,
        washingDuration: tea.washingDuration || 10,
        orientalLeafAmount: tea.orientalLeafAmount || "",
        orientalWaterAmount: tea.orientalWaterAmount || "",
        occidentalLeafAmount: tea.occidentalLeafAmount || "",
        occidentalWaterAmount: tea.occidentalWaterAmount || "",
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
      
      <div className="bg-card border-b border-border/50">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-full md:w-1/3 aspect-[4/3] rounded-md overflow-hidden shadow-2xl shadow-foreground/5 bg-secondary/30 relative">
              {tea.photoUrl ? (
                <img src={tea.photoUrl} alt={tea.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-primary/20">
                  <Leaf className="w-24 h-24" />
                </div>
              )}
            </div>

            <div className="flex-1 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="outline" className="mb-3 border font-medium" style={getTeaTypeColor(teaTypes, tea.type).style}>{tea.type}</Badge>
                  <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">{tea.name}</h1>
                </div>
                <div className="flex gap-2">
                  {isAdmin && (
                    <Dialog open={isEditing} onOpenChange={setIsEditing}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="icon" className="rounded-full shadow-sm hover:shadow-md transition-all">
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
                                <div className="p-4 bg-secondary/20 rounded-lg space-y-4">
                                  <FormField
                                    control={form.control}
                                    name="washingStep"
                                    render={({ field }) => (
                                      <FormItem className="flex items-center justify-between rounded-md border p-3 shadow-sm bg-card">
                                        <div className="space-y-0.5">
                                          <FormLabel>Washing Step</FormLabel>
                                          <FormDescription>Optional initial rinse of the leaves</FormDescription>
                                        </div>
                                        <FormControl>
                                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  {form.watch('washingStep') && (
                                    <FormField
                                      control={form.control}
                                      name="washingDuration"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel>Washing Duration (s)</FormLabel>
                                          <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                                        </FormItem>
                                      )}
                                    />
                                  )}
                                </div>
                              </TabsContent>

                              <TabsContent value="oriental" className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="orientalLeafAmount"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Leaf Amount (e.g. 5g)</FormLabel>
                                        <FormControl><Input {...field} placeholder="e.g. 5g" data-testid="input-oriental-leaf" /></FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="orientalWaterAmount"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Water Amount (e.g. 100ml)</FormLabel>
                                        <FormControl><Input {...field} placeholder="e.g. 100ml" data-testid="input-oriental-water" /></FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
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
                                        <FormLabel>Initial Duration (s)</FormLabel>
                                        <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} /></FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="orientalInfusionIncrement"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Infusion Increment (s)</FormLabel>
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
                                <div className="grid grid-cols-2 gap-4">
                                  <FormField
                                    control={form.control}
                                    name="occidentalLeafAmount"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Leaf Amount (e.g. 3g)</FormLabel>
                                        <FormControl><Input {...field} placeholder="e.g. 3g" data-testid="input-occidental-leaf" /></FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={form.control}
                                    name="occidentalWaterAmount"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel>Water Amount (e.g. 250ml)</FormLabel>
                                        <FormControl><Input {...field} placeholder="e.g. 250ml" data-testid="input-occidental-water" /></FormControl>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Infusion Durations (s)</label>
                                  <div className="flex flex-wrap gap-4">
                                    {((form.watch('occidentalInfusions' as any) as number[]) || []).map((dur: number, idx: number) => {
                                      const label = idx === 0 ? "1st" : idx === 1 ? "2nd" : idx === 2 ? "3rd" : `${idx + 1}th`;
                                      return (
                                        <div key={idx} className="flex flex-col gap-1 items-center">
                                          <span className="text-[10px] text-muted-foreground font-bold">{label}</span>
                                          <div className="flex items-center gap-1 bg-secondary/20 rounded p-1">
                                            <Input 
                                              type="number" 
                                              value={dur} 
                                              onChange={e => {
                                                const infs = [...(form.getValues('occidentalInfusions' as any) as number[])];
                                                infs[idx] = parseInt(e.target.value) || 0;
                                                form.setValue('occidentalInfusions' as any, infs);
                                              }}
                                              className="h-8 w-16 text-xs"
                                            />
                                            <Button 
                                              type="button"
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-6 w-6" 
                                              onClick={() => {
                                                const infs = (form.getValues('occidentalInfusions' as any) as number[]).filter((_, i) => i !== idx);
                                                form.setValue('occidentalInfusions' as any, infs);
                                              }}
                                            >
                                              <X className="w-3 h-3" />
                                            </Button>
                                          </div>
                                        </div>
                                      );
                                    })}
                                    <div className="flex flex-col gap-1 justify-end">
                                      <Button 
                                        type="button"
                                        variant="outline" 
                                        size="sm" 
                                        className="h-10"
                                        onClick={() => {
                                          const current = form.getValues('occidentalInfusions' as any) as number[] || [];
                                          form.setValue('occidentalInfusions' as any, [...current, 180]);
                                        }}
                                      >
                                        <Plus className="w-3 h-3 mr-1" /> Add
                                      </Button>
                                    </div>
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
                      <Badge variant="outline" className="gap-1.5 py-1.5 px-4 border-primary/30 text-primary">
                        <Leaf className="w-3.5 h-3.5" />
                        {teaLog.status === 'drinking' ? 'Drinking' : teaLog.status === 'want_to_try' ? 'Want to Try' : 'Not Rebuying'}
                      </Badge>
                    ) : (
                      <Dialog open={listSelectOpen} onOpenChange={setListSelectOpen}>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="gap-2 shadow-sm rounded-full"
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
                              onClick={() => handleAddToList('drinking')}
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
                              onClick={() => handleAddToList('want_to_try')}
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
                              onClick={() => handleAddToList('not_rebuying')}
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
              
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {tea.origin || "Unknown Origin"}
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5">
                  <Leaf className="w-4 h-4" />
                  {tea.cultivar || "Unknown Cultivar"}
                </div>
                <div className="w-px h-4 bg-border" />
                <div className="flex items-center gap-1.5 text-primary font-medium">
                  <Star className="w-4 h-4 fill-primary/20" />
                  {tea.averageScore ? `${tea.averageScore}/100` : "No Score"}
                </div>
              </div>

              <p className="text-lg leading-relaxed text-muted-foreground max-w-2xl mt-4">
                {tea.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="glass-card p-6 rounded-2xl">
            <h3 className="font-display text-2xl mb-4">Brewing Parameters</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
                  <p><span className="text-muted-foreground">Temp:</span> {tea.orientalTemp || 95}°C</p>
                  <p><span className="text-muted-foreground">Initial:</span> {tea.orientalDuration || 20}s</p>
                  <p><span className="text-muted-foreground">Increment:</span> +{tea.orientalInfusionIncrement || 10}s</p>
                  <p><span className="text-muted-foreground">Max:</span> {tea.orientalMaxInfusions || 8} infusions</p>
                </div>
              </div>
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
                  <p><span className="text-muted-foreground">Temp:</span> {tea.occidentalTemp || 85}°C</p>
                  <p><span className="text-muted-foreground">Duration:</span> {tea.occidentalDuration || 180}s</p>
                  {tea.occidentalInfusions && Array.isArray(tea.occidentalInfusions) && (
                    <p><span className="text-muted-foreground">Infusions:</span> {(tea.occidentalInfusions as number[]).map(s => `${s}s`).join(', ')}</p>
                  )}
                </div>
              </div>
            </div>
            {tea.washingStep && (
              <div className="mt-4 p-3 bg-[hsl(var(--wash-bg))] border border-[hsl(var(--wash-border))] rounded-md flex items-center gap-3 text-[hsl(var(--wash-text))] text-sm">
                <Droplets className="w-4 h-4" />
                Recommended wash: {tea.washingDuration || 10} seconds
              </div>
            )}
          </div>

          <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
            <h3 className="font-display text-2xl mb-6">Brew Timer</h3>
            <BrewTimer 
              tea={tea}
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
