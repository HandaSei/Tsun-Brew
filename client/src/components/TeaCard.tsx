import { Link } from "wouter";
import { Tea } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplet, Leaf } from "lucide-react";

interface TeaCardProps {
  tea: Tea;
}

export function TeaCard({ tea }: TeaCardProps) {
  // Map tea types to colors
  const typeColors: Record<string, string> = {
    Green: "bg-green-100 text-green-800 border-green-200",
    Black: "bg-red-950/10 text-red-950 border-red-900/20",
    Oolong: "bg-amber-100 text-amber-800 border-amber-200",
    White: "bg-slate-100 text-slate-700 border-slate-200",
    Yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
    Dark: "bg-stone-800 text-stone-100 border-stone-700",
  };

  const badgeClass = typeColors[tea.type] || "bg-primary/10 text-primary";

  return (
    <Link href={`/tea/${tea.id}`} className="block group">
      <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 bg-white/70 backdrop-blur-sm border-primary/10">
        <div className="relative aspect-[4/3] overflow-hidden">
          {tea.photoUrl ? (
            <img 
              src={tea.photoUrl} 
              alt={tea.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center text-primary/20">
              <Leaf className="w-16 h-16" />
            </div>
          )}
          <div className="absolute top-3 left-3">
            <Badge className={`${badgeClass} border font-medium`}>{tea.type}</Badge>
          </div>
        </div>
        
        <div className="p-5">
          <h3 className="font-display text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
            {tea.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {tea.description}
          </p>
          
          <div className="flex items-center justify-between text-xs font-medium text-muted-foreground pt-4 border-t border-border/50">
            <span className="flex items-center gap-1">
              <Droplet className="w-3.5 h-3.5" />
              {tea.origin || "Unknown Origin"}
            </span>
            <span>
              {tea.averageScore > 0 ? `Score: ${tea.averageScore}%` : "No ratings"}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
