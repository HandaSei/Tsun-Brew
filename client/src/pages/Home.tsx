import { useTeas } from "@/hooks/use-teas";
import { TeaCard } from "@/components/TeaCard";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader2, Edit2, Trash2, ExternalLink, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState, useRef, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateTeaForm } from "@/components/CreateTeaForm";
import { useAuth } from "@/hooks/use-auth";
import { TypewriterPhrase } from "@/components/TypewriterPhrase";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type HeroPhrase } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

function TrendingSection() {
  const { data: trendingTeas, isLoading } = useQuery<any[]>({
    queryKey: ['/api/trending-teas'],
  });

  if (isLoading) {
    return (
      <section data-testid="section-trending">
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-6 h-6 text-primary" />
          <h2 className="text-3xl font-display font-bold" data-testid="text-trending">Trending</h2>
        </div>
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary/30" />
        </div>
      </section>
    );
  }

  if (!trendingTeas || trendingTeas.length === 0) return null;

  return (
    <section data-testid="section-trending">
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <Link href="/browse?sort=trending">
          <div className="flex items-center gap-3 hover:text-primary transition-colors cursor-pointer group">
            <TrendingUp className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
            <h2 className="text-3xl font-display font-bold" data-testid="text-trending">Trending</h2>
          </div>
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {trendingTeas.map((tea: any) => (
          <TeaCard key={tea.id} tea={tea} />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const { data: teas, isLoading } = useTeas();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [createCustomOpen, setCreateCustomOpen] = useState(false);
  const [createGlobalOpen, setCreateGlobalOpen] = useState(false);
  const [phrasesOpen, setPhrasesOpen] = useState(false);
  const [newPhraseText, setNewPhraseText] = useState("");
  const [editingPhrase, setEditingPhrase] = useState<{ id: number; text: string } | null>(null);
  const { toast } = useToast();

  const isAdmin = user?.role === 'admin' || user?.role === 'mod';

  const { data: heroPhrases } = useQuery<HeroPhrase[]>({
    queryKey: ['/api/hero-phrases'],
  });

  const createPhrase = useMutation({
    mutationFn: async (text: string) => {
      await apiRequest('POST', '/api/hero-phrases', { text, sortOrder: (heroPhrases?.length || 0) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hero-phrases'] });
      setNewPhraseText("");
      toast({ title: "Added", description: "Phrase added successfully." });
    },
  });

  const updatePhrase = useMutation({
    mutationFn: async ({ id, text }: { id: number; text: string }) => {
      await apiRequest('PATCH', `/api/hero-phrases/${id}`, { text });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hero-phrases'] });
      setEditingPhrase(null);
      toast({ title: "Updated", description: "Phrase updated." });
    },
  });

  const deletePhrase = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/hero-phrases/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/hero-phrases'] });
      toast({ title: "Deleted", description: "Phrase removed." });
    },
  });

  const filteredTeas = teas?.filter(tea => {
    const searchTerm = search.trim().toLowerCase();
    if (searchTerm.length < 2) return false;
    
    const name = tea.name.toLowerCase();
    const type = tea.type.toLowerCase();
    
    const nameWords = name.split(/\s+/);
    const typeWords = type.split(/\s+/);
    
    const isStrict = searchTerm.length === 2;
    
    const matchesName = nameWords.some(word => 
      isStrict ? word === searchTerm : word.startsWith(searchTerm)
    ) || name.startsWith(searchTerm);
    
    return matchesName;
  });

  const phraseTexts = useMemo(() => heroPhrases?.map(p => p.text) || [], [heroPhrases]);

  useEffect(() => {
    if (search.trim().length >= 2) {
      setIsSearchOpen(true);
    } else {
      setIsSearchOpen(false);
    }
  }, [search]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent -z-10" />
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          {isAdmin && (
            <Dialog open={phrasesOpen} onOpenChange={setPhrasesOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="opacity-40 hover:opacity-100 transition-opacity gap-1.5 mx-auto"
                  data-testid="button-edit-phrases"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Manage Phrases
                </Button>
              </DialogTrigger>
                <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Manage Hero Phrases</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      {heroPhrases?.map((phrase) => (
                        <div key={phrase.id} className="flex items-start gap-2 p-3 bg-secondary/20 rounded-lg group" data-testid={`phrase-item-${phrase.id}`}>
                          {editingPhrase?.id === phrase.id ? (
                            <div className="flex-1 space-y-2">
                              <Textarea
                                value={editingPhrase.text}
                                onChange={(e) => setEditingPhrase({ ...editingPhrase, text: e.target.value })}
                                className="text-sm min-h-[60px]"
                                data-testid="input-edit-phrase"
                              />
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => updatePhrase.mutate({ id: phrase.id, text: editingPhrase.text })}
                                  disabled={updatePhrase.isPending}
                                  data-testid="button-save-phrase"
                                >
                                  Save
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => setEditingPhrase(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <p className="flex-1 text-sm text-foreground leading-relaxed">{phrase.text}</p>
                              <div className="flex gap-1 shrink-0">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingPhrase({ id: phrase.id, text: phrase.text })}
                                  data-testid={`button-edit-phrase-${phrase.id}`}
                                >
                                  <Edit2 className="w-3 h-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => deletePhrase.mutate(phrase.id)}
                                  disabled={deletePhrase.isPending}
                                  data-testid={`button-delete-phrase-${phrase.id}`}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                      {(!heroPhrases || heroPhrases.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-4">No phrases yet. Add one below.</p>
                      )}
                    </div>

                    <div className="border-t pt-4 space-y-2">
                      <label className="text-sm font-medium">Add New Phrase</label>
                      <Textarea
                        value={newPhraseText}
                        onChange={(e) => setNewPhraseText(e.target.value)}
                        placeholder="Type a new hero phrase..."
                        className="min-h-[60px]"
                        data-testid="input-new-phrase"
                      />
                      <Button
                        onClick={() => newPhraseText.trim() && createPhrase.mutate(newPhraseText.trim())}
                        disabled={!newPhraseText.trim() || createPhrase.isPending}
                        className="w-full"
                        data-testid="button-add-phrase"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Phrase
                      </Button>
                    </div>
                  </div>
                </DialogContent>
            </Dialog>
          )}
          <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground min-h-[3.5rem] md:min-h-[4.5rem] flex items-center justify-center" data-testid="text-hero-heading">
            {phraseTexts.length > 0 ? (
              <TypewriterPhrase phrases={phraseTexts} intervalSeconds={30} />
            ) : (
              <span className="text-muted-foreground/50">...</span>
            )}
          </h1>
          
          <div className="max-w-md mx-auto relative mt-8">
            <Popover 
              open={isSearchOpen && search.trim().length >= 2 && filteredTeas && (filteredTeas.length > 0 || search.trim().length >= 3)} 
              onOpenChange={(open) => {
                if (!open) setIsSearchOpen(false);
                else if (search.trim().length >= 2) setIsSearchOpen(true);
              }}
            >
              <PopoverAnchor asChild>
                <div className="flex items-center relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
                  <Input 
                    ref={searchInputRef}
                    placeholder="Search teas..." 
                    className="pl-10 h-12 text-lg rounded-full shadow-sm border-primary/20 focus-visible:ring-primary/30"
                    value={search}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSearch(val);
                      if (val.trim().length < 2) {
                        setIsSearchOpen(false);
                      }
                    }}
                    onBlur={() => {
                      // Small delay to allow clicking on results
                      setTimeout(() => setIsSearchOpen(false), 200);
                    }}
                    onFocus={() => search.trim().length >= 2 && setIsSearchOpen(true)}
                    data-testid="input-search"
                  />
                </div>
              </PopoverAnchor>
              <PopoverContent 
                className="w-[var(--radix-popover-trigger-width)] p-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-top-2 duration-300" 
                align="start"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onInteractOutside={(e) => {
                  if (e.target !== searchInputRef.current) {
                    setIsSearchOpen(false);
                  }
                }}
              >
                <ScrollArea className="max-h-[400px]">
                  <div className="p-2 space-y-1">
                    {filteredTeas && filteredTeas.length > 0 ? (
                      <>
                        {filteredTeas.slice(0, 10).map((tea) => (
                          <Link key={tea.id} href={`/tea/${tea.slug}`}>
                            <div className="flex items-center gap-3 p-2 hover:bg-accent rounded-md cursor-pointer group transition-all duration-300 ease-in-out animate-in fade-in slide-in-from-top-1">
                              <div 
                                className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden shrink-0 shadow-sm bg-muted"
                              >
                                {tea.photoUrl ? (
                                  <img 
                                    src={tea.photoUrl} 
                                    alt={tea.name} 
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div 
                                    className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                                    style={{ 
                                      backgroundColor: `hsl(${(tea as any).typeColorHue ?? 0}, ${(tea as any).typeColorSaturation ?? 70}%, ${(tea as any).typeColorLightness ?? 45}%)` 
                                    }}
                                  >
                                    {tea.name[0]}
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{tea.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{tea.type}</p>
                              </div>
                              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </Link>
                        ))}
                        {filteredTeas.length > 10 && (
                          <p className="text-[10px] text-center text-muted-foreground pt-2 pb-1 uppercase tracking-wider font-semibold animate-in fade-in duration-500">
                            + {filteredTeas.length - 10} more results
                          </p>
                        )}
                      </>
                    ) : (
                      search.trim().length >= 3 && (
                        <div className="p-4 text-center animate-in fade-in duration-300">
                          <p className="text-sm text-muted-foreground">No teas found matching "{search}"</p>
                        </div>
                      )
                    )}
                  </div>
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </section>

      <Dialog open={createCustomOpen} onOpenChange={setCreateCustomOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl" data-testid="dialog-title-custom">Add a New Custom Tea</DialogTitle>
          </DialogHeader>
          <CreateTeaForm onSuccess={() => setCreateCustomOpen(false)} isCustom />
        </DialogContent>
      </Dialog>

      <Dialog open={createGlobalOpen} onOpenChange={setCreateGlobalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl" data-testid="dialog-title-global">Add a New Tea</DialogTitle>
          </DialogHeader>
          <CreateTeaForm onSuccess={() => setCreateGlobalOpen(false)} />
        </DialogContent>
      </Dialog>

      <main className="container mx-auto px-4 pb-20 flex-1 space-y-16">
        {user && (() => {
          const myCustomTeas = teas
            ?.filter(tea => (tea as any).isCustom && (tea as any).createdById === user.id)
            .slice(0, 5);
          if (!myCustomTeas || myCustomTeas.length === 0) return null;
          return (
            <section data-testid="section-your-additions">
              <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
                <Link href="/browse?custom=true">
                  <h2 className="text-3xl font-display font-bold hover:text-primary transition-colors cursor-pointer" data-testid="text-your-additions">Your Custom Additions</h2>
                </Link>
                  <Button
                    className="rounded-full shadow-lg shadow-primary/20 hover:shadow-xl"
                    onClick={() => setCreateCustomOpen(true)}
                    data-testid="button-add-custom-tea-top"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {isAdmin ? "Add Custom Tea" : "Add New Tea"}
                  </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                {myCustomTeas.map((tea) => (
                  <TeaCard key={tea.id} tea={tea} />
                ))}
              </div>
            </section>
          );
        })()}

        <TrendingSection />

        <section data-testid="section-latest-additions">
          <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
            <Link href="/browse?sort=latest">
              <h2 className="text-3xl font-display font-bold hover:text-primary transition-colors cursor-pointer" data-testid="text-latest-additions">Latest Additions</h2>
            </Link>
            
            {user && (
              <div className="flex items-center gap-2 flex-wrap">
                {isAdmin && (
                  <Button
                    className="rounded-full shadow-lg shadow-primary/20 hover:shadow-xl"
                    onClick={() => setCreateGlobalOpen(true)}
                    data-testid="button-add-global-tea"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add New Tea
                  </Button>
                )}
                {(!teas?.some(tea => (tea as any).isCustom && (tea as any).createdById === user.id)) && (
                  <Button
                    variant={isAdmin ? "outline" : "default"}
                    className="rounded-full shadow-lg shadow-primary/20 hover:shadow-xl"
                    onClick={() => setCreateCustomOpen(true)}
                    data-testid="button-add-custom-tea"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Custom Tea
                  </Button>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary/30" />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {teas?.filter(tea => !(tea as any).isCustom).slice(0, 5).map((tea) => (
                <TeaCard key={tea.id} tea={tea} />
              ))}
              {(!teas || teas.filter(tea => !(tea as any).isCustom).length === 0) && (
                <div className="col-span-full py-20 text-center">
                  <p className="text-muted-foreground text-lg">No teas found.</p>
                </div>
              )}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}
