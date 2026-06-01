import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { AlertCircle, UserCircle, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isSignup) {
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setIsLoading(false);
          return;
        }

        const response = await fetch("/api/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          toast({ title: "Success", description: "Account created successfully!" });
          setTimeout(() => setLocation("/"), 100);
        } else {
          const data = await response.json();
          setError(data.message || "Failed to create account");
        }
      } else {
        const response = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          toast({ title: "Success", description: "Logged in successfully" });
          setTimeout(() => setLocation("/"), 100);
        } else {
          setError("Invalid username or password");
        }
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-background to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent opacity-20 blur-2xl group-hover:opacity-30 transition-opacity duration-1000" />
        
        <Card className="relative overflow-hidden p-8 md:p-10 bg-card/40 backdrop-blur-3xl border-border/40 rounded-[40px] shadow-2xl">
          <div className="mb-10 text-center space-y-4">
            <Badge className="bg-primary/10 text-primary border-none px-4 py-1.5 text-[10px] font-black uppercase tracking-widest">
              <Sparkles className="w-3.5 h-3.5 mr-2" />
              VFC Fan Hub
            </Badge>
            <h1 className="text-4xl font-black italic uppercase tracking-tighter">
              {isSignup ? "Join the" : "Welcome"} <span className="text-primary">Back</span>
            </h1>
            <p className="text-muted-foreground font-medium">
              {isSignup ? "Create your legacy in the hub" : "Sign in to access your dashboard"}
            </p>
          </div>

          {error && (
            <div className="mb-8 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl flex gap-3 items-center animate-in fade-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
              <p className="text-xs font-bold text-destructive uppercase tracking-wide">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Username</Label>
              <div className="relative group/field">
                <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within/field:text-primary transition-colors" />
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="TheG.O.A.T"
                  className="pl-11 h-12 bg-background/50 border-border/40 rounded-2xl focus:ring-primary/20"
                  data-testid="input-username"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Password</Label>
              <div className="relative group/field">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within/field:text-primary transition-colors" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="pl-11 h-12 bg-background/50 border-border/40 rounded-2xl focus:ring-primary/20"
                  data-testid="input-password"
                  disabled={isLoading}
                  required
                />
              </div>
            </div>

            {isSignup && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                <Label htmlFor="confirm-password" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Confirm Password</Label>
                <div className="relative group/field">
                  <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within/field:text-primary transition-colors" />
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-11 h-12 bg-background/50 border-border/40 rounded-2xl focus:ring-primary/20"
                    data-testid="input-confirm-password"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-14 rounded-2xl font-black uppercase tracking-widest text-xs bg-primary hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20"
              disabled={isLoading}
              data-testid={isSignup ? "button-signup" : "button-login"}
            >
              {isLoading ? "Processing..." : (
                <span className="flex items-center gap-2">
                  {isSignup ? "Create Account" : "Sign In"}
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </form>

          <div className="mt-10 text-center">
            <p className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
              {isSignup ? "Already have an account?" : "New to the league?"}
            </p>
            <button
              onClick={() => {
                setIsSignup(!isSignup);
                setError("");
                setUsername("");
                setPassword("");
                setConfirmPassword("");
              }}
              className="mt-2 text-primary hover:text-primary/80 font-black uppercase tracking-tighter italic text-lg transition-colors"
              disabled={isLoading}
            >
              {isSignup ? "Sign In Instead" : "Create Account"}
            </button>
          </div>
          
          <div className="absolute -bottom-12 -right-12 text-[120px] opacity-[0.03] select-none font-black italic pointer-events-none">VFC</div>
        </Card>
      </div>
    </div>
  );
}
