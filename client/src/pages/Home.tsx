import { useTeas } from "@/hooks/use-teas";
import { TeaCard } from "@/components/TeaCard";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateTeaForm } from "@/components/CreateTeaForm"; // We'll build this next
import { useAuth } from "@/hooks/use-auth";

export default function Home() {
  const { data: teas, isLoading } = useTeas();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const filteredTeas = teas?.filter(tea => 
    tea.name.toLowerCase().includes(search.toLowerCase()) ||
    tea.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent -z-10" />
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <h1 className="text-5xl md:text-7xl font-display font-bold text-foreground">
            Discover the World of Tea
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Log your tastings, discover new cultivars, and brew the perfect cup with our community guides.
          </p>
          
          <div className="flex items-center max-w-md mx-auto relative mt-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input 
              placeholder="Search teas by name or type..." 
              className="pl-10 h-12 text-lg rounded-full shadow-sm border-primary/20 focus-visible:ring-primary/30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </section>

      {/* Content Grid */}
      <main className="container mx-auto px-4 pb-20">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-display font-bold">Latest Additions</h2>
          
          {user && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full shadow-lg shadow-primary/20 hover:shadow-xl">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Tea
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl">Add a New Tea</DialogTitle>
                </DialogHeader>
                <CreateTeaForm onSuccess={() => setCreateOpen(false)} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-12 h-12 animate-spin text-primary/30" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTeas?.map((tea) => (
              <TeaCard key={tea.id} tea={tea} />
            ))}
            {filteredTeas?.length === 0 && (
              <div className="col-span-full py-20 text-center">
                <p className="text-muted-foreground text-lg">No teas found matching your search.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
