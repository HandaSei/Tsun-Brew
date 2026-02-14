import { Link } from "wouter";
import { Tea } from "@shared/schema";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Droplet, Leaf } from "lucide-react";
import { useTeaTypes, getTeaTypeColor } from "@/hooks/use-tea-types";

interface TeaCardProps {
  tea: Tea;
}

export function TeaCard({ tea }: TeaCardProps) {
  const { data: teaTypes } = useTeaTypes();
  const typeColor = getTeaTypeColor(teaTypes, tea.type);

  return (
    <Link href={`/tea/${tea.id}`} className="block group">
      <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/60" data-testid={`card-tea-${tea.id}`}>
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
            <Badge variant="outline" className="font-medium" style={typeColor.style} data-testid={`badge-type-${tea.id}`}>{tea.type}</Badge>
          </div>
        </div>
        
        <div className="p-5">
          <h3 className="font-display text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
            {tea.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
            {tea.description}
          </p>
          
          <div className="flex items-center justify-between gap-2 flex-wrap text-xs font-medium text-muted-foreground pt-4 border-t border-border/50">
            <span className="flex items-center gap-1">
              <Droplet className="w-3.5 h-3.5" />
              {tea.origin || "Unknown Origin"}
            </span>
            <span>
              {(tea.averageScore ?? 0) > 0 ? `Score: ${tea.averageScore}%` : "No ratings"}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
