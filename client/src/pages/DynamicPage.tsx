import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Loader2, Pencil } from "lucide-react";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Page } from "@shared/schema";

export default function DynamicPage() {
  const [, params] = useRoute("/page/:slug");
  const slug = params?.slug || "";
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");

  const { data: page, isLoading } = useQuery<Page>({
    queryKey: ["/api/pages", slug],
    queryFn: async () => {
      const res = await fetch(`/api/pages/${slug}`);
      if (!res.ok) throw new Error("Page not found");
      return res.json();
    },
    enabled: !!slug,
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { title?: string; content?: string }) => {
      return apiRequest("PATCH", `/api/pages/${slug}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pages", slug] });
      setEditing(false);
      toast({ title: "Page Updated" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const startEditing = () => {
    if (page) {
      setEditTitle(page.title);
      setEditContent(page.content);
      setEditing(true);
    }
  };

  const handleSave = () => {
    updateMutation.mutate({ title: editTitle, content: editContent });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-1 flex justify-center items-center">
          <Loader2 className="animate-spin w-8 h-8 text-muted-foreground" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-1 flex justify-center items-center">
          <p className="text-muted-foreground">Page not found.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-10 max-w-3xl">
        {editing ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                data-testid="input-page-title"
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={16}
                className="font-mono text-sm"
                data-testid="textarea-page-content"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setEditing(false)} data-testid="button-cancel-edit">
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateMutation.isPending} data-testid="button-save-page">
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-4 mb-8">
              <h1 className="text-4xl font-display font-bold" data-testid="text-page-title">{page.title}</h1>
              {user?.role === "admin" && (
                <Button variant="outline" size="sm" onClick={startEditing} data-testid="button-edit-page">
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </div>
            <div className="prose prose-neutral dark:prose-invert max-w-none" data-testid="text-page-content">
              {page.content.split("\n").map((paragraph, i) => (
                paragraph.trim() ? <p key={i}>{paragraph}</p> : <br key={i} />
              ))}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
