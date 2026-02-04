import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type InsertTeaLog } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useLogs() {
  return useQuery({
    queryKey: [api.logs.list.path],
    queryFn: async () => {
      const res = await fetch(api.logs.list.path, { credentials: "include" });
      if (!res.ok) {
        if (res.status === 401) return []; // Handle unauthorized gracefully
        throw new Error("Failed to fetch logs");
      }
      return api.logs.list.responses[200].parse(await res.json());
    },
  });
}

export function useUpdateLog() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertTeaLog & { incrementBrew?: boolean }) => {
      const res = await fetch(api.logs.update.path, {
        method: api.logs.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update tea log");
      return api.logs.update.responses[200].parse(await res.json());
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.logs.list.path] });
      // Invalidate single tea view as well if user is viewing it
      // queryClient.invalidateQueries({ queryKey: [api.teas.get.path, variables.teaId] }); 
      
      const msg = variables.incrementBrew ? "Brew logged!" : "Tea list updated";
      toast({ title: "Success", description: msg });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });
}
