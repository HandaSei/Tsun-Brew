import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Leaf, ArrowLeft, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("login");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader className="text-center pb-2">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-2 text-primary-foreground">
            <Leaf className="w-6 h-6" />
          </div>
          <DialogTitle className="text-2xl font-display">
            {user?.passwordIsTemporary ? "Security Update" : "Welcome to Tsun Brew"}
          </DialogTitle>
        </DialogHeader>
        {user?.passwordIsTemporary ? (
          <UpdatePasswordForm />
        ) : showForgotPassword ? (
          <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <LoginForm onSuccess={() => onOpenChange(false)} onForgotPassword={() => setShowForgotPassword(true)} />
            </TabsContent>
            <TabsContent value="register">
              <RegisterForm onSuccess={() => onOpenChange(false)} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

function UpdatePasswordForm() {
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();
  
  const form = useForm({
    resolver: zodResolver(z.object({
      password: z.string().min(6, "Password must be at least 6 characters"),
      confirmPassword: z.string().min(6, "Password must be at least 6 characters"),
    }).refine(data => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    })),
    defaultValues: { password: "", confirmPassword: "" }
  });

  const onSubmit = async (data: any) => {
    setUpdating(true);
    try {
      const res = await apiRequest("POST", "/api/user/update-password", { password: data.password });
      if (!res.ok) {
        const body = await res.json();
        toast({ title: "Error", description: body.message, variant: "destructive" });
        return;
      }
      toast({ title: "Success", description: "Password updated successfully." });
      window.location.reload();
    } catch (err) {
      toast({ title: "Error", description: "Failed to update password", variant: "destructive" });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="text-center mb-2">
        <p className="text-sm text-muted-foreground">
          You are using a temporary password. Please set a new permanent password to secure your account.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>New Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Min 6 characters" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm New Password</FormLabel>
                <FormControl>
                  <Input type="password" placeholder="Repeat new password" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={updating}>
            {updating ? "Updating..." : "Update Password"}
          </Button>
        </form>
      </Form>
    </div>
  );
}

function LoginForm({ onSuccess, onForgotPassword }: { onSuccess: () => void; onForgotPassword: () => void }) {
  const { login } = useAuth();
  const form = useForm({
    defaultValues: { username: "", password: "" }
  });

  const onSubmit = (data: any) => {
    login.mutate(data, {
      onSuccess: () => {
        // Force a theme refresh on login success and clear any potential cached CSS state
        localStorage.removeItem("tsun-brew-theme-reset-v6"); // Force the v6 reset logic
        window.dispatchEvent(new CustomEvent("tsun-brew-theme-refresh"));
        onSuccess();
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Enter your username" {...field} data-testid="input-login-username" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Enter your password" {...field} data-testid="input-login-password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={login.isPending} data-testid="button-login-submit">
          {login.isPending ? "Logging in..." : "Login"}
        </Button>
        <div className="text-center">
          <button
            type="button"
            onClick={onForgotPassword}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-forgot-password"
          >
            Forgot password or username?
          </button>
        </div>
      </form>
    </Form>
  );
}

const registerStep1Schema = z.object({
  email: z.string().email("Please enter a valid email address"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const verifyCodeSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [step, setStep] = useState<"details" | "verify">("details");
  const [registrationData, setRegistrationData] = useState({ email: "", username: "", password: "" });
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const { toast } = useToast();

  const detailsForm = useForm({
    resolver: zodResolver(registerStep1Schema),
    defaultValues: { email: "", username: "", password: "" }
  });

  const verifyForm = useForm({
    resolver: zodResolver(verifyCodeSchema),
    defaultValues: { code: "" }
  });

  const onSendCode = async (data: { email: string; username: string; password: string }) => {
    setSendingCode(true);
    try {
      const res = await apiRequest("POST", "/api/register/send-code", {
        email: data.email,
        username: data.username,
      });
      if (!res.ok) {
        const body = await res.json();
        toast({ title: "Error", description: body.message, variant: "destructive" });
        return;
      }
      setRegistrationData(data);
      setStep("verify");
      toast({ title: "Code sent", description: "Check your email for the verification code." });
    } catch (err: any) {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSendingCode(false);
    }
  };

  const onVerify = async (data: { code: string }) => {
    setVerifying(true);
    try {
      const res = await apiRequest("POST", "/api/register/verify", {
        ...registrationData,
        code: data.code,
      });
      if (!res.ok) {
        const body = await res.json();
        toast({ title: "Error", description: body.message, variant: "destructive" });
        return;
      }
      toast({ title: "Welcome!", description: "Your account has been created." });
      // Trigger a theme refresh event before reloading to ensure the next session starts clean
      window.dispatchEvent(new CustomEvent("tsun-brew-theme-refresh"));
      window.location.reload();
    } catch (err: any) {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setVerifying(false);
    }
  };

  const onResendCode = async () => {
    setSendingCode(true);
    try {
      const res = await apiRequest("POST", "/api/register/send-code", {
        email: registrationData.email,
        username: registrationData.username,
      });
      if (!res.ok) {
        const body = await res.json();
        toast({ title: "Error", description: body.message, variant: "destructive" });
        return;
      }
      toast({ title: "Code resent", description: "A new code has been sent to your email." });
    } catch (err: any) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setSendingCode(false);
    }
  };

  if (step === "verify") {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Button size="icon" variant="ghost" onClick={() => setStep("details")} data-testid="button-back-to-details">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-muted-foreground">Back to details</span>
        </div>
        <div className="text-center space-y-2 mb-4">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">
            We sent a 6-digit code to <strong>{registrationData.email}</strong>
          </p>
        </div>
        <Form {...verifyForm}>
          <form onSubmit={verifyForm.handleSubmit(onVerify)} className="space-y-4">
            <FormField
              control={verifyForm.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Verification Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      {...field}
                      data-testid="input-verify-code"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={verifying} data-testid="button-verify-submit">
              {verifying ? "Verifying..." : "Verify & Create Account"}
            </Button>
            <div className="text-center">
              <button
                type="button"
                onClick={onResendCode}
                disabled={sendingCode}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                data-testid="button-resend-code"
              >
                {sendingCode ? "Sending..." : "Didn't get the code? Resend"}
              </button>
            </div>
          </form>
        </Form>
      </div>
    );
  }

  return (
    <Form {...detailsForm}>
      <form onSubmit={detailsForm.handleSubmit(onSendCode)} className="space-y-4">
        <FormField
          control={detailsForm.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="your@email.com" {...field} data-testid="input-register-email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={detailsForm.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
              <FormControl>
                <Input placeholder="Choose a username" {...field} data-testid="input-register-username" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={detailsForm.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input type="password" placeholder="Create a password (min 6 chars)" {...field} data-testid="input-register-password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={sendingCode} data-testid="button-register-submit">
          {sendingCode ? "Sending code..." : "Send Verification Code"}
        </Button>
      </form>
    </Form>
  );
}

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" }
  });

  const onSubmit = async (data: { email: string }) => {
    setSending(true);
    try {
      const res = await apiRequest("POST", "/api/forgot-password", data);
      if (!res.ok) {
        const body = await res.json();
        toast({ title: "Error", description: body.message, variant: "destructive" });
        return;
      }
      setSent(true);
    } catch (err: any) {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-4 text-center py-4">
        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <Mail className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="font-medium">Check your email</p>
          <p className="text-sm text-muted-foreground mt-1">
            If an account exists with that email, we've sent your username and a temporary password.
          </p>
        </div>
        <Button variant="outline" onClick={onBack} className="w-full" data-testid="button-back-to-login">
          Back to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Button size="icon" variant="ghost" onClick={onBack} data-testid="button-back-from-forgot">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <span className="text-sm text-muted-foreground">Back to login</span>
      </div>
      <div className="text-center mb-2">
        <p className="text-sm text-muted-foreground">
          Enter your email and we'll send your username and a temporary password.
        </p>
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="your@email.com" {...field} data-testid="input-forgot-email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full" disabled={sending} data-testid="button-forgot-submit">
            {sending ? "Sending..." : "Send Recovery Email"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
