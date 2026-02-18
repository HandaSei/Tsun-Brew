import { useAuth } from "@/hooks/use-auth";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Settings, Star, Lock, Mail, ShieldCheck } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { ScoringSystem, UserPreference } from "@shared/schema";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const passwordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const verifyEmailSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

export default function UserSettings() {
  const { user, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [emailStep, setEmailStep] = useState<"input" | "verify">("input");
  const [newEmail, setNewEmail] = useState("");

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const emailForm = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const verifyForm = useForm<z.infer<typeof verifyEmailSchema>>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: { code: "" },
  });

  const { data: systems } = useQuery<ScoringSystem[]>({
    queryKey: ["/api/scoring-systems"],
  });

  const { data: userPref, isLoading: prefLoading } = useQuery<UserPreference | null>({
    queryKey: ["/api/user-preferences"],
    enabled: !!user,
  });

  const [selectedSystem, setSelectedSystem] = useState<string>("");

  useEffect(() => {
    if (userPref?.preferredScoringSystemId) {
      setSelectedSystem(String(userPref.preferredScoringSystemId));
    } else if (systems && systems.length > 0) {
      const active = systems.filter(s => s.isActive);
      if (active.length > 0) {
        setSelectedSystem(String(active[0].id));
      }
    }
  }, [userPref, systems]);

  useEffect(() => {
    if (!authLoading && !user) {
      setLocation("/");
    }
  }, [authLoading, user, setLocation]);

  const updatePrefMutation = useMutation({
    mutationFn: async (data: { preferredScoringSystemId: number | null }) => {
      return apiRequest("PATCH", "/api/user-preferences", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-preferences"] });
      toast({ title: "Preferences saved", description: "Your preferred scoring system has been updated." });
    },
    onError: (err) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async (data: z.infer<typeof passwordSchema>) => {
      return apiRequest("POST", "/api/user/update-password", { password: data.password });
    },
    onSuccess: () => {
      passwordForm.reset();
      toast({ title: "Success", description: "Password updated successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const sendEmailCodeMutation = useMutation({
    mutationFn: async (data: z.infer<typeof emailSchema>) => {
      setNewEmail(data.email);
      return apiRequest("POST", "/api/user/update-email/send-code", data);
    },
    onSuccess: () => {
      setEmailStep("verify");
      toast({ title: "Code Sent", description: "Please check your new email for a verification code." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const verifyEmailMutation = useMutation({
    mutationFn: async (data: z.infer<typeof verifyEmailSchema>) => {
      return apiRequest("POST", "/api/user/update-email/verify", { email: newEmail, code: data.code });
    },
    onSuccess: () => {
      setEmailStep("input");
      emailForm.reset();
      verifyForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Success", description: "Email updated successfully." });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (authLoading || prefLoading || !user) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navigation />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary/30" />
        </div>
      </div>
    );
  }

  const activeSystems = (systems || []).filter(s => s.isActive);

  return (
    <div className="min-h-screen bg-background pb-20 flex flex-col">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-8">
          <div className="bg-primary/10 p-3 rounded-full text-primary">
            <Settings className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-display font-bold">Settings</h1>
            <p className="text-muted-foreground">Customize your experience, {user.username}.</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Account Security Card */}
          <Card className="p-6 space-y-6">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Account Security</h2>
            </div>

            <div className="grid gap-8">
              {/* Email Change Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Mail className="w-4 h-4" />
                  <span>Update Email Address</span>
                </div>
                <p className="text-xs text-muted-foreground">Current email: {user.email}</p>

                {emailStep === "input" ? (
                  <Form {...emailForm}>
                    <form onSubmit={emailForm.handleSubmit((data) => sendEmailCodeMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={emailForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input placeholder="New email address" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button type="submit" variant="outline" size="sm" disabled={sendEmailCodeMutation.isPending}>
                        {sendEmailCodeMutation.isPending ? "Sending..." : "Send Verification Code"}
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <Form {...verifyForm}>
                    <form onSubmit={verifyForm.handleSubmit((data) => verifyEmailMutation.mutate(data))} className="space-y-4">
                      <FormField
                        control={verifyForm.control}
                        name="code"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Verification Code</FormLabel>
                            <FormControl>
                              <Input placeholder="6-digit code" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm" disabled={verifyEmailMutation.isPending}>
                          {verifyEmailMutation.isPending ? "Verifying..." : "Verify & Update"}
                        </Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => setEmailStep("input")}>
                          Cancel
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </div>

              {/* Password Change Section */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Lock className="w-4 h-4" />
                  <span>Change Password</span>
                </div>
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit((data) => updatePasswordMutation.mutate(data))} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="password" placeholder="New password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirmPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input type="password" placeholder="Confirm new password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" variant="outline" size="sm" disabled={updatePasswordMutation.isPending}>
                      {updatePasswordMutation.isPending ? "Updating..." : "Update Password"}
                    </Button>
                  </form>
                </Form>
              </div>
            </div>
          </Card>

          <Card className="p-6 space-y-5">
            <div className="flex items-center gap-2">
              <Star className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold">Scoring Preferences</h2>
            </div>

            <div className="space-y-3">
              <Label>Preferred Scoring System</Label>
              <p className="text-sm text-muted-foreground">Community scores will be shown using this system. Your scores can use any system.</p>
              {activeSystems.length > 0 ? (
                <Select value={selectedSystem} onValueChange={setSelectedSystem}>
                  <SelectTrigger data-testid="select-preferred-scoring">
                    <SelectValue placeholder="Choose a scoring system" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeSystems.map(s => (
                      <SelectItem key={s.id} value={String(s.id)}>{s.name} (1-{s.maxScore})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <p className="text-sm text-muted-foreground italic">No scoring systems available yet.</p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                onClick={() => updatePrefMutation.mutate({ preferredScoringSystemId: selectedSystem ? Number(selectedSystem) : null })}
                disabled={updatePrefMutation.isPending}
                data-testid="button-save-preferences"
              >
                {updatePrefMutation.isPending ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </Card>
        </div>
      </div>
      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}
