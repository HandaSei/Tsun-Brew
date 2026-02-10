import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { 
  Leaf, 
  Search, 
  User as UserIcon, 
  LogOut, 
  ShieldCheck,
  Menu,
  X
} from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function Navigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

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
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-white/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-primary/10 p-2 rounded-full text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
            <Leaf className="w-5 h-5" />
          </div>
          <span className="font-display text-2xl font-bold tracking-tight text-foreground">
            Tsun Brew
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          <NavLink href="/">Discovery</NavLink>
          {user && <NavLink href="/list">My Tea List</NavLink>}
          {user?.role === 'admin' && <NavLink href="/admin">Admin</NavLink>}
        </nav>

        {/* Auth Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground">
                Hi, {user.username}
              </span>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => logout.mutate()}
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <Link href="/auth">
              <Button size="sm" className="font-medium px-6 rounded-full shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all">
                Join Us
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden">
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
                  <Link href="/list" onClick={() => setIsOpen(false)} className="text-lg font-medium">My Tea List</Link>
                )}
                {user?.role === 'admin' && (
                  <Link href="/admin" onClick={() => setIsOpen(false)} className="text-lg font-medium text-primary">Admin Panel</Link>
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
                  <Link href="/auth" onClick={() => setIsOpen(false)}>
                    <Button className="w-full">Sign In</Button>
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
