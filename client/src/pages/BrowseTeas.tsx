import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useSearch, Link } from "wouter";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Leaf,
  Loader2,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  X,
  TrendingUp,
  Search,
  Tag,
} from "lucide-react";
import { useTeaTypes, getTeaTypeColor } from "@/hooks/use-tea-types";
import { useCultivars } from "@/hooks/use-cultivars";
import { useAuth } from "@/hooks/use-auth";
import type { Tea, TeaType, Cultivar } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const DESKTOP_LIMIT = 36;
const MOBILE_LIMIT = 18;

interface BrowseResponse {
  teas: (Tea & { typeColorHue?: number | null; typeColorSaturation?: number | null; typeColorLightness?: number | null })[];
  total: number;
  page: number;
  limit: number;
}

function TeaBrowseCard({ tea }: { tea: BrowseResponse["teas"][0] }) {
  const { data: teaTypes } = useTeaTypes();
  const typeColor = getTeaTypeColor(teaTypes, tea.type, tea as any);

  return (
    <Link href={`/${(tea as any).isCustom ? "custom-tea" : "tea"}/${(tea as any).slug}`} className="block group">
      <Card
        className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-border/60"
        data-testid={`browse-card-tea-${tea.id}`}
      >
        <div className="relative aspect-[3/4] overflow-hidden">
          {tea.photoUrl ? (
            <img
              src={tea.photoUrl}
              alt={tea.name}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center text-primary/20">
              <Leaf className="w-12 h-12" />
            </div>
          )}
          <div className="absolute top-2 left-2">
            <span
              className="inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold shadow-sm"
              style={typeColor.style}
              data-testid={`browse-badge-type-${tea.id}`}
            >
              {tea.type}
            </span>
          </div>
        </div>
        <div className="p-3">
          <h3 className="font-display text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors" data-testid={`browse-tea-name-${tea.id}`}>
            {tea.name}
          </h3>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {tea.origin || "Unknown Origin"}
          </p>
        </div>
      </Card>
    </Link>
  );
}

function SortSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Sort by</label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger data-testid="select-sort" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="latest" data-testid="sort-latest">Last Added</SelectItem>
          <SelectItem value="most_brewed" data-testid="sort-most-brewed">Most Brewed</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function TypeFilter({
  teaTypes,
  selectedTypes,
  onToggle,
  onClearAll,
}: {
  teaTypes: TeaType[];
  selectedTypes: string[];
  onToggle: (name: string) => void;
  onClearAll: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-sm font-medium text-foreground">Tea Types</label>
        {selectedTypes.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-clear-types"
          >
            Clear all
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {teaTypes.map((tt) => {
          const isSelected = selectedTypes.includes(tt.name.toLowerCase());
          const color = getTeaTypeColor([tt], tt.name);
          return (
            <button
              key={tt.id}
              onClick={() => onToggle(tt.name.toLowerCase())}
              className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer ${
                isSelected ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : "opacity-60 hover:opacity-100"
              }`}
              style={color.style}
              data-testid={`filter-type-${tt.name.toLowerCase()}`}
            >
              {tt.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const CULTIVAR_PAGE_SIZE = 30;
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

function CultivarFilterDialog({
  open,
  onOpenChange,
  cultivars,
  selectedCultivars,
  onToggle,
  onClearAll,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cultivars: Cultivar[];
  selectedCultivars: string[];
  onToggle: (name: string) => void;
  onClearAll: () => void;
}) {
  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  const sorted = useMemo(() => {
    return [...cultivars].sort((a, b) => a.name.localeCompare(b.name));
  }, [cultivars]);

  const filtered = useMemo(() => {
    let list = sorted;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q));
    }
    if (activeLetter) {
      list = list.filter(c => c.name.toUpperCase().startsWith(activeLetter));
    }
    return list;
  }, [sorted, search, activeLetter]);

  const totalPages = Math.ceil(filtered.length / CULTIVAR_PAGE_SIZE);
  const pageItems = filtered.slice((page - 1) * CULTIVAR_PAGE_SIZE, page * CULTIVAR_PAGE_SIZE);

  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    sorted.forEach(c => {
      const first = c.name.charAt(0).toUpperCase();
      if (/[A-Z]/.test(first)) letters.add(first);
    });
    return letters;
  }, [sorted]);

  useEffect(() => {
    setPage(1);
  }, [search, activeLetter]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Filter by Cultivar</DialogTitle>
          <DialogDescription className="sr-only">Select cultivars to filter the tea list</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search cultivars..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-cultivar-filter-search"
          />
        </div>

        <div className="flex flex-wrap gap-0.5">
          <button
            onClick={() => setActiveLetter(null)}
            className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
              activeLetter === null
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            data-testid="cultivar-letter-all"
          >
            All
          </button>
          {ALPHABET.map(letter => (
            <button
              key={letter}
              onClick={() => setActiveLetter(activeLetter === letter ? null : letter)}
              disabled={!availableLetters.has(letter)}
              className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
                activeLetter === letter
                  ? "bg-primary text-primary-foreground"
                  : availableLetters.has(letter)
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-muted-foreground/30 cursor-not-allowed"
              }`}
              data-testid={`cultivar-letter-${letter}`}
            >
              {letter}
            </button>
          ))}
        </div>

        <ScrollArea className="flex-1 min-h-0 max-h-[50vh]">
          <div className="space-y-0.5">
            {pageItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No cultivars found</p>
            ) : (
              pageItems.map((c) => {
                const isSelected = selectedCultivars.includes(c.name.toLowerCase());
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onToggle(c.name.toLowerCase())}
                    className={`w-full text-left px-3 py-1.5 rounded-md text-sm transition-colors ${
                      isSelected
                        ? "bg-primary/10 text-primary font-medium"
                        : "text-foreground hover-elevate"
                    }`}
                    data-testid={`cultivar-filter-option-${c.id}`}
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
              data-testid="cultivar-filter-prev"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Prev
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page} of {totalPages} ({filtered.length} cultivars)
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage(p => p + 1)}
              data-testid="cultivar-filter-next"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        )}

        <div className="flex justify-between pt-2 border-t border-border">
          {selectedCultivars.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearAll} data-testid="cultivar-filter-clear">
              Clear all ({selectedCultivars.length})
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => onOpenChange(false)}
            data-testid="cultivar-filter-done"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function CultivarFilter({
  selectedCultivars,
  onToggle,
  onClearAll,
}: {
  selectedCultivars: string[];
  onToggle: (name: string) => void;
  onClearAll: () => void;
}) {
  const { data: cultivars } = useCultivars();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (!cultivars || cultivars.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <label className="text-sm font-medium text-foreground">Cultivar</label>
        {selectedCultivars.length > 0 && (
          <button
            onClick={onClearAll}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-clear-cultivars"
          >
            Clear all
          </button>
        )}
      </div>
      <Button
        variant="outline"
        className="w-full justify-between"
        onClick={() => setDialogOpen(true)}
        data-testid="button-open-cultivar-filter"
      >
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4" />
          <span className="text-sm">
            {selectedCultivars.length > 0
              ? `${selectedCultivars.length} selected`
              : "Filter by cultivar"}
          </span>
        </div>
      </Button>

      <CultivarFilterDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cultivars={cultivars}
        selectedCultivars={selectedCultivars}
        onToggle={onToggle}
        onClearAll={onClearAll}
      />
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const getPages = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex items-center justify-center gap-1 flex-wrap mt-8" data-testid="pagination">
      <Button
        variant="outline"
        size="icon"
        disabled={page === 1}
        onClick={() => onPageChange(1)}
        data-testid="pagination-first"
      >
        <ChevronsLeft className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        disabled={page === 1}
        onClick={() => onPageChange(page - 1)}
        data-testid="pagination-prev"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>
      {getPages().map((p, idx) =>
        p === "..." ? (
          <span key={`dots-${idx}`} className="px-2 text-muted-foreground text-sm">
            ...
          </span>
        ) : (
          <Button
            key={p}
            variant={p === page ? "default" : "outline"}
            size="icon"
            onClick={() => onPageChange(p as number)}
            data-testid={`pagination-page-${p}`}
          >
            {p}
          </Button>
        )
      )}
      <Button
        variant="outline"
        size="icon"
        disabled={page === totalPages}
        onClick={() => onPageChange(page + 1)}
        data-testid="pagination-next"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        disabled={page === totalPages}
        onClick={() => onPageChange(totalPages)}
        data-testid="pagination-last"
      >
        <ChevronsRight className="w-4 h-4" />
      </Button>
    </div>
  );
}

