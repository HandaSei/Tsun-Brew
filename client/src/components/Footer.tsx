import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Leaf } from "lucide-react";
import type { SiteSettings, FooterLink } from "@shared/schema";

export function Footer() {
  const { data: siteSettings } = useQuery<SiteSettings>({
    queryKey: ["/api/site-settings"],
  });

  const { data: footerLinks } = useQuery<FooterLink[]>({
    queryKey: ["/api/footer-links"],
  });

  const siteName = siteSettings?.siteName || "Tsun Brew";
  const logoUrl = siteSettings?.logoUrl || "";

  return (
    <footer className="w-full border-t border-border/60 bg-background" data-testid="footer">
      <div className="container mx-auto px-4 py-10">
        <div className="flex flex-col md:flex-row items-start justify-between gap-8">
          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="w-[4.5rem] h-[4.5rem] object-contain" data-testid="img-footer-logo" />
            ) : (
              <div className="bg-primary/10 p-3 rounded-full text-primary">
                <Leaf className="w-8 h-8" />
              </div>
            )}
            <span className="font-display text-2xl font-bold tracking-tight text-foreground">
              {siteName}
            </span>
          </div>

          {footerLinks && footerLinks.length > 0 && (
            <nav className="flex flex-wrap gap-x-6 gap-y-2" data-testid="nav-footer-links">
              {footerLinks.map((link) => (
                <Link
                  key={link.id}
                  href={`/page/${link.pageSlug}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                  data-testid={`link-footer-${link.pageSlug}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-border/40 text-center">
          <p className="text-xs text-muted-foreground">
            {new Date().getFullYear()} {siteName}
          </p>
        </div>
      </div>
    </footer>
  );
}
