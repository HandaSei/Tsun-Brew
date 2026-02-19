import { useState, useMemo } from "react";
import { useCultivars } from "@/hooks/use-cultivars";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, X, Leaf, ChevronLeft, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CultivarSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
}

const PAGE_SIZE = 6;

export function CultivarSelect({ value, onChange, placeholder = "Select cultivars" }: CultivarSelectProps) {
  const { data: cultivars } = useCultivars();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!cultivars) return [];
    if (!search.trim()) return cultivars;
    const q = search.toLowerCase();
    return cultivars.filter(c => c.name.toLowerCase().includes(q));
  }, [cultivars, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleToggle = (name: string) => {
    if (value.includes(name)) {
      onChange(value.filter(v => v !== name));
    } else {
      onChange([...value, name]);
    }
  };

  const handleRemove = (name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    onChange(value.filter(v => v !== name));
  };

  const handleOpen = () => {
    setSearch("");
    setPage(1);
    setOpen(true);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full justify-between font-normal min-h-9 h-auto"
        onClick={handleOpen}
        data-testid="button-cultivar-select"
      >
        {value.length > 0 ? (
          <div className="flex items-center gap-1 flex-wrap py-0.5">
            {value.map(v => (
              <Badge key={v} variant="secondary" className="text-xs gap-1">
                {v}
                <X className="w-3 h-3 cursor-pointer" onClick={(e) => handleRemove(v, e)} />
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <Leaf className="w-4 h-4 shrink-0 opacity-50 ml-2" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Cultivars</DialogTitle>
            <DialogDescription className="sr-only">Choose one or more cultivars for this tea</DialogDescription>
          </DialogHeader>

          {value.length > 0 && (
            <div className="flex items-center gap-1 flex-wrap">
              {value.map(v => (
                <Badge key={v} variant="secondary" className="text-xs gap-1">
                  {v}
                  <X className="w-3 h-3 cursor-pointer" onClick={() => handleRemove(v)} />
                </Badge>
              ))}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search cultivars..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9"
              data-testid="input-cultivar-search"
              autoFocus
            />
          </div>

          <ScrollArea className="max-h-[280px]">
            <div className="space-y-1">
              {pageItems.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No cultivars found
                </p>
              ) : (
                pageItems.map((c) => {
                  const isSelected = value.includes(c.name);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleToggle(c.name)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover-elevate ${
                        isSelected
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-foreground"
                      }`}
                      data-testid={`cultivar-option-${c.id}`}
                    >
                      {c.name}
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                data-testid="button-cultivar-prev"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Prev
              </Button>
              <span className="text-xs text-muted-foreground">
                {page} / {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                data-testid="button-cultivar-next"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          <div className="flex justify-between pt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { onChange([]); }}
              data-testid="button-cultivar-clear"
            >
              Clear All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              data-testid="button-cultivar-close"
            >
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
