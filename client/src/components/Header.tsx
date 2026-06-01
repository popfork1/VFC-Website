import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Menu, X, Shield, Moon, Sun, Zap, Calendar, Trophy, BarChart3, Newspaper, Target, Users, BookOpen, Settings } from "lucide-react";
import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

export function Header() {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { path: "/scores", label: "Scores", icon: Zap },
    { path: "/schedule", label: "Schedule", icon: Calendar },
    { path: "/playoffs", label: "Playoffs", icon: Trophy },
    { path: "/standings", label: "Standings", icon: BarChart3 },
    { path: "/previous-weeks", label: "Archives", icon: Calendar },
    { path: "/news", label: "News", icon: Newspaper },
    { path: "/changelogs", label: "Updates", icon: BookOpen },
    { path: "/social", label: "Social", icon: Target },
    { path: "/partners", label: "Partners", icon: Users },
    { path: "/settings", label: "Settings", icon: Settings },
    { path: "/admin", label: "Admin", icon: Shield },
    { path: "/api/logout", label: "Logout", icon: X },
  ];

  return (
    <header className="sticky top-0 z-[10000] w-full border-b-2 border-primary/20 bg-background/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto w-full flex justify-start pl-16 pr-4">
        <div className="flex h-16 items-center justify-start gap-2 md:gap-4 w-full">
          <Link href="/" data-testid="link-home" className="flex-shrink-0 group">
            <div className="flex items-center gap-1 md:gap-2">
              <span className="text-xl md:text-2xl font-bold">⚡</span>
              <h1 className="text-lg md:text-xl font-black text-foreground group-hover:text-primary transition-colors px-1 md:px-2 py-1 rounded-lg whitespace-nowrap">
                VFG Fan Hub
              </h1>
            </div>
          </Link>

          <nav className="hidden lg:flex items-center justify-start flex-1 gap-0.5 h-10 bg-muted/30 rounded-full px-1.5 mx-2 overflow-hidden">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              // Skip logout in the main nav to save space
              if (item.path === "/api/logout") return null;
              
              return (
                <Link key={item.path} href={item.path} data-testid={`link-nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className={`h-8 px-2.5 font-bold gap-1 transition-all rounded-full ${isActive ? 'shadow-md shadow-primary/25' : 'hover:bg-primary/10'}`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[11px] uppercase tracking-tight whitespace-nowrap">{item.label}</span>
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 ml-auto">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="relative overflow-hidden group"
              data-testid="button-theme-toggle"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-yellow-400 group-hover:rotate-180 transition-transform duration-500" />
              ) : (
                <Moon className="w-5 h-5 group-hover:-rotate-12 transition-transform duration-300" />
              )}
            </Button>

            {isAuthenticated && (
              <Link href="/admin" data-testid="link-admin">
                <Button variant="outline" size="sm" className="hidden lg:flex gap-2 border-primary/30 hover:border-primary hover:bg-primary/10">
                  <Shield className="w-4 h-4" />
                  Admin
                </Button>
              </Link>
            )}

            {isAuthenticated ? (
              <a href="/api/logout" data-testid="link-logout">
                <Button variant="outline" size="sm" className="hidden lg:flex border-destructive/30 hover:border-destructive hover:bg-destructive/10">
                  Logout
                </Button>
              </a>
            ) : (
              <a href="/login" data-testid="link-login">
                <Button size="sm" className="hidden lg:flex gap-2 shadow-lg shadow-primary/25">
                  Login
                </Button>
              </a>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile horizontal scrollable nav - Always visible on mobile below lg breakpoint */}
        <div className="lg:hidden flex overflow-x-auto no-scrollbar py-2 px-4 gap-2 border-t border-primary/10 bg-background/50 sticky top-[64px] z-40">
          {navItems.filter(item => {
            if (item.path === "/admin") return isAuthenticated;
            if (item.path === "/api/logout") return isAuthenticated;
            return true;
          }).map((item) => {
            const Icon = item.icon;
            const isActive = location === item.path;
            return (
              <Link key={item.path} href={item.path} className="flex-shrink-0">
                <Button
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  className={`h-9 px-4 text-sm font-medium gap-2 transition-all whitespace-nowrap ${isActive ? 'shadow-md shadow-primary/20' : 'hover:bg-primary/10'}`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 pt-2 space-y-1 border-t border-primary/10 animate-in slide-in-from-top-2 duration-200 bg-background/95 backdrop-blur-md">
            <div className="max-h-[70vh] overflow-y-auto px-2">
              {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.path;
              return (
                <Link key={item.path} href={item.path} data-testid={`link-mobile-${item.label.toLowerCase().replace(/\s+/g, '-')}`}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="default"
                    className={`w-full justify-start gap-3 font-medium h-12 ${isActive ? 'shadow-md shadow-primary/20' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Button>
                </Link>
              );
            })}
            </div>
            
            <div className="border-t border-primary/10 pt-3 mt-3 px-2 space-y-1">
              {isAuthenticated && (
                <Link href="/admin" data-testid="link-mobile-admin">
                  <Button
                    variant="ghost"
                    size="default"
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Shield className="w-5 h-5 flex-shrink-0" />
                    <span>Admin Dashboard</span>
                  </Button>
                </Link>
              )}

              {isAuthenticated ? (
                <a href="/api/logout" data-testid="link-mobile-logout" className="block">
                  <Button
                    variant="outline"
                    size="default"
                    className="w-full justify-start h-12 border-destructive/30"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Logout
                  </Button>
                </a>
              ) : (
                <a href="/login" data-testid="link-mobile-login" className="block">
                  <Button
                    size="default"
                    className="w-full justify-start h-12"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Login to your account
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
