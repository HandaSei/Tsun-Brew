import { useTeas } from "@/hooks/use-teas";
import { TeaCard } from "@/components/TeaCard";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Plus, Search, Loader2, Edit2, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreateTeaForm } from "@/components/CreateTeaForm";
import { useAuth } from "@/hooks/use-auth";
import { TypewriterPhrase } from "@/components/TypewriterPhrase";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type HeroPhrase } from "@shared/schema";
import { Textarea } from "@/components/ui/textarea";

export default function Home() {
  const { data: teas, isLoading } = useTeas();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
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

  const filteredTeas = teas?.filter(tea => 
    tea.name.toLowerCase().includes(search.toLowerCase()) ||
    tea.type.toLowerCase().includes(search.toLowerCase())
  );

  const phraseTexts = heroPhrases?.map(p => p.text) || [];

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent -z-10" />
        <div className="container mx-auto max-w-4xl text-center space-y-6">
          <div className="relative inline-block">
            <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground min-h-[3.5rem] md:min-h-[4.5rem] flex items-center justify-center" data-testid="text-hero-heading">
              {phraseTexts.length > 0 ? (
                <TypewriterPhrase phrases={phraseTexts} intervalSeconds={30} />
              ) : (
                <span className="text-muted-foreground/50">...</span>
              )}
            </h1>
            {isAdmin && (
              <Dialog open={phrasesOpen} onOpenChange={setPhrasesOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute -right-12 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity"
                    data-testid="button-edit-phrases"
                  >
                    <Edit2 className="w-4 h-4" />
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
          </div>
          
          <div className="flex items-center max-w-md mx-auto relative mt-8">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input 
              placeholder="Search teas by name or type..." 
              className="pl-10 h-12 text-lg rounded-full shadow-sm border-primary/20 focus-visible:ring-primary/30"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="input-search"
            />
          </div>
        </div>
      </section>

      <main className="container mx-auto px-4 pb-20">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
          <h2 className="text-3xl font-display font-bold">Latest Additions</h2>
          
          {user && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full shadow-lg shadow-primary/20 hover:shadow-xl" data-testid="button-add-tea">
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
