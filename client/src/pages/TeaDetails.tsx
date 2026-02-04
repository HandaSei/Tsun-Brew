import { useRoute } from "wouter";
import { useTea } from "@/hooks/use-teas";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BrewTimer } from "@/components/BrewTimer";
import { useUpdateLog } from "@/hooks/use-logs";
import { 
  Loader2, 
  Leaf, 
  MapPin, 
  Thermometer, 
  Clock, 
  BookOpen, 
  Star,
  Plus
} from "lucide-react";
import { useState } from "react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

// Example data for the chart - in a real app this would come from reviews
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
  const { user } = useAuth();
  const updateLog = useUpdateLog();
  const [activeTab, setActiveTab] = useState("info");

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

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navigation />
      
      {/* Header / Hero */}
      <div className="bg-white border-b border-border/50">
        <div className="container mx-auto px-4 py-8 md:py-12">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            {/* Image */}
            <div className="w-full md:w-1/3 aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl shadow-black/5 bg-secondary/30 relative">
              {tea.photoUrl ? (
                <img src={tea.photoUrl} alt={tea.name} className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-primary/20">
                  <Leaf className="w-24 h-24" />
                </div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <Badge variant="outline" className="mb-3 border-primary/20 text-primary">{tea.type}</Badge>
                  <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground">{tea.name}</h1>
                </div>
                {user && (
                  <Button onClick={handleAddToMyList} disabled={updateLog.isPending} variant="outline" className="gap-2">
                    {updateLog.isPending ? "Adding..." : <><Plus className="w-4 h-4" /> Add to List</>}
                  </Button>
                )}
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

      {/* Main Content Tabs */}
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
            <TabsTrigger 
              value="community" 
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-0 py-3 text-lg"
            >
              Community Reviews
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
                  <h3 className="font-display text-2xl mb-4">Brewing Attributes</h3>
                  <div className="space-y-4">
                    {/* Mock data for now */}
                    <div className="flex justify-between border-b border-border/40 pb-2">
                      <span className="text-muted-foreground">Oxidation</span>
                      <span className="font-medium">Light</span>
                    </div>
                    <div className="flex justify-between border-b border-border/40 pb-2">
                      <span className="text-muted-foreground">Harvest Season</span>
                      <span className="font-medium">Spring 2024</span>
                    </div>
                    <div className="flex justify-between border-b border-border/40 pb-2">
                      <span className="text-muted-foreground">Roast Level</span>
                      <span className="font-medium">None</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="brew" className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div className="glass-card p-8 rounded-2xl flex flex-col items-center">
                <h3 className="font-display text-2xl mb-2">Gongfu Brewing</h3>
                <div className="flex items-center gap-6 text-sm text-muted-foreground mb-8">
                  <div className="flex items-center gap-1.5">
                    <Thermometer className="w-4 h-4" /> 85°C
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" /> 20s + 5s
                  </div>
                </div>
                
                <BrewTimer teaId={tea.id} initialSeconds={20} />
              </div>

              <div className="space-y-6">
                <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                  <h4 className="font-bold text-primary mb-2 flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    Official Guide
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    For best results, use 5g of tea per 100ml of water. Rinse briefly. 
                    Steep for 20s for the first infusion, adding 5s for each subsequent steep. 
                    Enjoy the orchid aroma that develops after the 2nd steep.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="community">
            <div className="text-center py-12 text-muted-foreground">
              <p>Community reviews coming soon...</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
