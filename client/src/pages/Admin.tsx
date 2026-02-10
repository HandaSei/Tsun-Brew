import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { type User } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Navigation } from "@/components/Navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function AdminPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Redirect if not admin
  if (user && user.role !== "admin") {
    setLocation("/");
    return null;
  }
  
  // Also handle loading state for auth... but for now simplified

  const { data: users, isLoading } = useQuery({
    queryKey: [api.admin.getUsers.path],
    queryFn: async () => {
      const res = await fetch(api.admin.getUsers.path);
      if (!res.ok) throw new Error("Failed to fetch users");
      return api.admin.getUsers.responses[200].parse(await res.json());
    },
    enabled: !!user && user.role === "admin",
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, role }: { id: number; role: "user" | "mod" | "admin" }) => {
      // Need to replace :id in path
      const path = api.admin.updateRole.path.replace(":id", id.toString());
      const res = await fetch(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.getUsers.path] });
      toast({ title: "Role Updated", description: "User permissions have been modified." });
    },
    onError: (err) => {
      toast({ title: "Update Failed", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) return <div className="flex justify-center p-20"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-destructive/10 p-3 rounded-full text-destructive">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Manage user roles and permissions.</p>
          </div>
        </div>

        <div className="glass-card rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u: User) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell>
                    <Badge variant={u.role === "admin" ? "destructive" : u.role === "mod" ? "default" : "secondary"}>
                      {u.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(u.createdAt || "").toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <Select 
                      defaultValue={u.role} 
                      onValueChange={(val) => updateRoleMutation.mutate({ id: u.id, role: val as any })}
                      disabled={u.id === user?.id} // Can't change own role
                    >
                      <SelectTrigger className="w-[120px] ml-auto">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">User</SelectItem>
                        <SelectItem value="mod">Moderator</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
