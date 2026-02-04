import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type InsertTea, type Tea } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useTeas() {
  return useQuery({
    queryKey: [api.teas.list.path],
    queryFn: async () => {
      const res = await fetch(api.teas.list.path);
      if (!res.ok) throw new Error("Failed to fetch teas");
      return api.teas.list.responses[200].parse(await res.json());
    },
  });
}

export function useTea(id: number) {
  return useQuery({
    queryKey: [api.teas.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.teas.get.path, { id });
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch tea details");
      return api.teas.get.responses[200].parse(await res.json());
    },
    enabled: !!id,
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
      return api.teas.create.responses[201].parse(await res.json());
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
