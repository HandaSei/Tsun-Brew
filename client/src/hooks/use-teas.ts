import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { api, buildUrl, type InsertTea, type Tea, type TeaGrade } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useTeas() {
  return useQuery({
    queryKey: [api.teas.list.path],
    queryFn: async () => {
      const res = await fetch(api.teas.list.path);
      if (!res.ok) throw new Error("Failed to fetch teas");
      const json = await res.json();
      return json as Tea[];
    },
  });
}

export function useTea(id: number) {
  return useQuery({
    queryKey: [api.teas.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.teas.get.path, { slug: id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch tea details");
      const json = await res.json();
      return json as Tea & { attributes: any[] };
    },
    enabled: !!id,
  });
}

export function useTeaBySlug(slug: string) {
  return useQuery({
    queryKey: [api.teas.get.path, slug],
    queryFn: async () => {
      const url = buildUrl(api.teas.get.path, { slug });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch tea details");
      const json = await res.json();
      return json as Tea & { attributes: any[] };
    },
    enabled: !!slug,
  });
}

export function useUpdateTea() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & Partial<InsertTea>) => {
      const url = buildUrl(api.teas.update.path, { id });
      const res = await fetch(url, {
        method: api.teas.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update tea");
      const json = await res.json();
      return json as Tea;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: [api.teas.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.teas.get.path, id] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useCreateTea() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertTea & { attributes?: { key: string, value: string }[] }) => {
      const res = await fetch(api.teas.create.path, {
        method: api.teas.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create tea");
      const json = await res.json();
      return json as Tea;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.teas.list.path] });
      toast({ title: "Tea Created", description: "New tea has been added to the library." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useTeaGrades(teaId: number) {
  return useQuery({
    queryKey: ['/api/teas', teaId, 'grades'],
    queryFn: async () => {
      const url = buildUrl(api.teaGrades.list.path, { teaId });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch tea grades");
      return res.json() as Promise<TeaGrade[]>;
    },
    enabled: !!teaId,
  });
}

export function useAllTeaGrades() {
  return useQuery({
    queryKey: ['/api/all-tea-grades'],
    queryFn: async () => {
      const res = await fetch('/api/all-tea-grades');
      if (!res.ok) throw new Error("Failed to fetch all tea grades");
      return res.json() as Promise<(TeaGrade & { teaName: string; teaSlug: string })[]>;
    },
  });
}

export function useCreateTeaGrade() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ teaId, ...data }: { teaId: number; name: string; photoUrl?: string; description?: string; sortOrder?: number }) => {
      const url = buildUrl(api.teaGrades.create.path, { teaId });
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) throw new Error("Failed to create tea grade");
      return res.json() as Promise<TeaGrade>;
    },
    onSuccess: (_, { teaId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/teas', teaId, 'grades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/all-tea-grades'] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useUpdateTeaGrade() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, teaId, ...data }: { id: number; teaId: number; name?: string; photoUrl?: string; description?: string; sortOrder?: number }) => {
      const url = buildUrl(api.teaGrades.update.path, { id });
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
        credentials: 'include',
      });
      if (!res.ok) throw new Error("Failed to update tea grade");
      return res.json() as Promise<TeaGrade>;
    },
    onSuccess: (_, { teaId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/teas', teaId, 'grades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/all-tea-grades'] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}

export function useDeleteTeaGrade() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ id, teaId }: { id: number; teaId: number }) => {
      const url = buildUrl(api.teaGrades.delete.path, { id });
      const res = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error("Failed to delete tea grade");
    },
    onSuccess: (_, { teaId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/teas', teaId, 'grades'] });
      queryClient.invalidateQueries({ queryKey: ['/api/all-tea-grades'] });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}
