import { useRoute } from "wouter";
import { useTea, useUpdateTea } from "@/hooks/use-teas";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
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

// Example data for the chart
const chartData = [
  { subject: 'Aroma', A: 120, fullMark: 150 },
  { subject: 'Taste', A: 98, fullMark: 150 },
  { subject: 'Visual', A: 86, fullMark: 150 },
  { subject: 'Body', A: 99, fullMark: 150 },
  { subject: 'Finish', A: 85, fullMark: 150 },
  { subject: 'Energy', A: 65, fullMark: 150 },
];

export default function TeaDetails() {
  const [, params] = useRoute("/tea/:id");
  const id = parseInt(params?.id || "0");
  const { data: tea, isLoading } = useTea(id);
  const { data: logs } = useLogs();
  const { user } = useAuth();
  const updateLog = useUpdateLog();
  const updateTea = useUpdateTea();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("info");
  const [isEditing, setIsEditing] = useState(false);

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
      recommendedTemp: 85,
      recommendedDuration: 60,
      orientalTemp: 95,
      orientalDuration: 20,
      orientalInfusionIncrement: 10,
      orientalMaxInfusions: 8,
      occidentalTemp: 85,
      occidentalDuration: 180,
      occidentalInfusionIncrement: 30,
      occidentalMaxInfusions: 3,
      washingStep: false,
      washingDuration: 10,
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
        occidentalInfusionIncrement: tea.occidentalInfusionIncrement || 30,
        occidentalMaxInfusions: tea.occidentalMaxInfusions || 3,
        washingStep: !!tea.washingStep,
        washingDuration: tea.washingDuration || 10,
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

  const handleAddToMyList = () => {
    updateLog.mutate({
      teaId: tea.id,
      status: 'want_to_try'
    });
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
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      
      <div className="bg-white border-b border-border/50">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="w-full md:w-1/3 aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/5 bg-secondary/30 relative">
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
                  <Badge variant="outline" className="mb-3 border-primary/20 text-primary">{tea.type}</Badge>
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
                                            {['Green', 'Black', 'Oolong', 'White', 'Yellow', 'Dark'].map(t => (
                                              <SelectItem key={t} value={t}>{t}</SelectItem>
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
                                      <FormItem className="flex items-center justify-between rounded-lg border p-3 shadow-sm bg-white">
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
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Infusion Durations (s)</label>
                                  <div className="flex flex-wrap gap-4">
                                    {(form.watch('occidentalInfusions') as number[] || []).map((dur: number, idx: number) => {
                                      const label = idx === 0 ? "1st" : idx === 1 ? "2nd" : idx === 2 ? "3rd" : `${idx + 1}th`;
                                      return (
                                        <div key={idx} className="flex flex-col gap-1 items-center">
                                          <span className="text-[10px] text-muted-foreground font-bold">{label}</span>
                                          <div className="flex items-center gap-1 bg-secondary/20 rounded p-1">
                                            <Input 
                                              type="number" 
                                              value={dur} 
                                              onChange={e => {
                                                const infs = [...(form.getValues('occidentalInfusions') as number[])];
                                                infs[idx] = parseInt(e.target.value) || 0;
                                                form.setValue('occidentalInfusions', infs);
                                              }}
                                              className="h-8 w-16 text-xs"
                                            />
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-6 w-6" 
                                              onClick={() => {
                                                const infs = (form.getValues('occidentalInfusions') as number[]).filter((_, i) => i !== idx);
                                                form.setValue('occidentalInfusions', infs);
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
                                          const current = form.getValues('occidentalInfusions') as number[] || [];
                                          form.setValue('occidentalInfusions', [...current, 180]);
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
                    <Button onClick={handleAddToMyList} disabled={updateLog.isPending} variant="outline" className="gap-2 shadow-sm rounded-full">
                      {updateLog.isPending ? "Adding..." : <><Plus className="w-4 h-4" /> Add to List</>}
                    </Button>
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-transparent border-b border-border w-full justify-start rounded-none h-auto p-0 mb-8 gap-6">
            <TabsTrigger 
              value="info" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 text-lg"
            >
              Details & Profile
            </TabsTrigger>
            <TabsTrigger 
              value="brew" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 text-lg"
            >
              Brew Timer
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="glass-card p-6 rounded-2xl">
                <h3 className="font-display text-2xl mb-6">Flavor Profile</h3>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                      <PolarGrid stroke="hsl(var(--border))" />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} />
                      <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
                      <Radar
                        name={tea.name}
                        dataKey="A"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.3}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-6">
                <div className="glass-card p-6 rounded-2xl">
                  <h3 className="font-display text-2xl mb-4">Brewing Parameters</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3 p-4 bg-primary/5 rounded-xl border border-primary/10">
                      <h4 className="font-bold text-primary flex items-center gap-2">
                        <Zap className="w-4 h-4" /> Oriental
                      </h4>
                      <div className="text-sm space-y-1">
                        <p><span className="text-muted-foreground">Temp:</span> {tea.orientalTemp || 95}°C</p>
                        <p><span className="text-muted-foreground">Initial:</span> {tea.orientalDuration || 20}s</p>
                        <p><span className="text-muted-foreground">Increment:</span> +{tea.orientalInfusionIncrement || 10}s</p>
                        <p><span className="text-muted-foreground">Max:</span> {tea.orientalMaxInfusions || 8} infusions</p>
                      </div>
                    </div>
                    <div className="space-y-3 p-4 bg-secondary/20 rounded-xl border border-border">
                      <h4 className="font-bold text-foreground flex items-center gap-2">
                        <Leaf className="w-4 h-4" /> Occidental
                      </h4>
                      <div className="text-sm space-y-1">
                        <p><span className="text-muted-foreground">Temp:</span> {tea.occidentalTemp || 85}°C</p>
                        <p><span className="text-muted-foreground">Initial:</span> {tea.occidentalDuration || 180}s</p>
                        <p><span className="text-muted-foreground">Increment:</span> +{tea.occidentalInfusionIncrement || 30}s</p>
                        <p><span className="text-muted-foreground">Max:</span> {tea.occidentalMaxInfusions || 3} infusions</p>
                      </div>
                    </div>
                  </div>
                  {tea.washingStep && (
                    <div className="mt-4 p-3 bg-blue-50/50 border border-blue-100 rounded-lg flex items-center gap-3 text-blue-700 text-sm">
                      <Droplets className="w-4 h-4" />
                      Recommended wash: {tea.washingDuration || 10} seconds
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="brew" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="glass-card p-8 rounded-2xl flex flex-col items-center max-w-2xl mx-auto">
              <h3 className="font-display text-2xl mb-6">Brewing Session</h3>
              <BrewTimer 
                tea={tea}
                teaLog={teaLog}
                showControls={!!user}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
