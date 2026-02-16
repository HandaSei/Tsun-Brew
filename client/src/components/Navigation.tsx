import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Leaf, 
  User as UserIcon, 
  LogOut, 
  ShieldCheck,
  Menu,
  Sun,
  Moon,
  Sunset
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/components/ThemeProvider";
import { AuthModal } from "@/components/AuthModal";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import type { SiteSettings } from "@shared/schema";

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const { resolvedTheme, cycleTheme } = useTheme();

  // Force AuthModal if user has temporary password
  const finalAuthOpen = authOpen || !!user?.passwordIsTemporary;
  const setFinalAuthOpen = (open: boolean) => {
    if (user?.passwordIsTemporary) return; // Cannot close if password is temporary
    setAuthOpen(open);
  };

  const { data: siteSettings } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
  });

  const siteName = siteSettings?.siteName || "Tsun Brew";
  const statusTag = siteSettings?.statusTag || "";
  const logoUrl = siteSettings?.logoUrl || "";

  const themeIcon = resolvedTheme === "light" ? <Sun className="w-4 h-4" /> 
    : resolvedTheme === "dusk" ? <Sunset className="w-4 h-4" /> 
    : <Moon className="w-4 h-4" />;
  const themeLabel = resolvedTheme === "light" ? "Light" : resolvedTheme === "dusk" ? "Dusk" : "Dark";

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const isActive = location === href;
    return (
      <Link href={href} className={`
        relative px-3 py-2 text-sm font-medium transition-colors
        ${isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}
      `}>
        {children}
        {isActive && (
          <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-full" />
        )}
      </Link>
    );
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-[4.5rem] flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 group">
          {logoUrl ? (
            <img src={logoUrl} alt={siteName} className="w-12 h-12 object-contain" />
          ) : (
            <div className="bg-primary/10 p-2 rounded-full text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
              <Leaf className="w-5 h-5" />
            </div>
          )}
          <span className="font-display text-2xl font-bold tracking-tight text-foreground">
            {siteName}
          </span>
          {statusTag && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal text-muted-foreground border-border/60">
              {statusTag}
            </Badge>
          )}
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <NavLink href="/">Discovery</NavLink>
          {user && <NavLink href={`/${user.username}/Collection`}>My Tea List</NavLink>}
          {user?.role === 'admin' && <NavLink href="/admin">Admin</NavLink>}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/settings" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer" data-testid="link-user-settings">
                {user.username}
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={cycleTheme}
                title={`Theme: ${themeLabel}`}
                data-testid="button-theme-toggle"
              >
                {themeIcon}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => logout.mutate()}
                title="Log out"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={cycleTheme}
                title={`Theme: ${themeLabel}`}
                data-testid="button-theme-toggle"
              >
                {themeIcon}
              </Button>
              <Button
                size="sm"
                className="font-medium px-6 rounded-full shadow-lg shadow-primary/20 transition-all"
                onClick={() => setAuthOpen(true)}
                data-testid="button-sign-in"
              >
                Sign In
              </Button>
            </div>
          )}
        </div>

        <div className="md:hidden flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={cycleTheme}
            data-testid="button-theme-toggle-mobile"
          >
            {themeIcon}
          </Button>
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <div className="flex flex-col gap-6 mt-8">
                <Link href="/" onClick={() => setIsOpen(false)} className="text-lg font-medium">Discovery</Link>
                {user && (
                  <Link href={`/${user.username}/Collection`} onClick={() => setIsOpen(false)} className="text-lg font-medium">My Tea List</Link>
                )}
                {user?.role === 'admin' && (
                  <Link href="/admin" onClick={() => setIsOpen(false)} className="text-lg font-medium text-primary">Admin Panel</Link>
                )}
                {user && (
                  <Link href="/settings" onClick={() => setIsOpen(false)} className="text-lg font-medium" data-testid="link-user-settings-mobile">Settings</Link>
                )}
                
                <div className="h-px bg-border my-2" />
                
                {user ? (
                  <Button variant="destructive" className="w-full justify-start" onClick={() => {
                    logout.mutate();
                    setIsOpen(false);
                  }}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                ) : (
                  <Button className="w-full" onClick={() => { setIsOpen(false); setAuthOpen(true); }} data-testid="button-sign-in-mobile">
                    Sign In
                  </Button>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <AuthModal open={finalAuthOpen} onOpenChange={setFinalAuthOpen} />
    </header>
  );
}
