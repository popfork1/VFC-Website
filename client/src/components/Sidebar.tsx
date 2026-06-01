import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Home, Shield, LogOut, LogIn, Tv2, Users } from "lucide-react";
import { createContext, useContext, useState, ReactNode } from "react";

interface SidebarContextType {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    return { collapsed: false, setCollapsed: () => {} };
  }
  return context;
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <SidebarContext.Provider value={{ collapsed, setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function Sidebar() {
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const isAdmin = isAuthenticated && (user as any)?.role === "admin";

  const navItems = [
    { path: "/", label: "Home", icon: Home },
    { path: "/scores", label: "Scores", icon: Tv2 },
    { path: "/teams", label: "Teams", icon: Users },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-background/80 backdrop-blur-xl border-b border-border/50 z-[100]">
      <div className="h-full px-6 flex items-center gap-8">
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer group flex-shrink-0">
            <div className="p-1.5 bg-primary rounded-lg shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
              <Tv2 className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-black tracking-tight uppercase italic">VFC</h1>
          </div>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path}>
                <Button
                  variant="ghost"
                  className={`h-9 px-4 font-bold uppercase tracking-wider text-[11px] rounded-lg transition-all ${
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 ml-auto">
          {isAdmin && (
            <Link href="/admin">
              <Button
                variant="outline"
                size="sm"
                className="font-bold uppercase tracking-wider text-[10px] border-primary/20 hover:bg-primary/5"
              >
                <Shield className="w-3.5 h-3.5 mr-2" />
                Admin
              </Button>
            </Link>
          )}

          {isAuthenticated ? (
            <a href="/api/logout">
              <Button variant="ghost" size="icon" className="w-9 h-9 text-muted-foreground hover:text-destructive rounded-lg">
                <LogOut className="w-4 h-4" />
              </Button>
            </a>
          ) : (
            <Link href="/login">
              <Button className="h-9 px-6 font-bold uppercase tracking-wider text-[11px] rounded-lg shadow-lg shadow-primary/20">
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>

      <nav className="lg:hidden flex items-center justify-center border-t border-border/50 bg-background/50 backdrop-blur-md h-16 px-4 gap-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;
          return (
            <Link key={item.path} href={item.path}>
              <Button
                variant="ghost"
                className={`h-12 px-6 font-bold uppercase tracking-wider text-[12px] rounded-xl transition-all flex-shrink-0 ${
                  isActive
                    ? 'text-primary bg-primary/10 border border-primary/20'
                    : 'text-muted-foreground'
                }`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {item.label}
              </Button>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
