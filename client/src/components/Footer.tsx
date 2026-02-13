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

  const sortedLinks = [...(footerLinks || [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  const columns: FooterLink[][] = [];
  for (let i = 0; i < sortedLinks.length; i += 3) {
    columns.push(sortedLinks.slice(i, i + 3));
  }

  return (
    <footer className="w-full border-t border-border/60 bg-background" data-testid="footer">
      <div className="px-6 py-10 flex items-end justify-between gap-8">
        <div className="flex items-start gap-10">
          <div className="flex items-center gap-3 shrink-0">
            {logoUrl ? (
              <img src={logoUrl} alt={siteName} className="w-[7.5rem] h-[7.5rem] object-contain" data-testid="img-footer-logo" />
            ) : (
              <div className="bg-primary/10 p-4 rounded-full text-primary">
                <Leaf className="w-14 h-14" />
              </div>
            )}
            <span className="font-display text-2xl font-bold tracking-tight text-foreground">
              {siteName}
            </span>
          </div>

          {columns.length > 0 && (
            <nav className="flex gap-8 pt-2" data-testid="nav-footer-links">
              {columns.map((col, colIdx) => (
                <div key={colIdx} className="flex flex-col gap-2">
                  {col.map((link) => (
                    <Link
                      key={link.id}
                      href={`/page/${link.pageSlug}`}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap"
                      data-testid={`link-footer-${link.pageSlug}`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              ))}
            </nav>
          )}
        </div>

        <p className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
          {new Date().getFullYear()} {siteName}
        </p>
      </div>
    </footer>
  );
}