function FilterSidebar({
  sort,
  onSortChange,
  teaTypes,
  selectedTypes,
  onToggleType,
  onClearTypes,
  selectedCultivars,
  onToggleCultivar,
  onClearCultivars,
  source,
  onSourceChange,
  showSourceSelector,
}: {
  sort: string;
  onSortChange: (v: string) => void;
  teaTypes: TeaType[];
  selectedTypes: string[];
  onToggleType: (name: string) => void;
  onClearTypes: () => void;
  selectedCultivars: string[];
  onToggleCultivar: (name: string) => void;
  onClearCultivars: () => void;
  source: "official" | "custom" | "all";
  onSourceChange: (v: "official" | "custom" | "all") => void;
  showSourceSelector: boolean;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-display font-bold text-foreground mb-1">
          Browse Teas
        </h2>
        <p className="text-xs text-muted-foreground">
          Explore the tea library
        </p>
      </div>

      <div className="space-y-4">
        <SortSelect value={sort} onChange={onSortChange} />
        
        <Button
          variant={sort === "trending" ? "default" : "outline"}
          className="w-full justify-between gap-2 h-9 group/trending"
          onClick={() => {
            if (sort === "trending") {
              onSortChange("latest");
            } else {
              onClearTypes();
              onSortChange("trending");
            }
          }}
          data-testid="button-filter-trending"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm font-medium">Trending Now</span>
          </div>
          {sort === "trending" && (
            <div 
              className="p-1 -mr-1 rounded-sm hover:bg-primary-foreground/20 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onSortChange("latest");
              }}
            >
              <X className="w-3.5 h-3.5" />
            </div>
          )}
        </Button>
      </div>

      {teaTypes.length > 0 && (
        <TypeFilter
          teaTypes={teaTypes}
          selectedTypes={selectedTypes}
          onToggle={onToggleType}
          onClearAll={onClearTypes}
        />
      )}

      <CultivarFilter
        selectedCultivars={selectedCultivars}
        onToggle={onToggleCultivar}
        onClearAll={onClearCultivars}
      />

      {showSourceSelector && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Tea Source</label>
          <div className="grid grid-cols-1 gap-1.5">
            {[
              { id: "official", label: "Official Database", description: "Standard teas only" },
              { id: "custom", label: "Your Additions", description: "Personal teas only" },
              { id: "all", label: "Everything", description: "Official & personal" },
            ].map((opt) => {
              const isDisabled = sort === "trending" && opt.id !== "official";
              return (
                <button
                  key={opt.id}
                  onClick={() => !isDisabled && onSourceChange(opt.id as any)}
                  className={`flex flex-col items-start p-2 rounded-md border text-left transition-all ${
                    source === opt.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : isDisabled
                      ? "border-destructive/20 bg-destructive/5 text-destructive cursor-not-allowed opacity-60"
                      : "border-border/40 hover:border-border hover:bg-muted/30"
                  }`}
                  data-testid={`source-opt-${opt.id}`}
                  disabled={isDisabled}
                >
                  <span className="text-sm font-medium leading-none">{opt.label}</span>
                  <span className={`text-[10px] mt-1 ${isDisabled ? "text-destructive/70" : "text-muted-foreground"}`}>{opt.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function BrowseTeas() {
  const [location] = useLocation();
  const searchString = useSearch();
  const { user } = useAuth();
  const { data: teaTypes } = useTeaTypes();
  const { data: cultivarsList } = useCultivars();
  const containerRef = useRef<HTMLDivElement>(null);

  const params = new URLSearchParams(searchString);
  const urlSort = params.get("sort") || "latest";
  const urlCustom = params.get("custom");
  const urlSource: "official" | "custom" | "all" = urlCustom === "true" ? "custom" : urlCustom === "false" ? "official" : "official";
  const urlTypes = params.get("types")?.split(",").filter(Boolean) || [];

  const urlCultivars = params.get("cultivars")?.split(",").filter(Boolean) || [];

  const [sort, setSort] = useState(urlSort);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(urlTypes);
  const [selectedCultivars, setSelectedCultivars] = useState<string[]>(urlCultivars);
  const [source, setSource] = useState<"official" | "custom" | "all">(urlSource);
  const [page, setPage] = useState(1);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileTeas, setMobileTeas] = useState<BrowseResponse["teas"]>([]);
  const [mobileHasMore, setMobileHasMore] = useState(true);
  const [mobilePage, setMobilePage] = useState(1);

  useEffect(() => {
    setSort(urlSort);
    setSource(urlSource);
    setSelectedTypes(urlTypes);
    setSelectedCultivars(urlCultivars);
    setPage(1);
    setMobilePage(1);
    setMobileTeas([]);
    setMobileHasMore(true);
  }, [urlSort, urlSource, location, searchString]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const queryParams = new URLSearchParams();
  queryParams.set("sort", sort);
  queryParams.set("page", isMobile ? mobilePage.toString() : page.toString());
  queryParams.set("limit", isMobile ? MOBILE_LIMIT.toString() : DESKTOP_LIMIT.toString());
  if (source === "custom") queryParams.set("custom", "true");
  if (source === "official") queryParams.set("custom", "false");
  if (selectedTypes.length > 0) queryParams.set("types", selectedTypes.join(","));

  const desktopQuery = useQuery<BrowseResponse>({
    queryKey: ["/api/browse-teas", sort, page, selectedTypes.join(","), selectedCultivars.join(","), source, "desktop"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("sort", sort);
      params.set("page", page.toString());
      params.set("limit", DESKTOP_LIMIT.toString());
      if (source === "custom") params.set("customOnly", "true");
      if (source === "official") params.set("officialOnly", "true");
      if (selectedTypes.length > 0) params.set("types", selectedTypes.join(","));
      if (selectedCultivars.length > 0) params.set("cultivars", selectedCultivars.join(","));
      const res = await fetch(`/api/browse-teas?${params}`);
      if (!res.ok) throw new Error("Failed to browse teas");
      return res.json();
    },
    enabled: !isMobile,
  });

  const mobileQuery = useQuery<BrowseResponse>({
    queryKey: ["/api/browse-teas", sort, mobilePage, selectedTypes.join(","), selectedCultivars.join(","), source, "mobile"],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("sort", sort);
      params.set("page", mobilePage.toString());
      params.set("limit", MOBILE_LIMIT.toString());
      if (source === "custom") params.set("customOnly", "true");
      if (source === "official") params.set("officialOnly", "true");
      if (selectedTypes.length > 0) params.set("types", selectedTypes.join(","));
      if (selectedCultivars.length > 0) params.set("cultivars", selectedCultivars.join(","));
      const res = await fetch(`/api/browse-teas?${params}`);
      if (!res.ok) throw new Error("Failed to browse teas");
      return res.json();
    },
    enabled: isMobile,
  });

  useEffect(() => {
    if (mobileQuery.data) {
      if (mobilePage === 1) {
        setMobileTeas(mobileQuery.data.teas);
      } else {
        setMobileTeas((prev) => [...prev, ...mobileQuery.data!.teas]);
      }
      const loaded = mobilePage * MOBILE_LIMIT;
      setMobileHasMore(loaded < mobileQuery.data.total);
    }
  }, [mobileQuery.data, mobilePage]);

  useEffect(() => {
    setPage(1);
    setMobilePage(1);
    setMobileTeas([]);
    setMobileHasMore(true);
  }, [sort, selectedTypes.length, source]);

  const toggleType = useCallback((name: string) => {
    setSelectedTypes((prev) =>
      prev.includes(name) ? [] : [name]
    );
  }, []);

  const clearTypes = useCallback(() => {
    setSelectedTypes([]);
  }, []);

  const toggleCultivar = useCallback((name: string) => {
    setSelectedCultivars((prev) =>
      prev.includes(name) ? prev.filter(c => c !== name) : [...prev, name]
    );
    setPage(1);
    setMobilePage(1);
    setMobileTeas([]);
    setMobileHasMore(true);
  }, []);

  const clearCultivars = useCallback(() => {
    setSelectedCultivars([]);
    setPage(1);
    setMobilePage(1);
    setMobileTeas([]);
    setMobileHasMore(true);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const desktopData = desktopQuery.data;
  const totalPages = desktopData ? Math.ceil(desktopData.total / DESKTOP_LIMIT) : 0;
  const displayTeas = isMobile ? mobileTeas : desktopData?.teas || [];
  const isLoading = isMobile ? mobileQuery.isLoading && mobilePage === 1 : desktopQuery.isLoading;
  const total = isMobile ? (mobileQuery.data?.total ?? 0) : (desktopData?.total ?? 0);

  const sidebarContent = (
    <FilterSidebar
      sort={sort}
      onSortChange={setSort}
      teaTypes={teaTypes || []}
      selectedTypes={selectedTypes}
      onToggleType={toggleType}
      onClearTypes={clearTypes}
      selectedCultivars={selectedCultivars}
      onToggleCultivar={toggleCultivar}
      onClearCultivars={clearCultivars}
      source={source}
      onSourceChange={setSource}
      showSourceSelector={!!user}
    />
  );

  return (
    <div className="min-h-screen bg-background flex flex-col" ref={containerRef}>
      <Navigation />

      <div className="flex-1 flex flex-col md:flex-row">
        <aside className="hidden md:block w-72 shrink-0 border-r border-border/60 bg-card/50 p-6 sticky top-[4.5rem] h-[calc(100vh-4.5rem)] overflow-y-auto">
          {sidebarContent}
        </aside>

        <main className="flex-1 p-4 md:p-6">
          <div className="md:hidden mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-display font-bold text-foreground">
                Browse Teas
              </h2>
              <p className="text-xs text-muted-foreground">{total} teas found</p>
            </div>
            <Sheet open={mobileFilterOpen} onOpenChange={setMobileFilterOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-mobile-filters">
                  <SlidersHorizontal className="w-4 h-4 mr-1.5" />
                  Filters
                  {(selectedTypes.length > 0 || selectedCultivars.length > 0 || sort === "trending") && (
                    <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5">
                      {selectedTypes.length + selectedCultivars.length + (sort === "trending" ? 1 : 0)}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="max-h-[80vh] overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters & Sort</SheetTitle>
                </SheetHeader>
                <div className="pt-4">
                  {sidebarContent}
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {(selectedTypes.length > 0 || selectedCultivars.length > 0 || sort === "trending") && (
            <div className="flex items-center gap-1.5 flex-wrap mb-4">
              <span className="text-xs text-muted-foreground">Filtering:</span>
              {sort === "trending" && (
                <button
                  onClick={() => setSort("latest")}
                  className="inline-flex items-center gap-1 rounded-md border border-primary bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-semibold cursor-pointer group/tag"
                  data-testid="active-filter-trending"
                >
                  <TrendingUp className="w-3 h-3" />
                  Trending
                  <X className="w-3 h-3 opacity-60 group-hover/tag:opacity-100 transition-opacity" />
                </button>
              )}
              {selectedTypes.map((t) => {
                const tt = teaTypes?.find((x) => x.name.toLowerCase() === t);
                const color = tt ? getTeaTypeColor([tt], tt.name) : undefined;
                return (
                  <button
                    key={t}
                    onClick={() => toggleType(t)}
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold cursor-pointer"
                    style={color?.style}
                    data-testid={`active-filter-${t}`}
                  >
                    {tt?.name || t}
                    <X className="w-3 h-3" />
                  </button>
                );
              })}
              {selectedCultivars.map((c) => {
                const displayName = cultivarsList?.find(cv => cv.name.toLowerCase() === c)?.name || c;
                return (
                  <button
                    key={c}
                    onClick={() => toggleCultivar(c)}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/50 text-foreground px-2 py-0.5 text-[10px] font-semibold cursor-pointer group/tag"
                    data-testid={`active-filter-cultivar-${c}`}
                  >
                    <Tag className="w-3 h-3" />
                    {displayName}
                    <X className="w-3 h-3 opacity-60 group-hover/tag:opacity-100 transition-opacity" />
                  </button>
                );
              })}
            </div>
          )}

          <div className="hidden md:flex items-center justify-between gap-2 mb-4">
            <p className="text-sm text-muted-foreground">{total} teas found</p>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-12 h-12 animate-spin text-primary/30" />
            </div>
          ) : displayTeas.length === 0 ? (
            <div className="py-20 text-center">
              <Leaf className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground text-lg">No teas found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedTypes.length > 0 || selectedCultivars.length > 0
                  ? "Try clearing your filters"
                  : source === "custom"
                  ? "You haven't added any custom teas yet"
                  : "No teas available"}
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
                {displayTeas.map((tea) => (
                  <TeaBrowseCard key={tea.id} tea={tea} />
                ))}
              </div>

              {!isMobile && <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />}

              {isMobile && mobileHasMore && (
                <div className="flex justify-center mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setMobilePage((p) => p + 1)}
                    disabled={mobileQuery.isFetching}
                    data-testid="button-load-more"
                  >
                    {mobileQuery.isFetching ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : null}
                    Load More
                  </Button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {showScrollTop && (
        <Button
          size="icon"
          className="fixed bottom-6 right-6 z-40 rounded-full shadow-lg"
          onClick={scrollToTop}
          data-testid="button-scroll-top"
        >
          <ArrowUp className="w-5 h-5" />
        </Button>
      )}

      <Footer />
    </div>
  );
}
