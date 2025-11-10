import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Beaker, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import { PageTransition } from "@/components/layout/PageTransition";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const canSubmit = useMemo(() => username.trim().length > 0 && password.trim().length > 0, [username, password]);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await login(username.trim(), password.trim());
      toast({
        title: "Welcome back",
        description: "You are now connected to the laboratory dashboard.",
      });
      setLocation("/");
    } catch (error) {
      setErrorMessage((error as Error).message || "Invalid username or password.");
      toast({
        title: "Login blocked",
        description: "Invalid username or password.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-lg shadow-2xl border-0 backdrop-blur-lg bg-white/90 dark:bg-slate-900/90">
          <CardHeader className="space-y-6 text-center">
            <div className="mx-auto w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center backdrop-blur">
              <Beaker className="h-10 w-10 text-primary" />
            </div>
            <div>
              <CardTitle className="text-3xl font-semibold tracking-tight">Laboratory Access Portal</CardTitle>
              <CardDescription className="text-base mt-2 text-muted-foreground">
                Sign in to manage tests, patients, reports, and results securely.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="grid gap-2 text-left">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Enter KAROZH"
                  autoComplete="username"
                  aria-describedby={errorMessage ? "login-error" : undefined}
                  disabled={isSubmitting}
                  required
                />
              </div>
              <div className="grid gap-2 text-left">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  aria-describedby={errorMessage ? "login-error" : undefined}
                  disabled={isSubmitting}
                  required
                />
              </div>
              {errorMessage && (
                <div id="login-error" className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  <Lock className="h-4 w-4" />
                  <span>{errorMessage}</span>
                </div>
              )}
              <Button type="submit" className="w-full h-12 text-base font-medium" disabled={!canSubmit || isSubmitting}>
                {isSubmitting ? "Authenticating…" : "Sign In"}
              </Button>
            </form>
            <div className="rounded-lg bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Access Policy</p>
              <p>System access requires the official credentials. Attempts with invalid details will be blocked immediately.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageTransition>
  );
}
