import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { Sidebar, SidebarProvider } from "@/components/Sidebar";
import { ThemeProvider } from "@/components/ThemeProvider";
import Landing from "@/pages/Landing";
import Teams from "@/pages/Teams";
import TeamDetail from "@/pages/TeamDetail";
import Scores from "@/pages/Scores";
import AdminDashboard from "@/pages/AdminDashboard";
import Login from "@/pages/Login";
import GameDetail from "@/pages/GameDetail";
import NotFound from "@/pages/not-found";

function MainContent() {
  const { isAuthenticated, user, isLoading } = useAuth();
  const isAdmin = isAuthenticated && (user as any)?.role === "admin";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">⚡</div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="min-h-screen pt-[136px] lg:pt-16 pb-20 md:pb-0">
        <Switch>
          <Route path="/" component={Landing} />
          <Route path="/login" component={Login} />
          <Route path="/scores" component={Scores} />
          <Route path="/game/:id" component={GameDetail} />
          <Route path="/teams" component={Teams} />
          <Route path="/teams/:name" component={TeamDetail} />
          {isAdmin && <Route path="/admin" component={AdminDashboard} />}
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SidebarProvider>
          <TooltipProvider>
            <Toaster />
            <MainContent />
          </TooltipProvider>
        </SidebarProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
