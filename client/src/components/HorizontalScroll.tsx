import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HorizontalScrollProps {
  children: React.ReactNode;
  className?: string;
}

export function HorizontalScroll({ children, className = "" }: HorizontalScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [dragDistance, setDragDistance] = useState(0);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 2);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(checkScroll);
    observer.observe(el);
    return () => observer.disconnect();
  }, [checkScroll, children]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    setIsDragging(true);
    setDragDistance(0);
    setStartX(e.pageX - el.offsetLeft);
    setScrollLeft(el.scrollLeft);
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    e.preventDefault();
    const el = scrollRef.current;
    if (!el) return;
    const x = e.pageX - el.offsetLeft;
    const walk = (x - startX) * 1.5;
    setDragDistance(Math.abs(walk));
    el.scrollLeft = scrollLeft - walk;
  }, [isDragging, startX, scrollLeft]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const scrollBy = useCallback((direction: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector('[data-scroll-item]')?.getBoundingClientRect().width || 250;
    const visibleCards = Math.floor(el.clientWidth / cardWidth);
    const scrollAmount = cardWidth * Math.max(1, visibleCards - 1);
    el.scrollBy({ left: direction * scrollAmount, behavior: "smooth" });
  }, []);

  const handleClickCapture = useCallback((e: React.MouseEvent) => {
    if (dragDistance > 5) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, [dragDistance]);

  return (
    <div className={`relative group/scroll ${className}`}>
      {canScrollLeft && (
        <button
          onClick={() => scrollBy(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 border border-border/60 shadow-lg flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-background transition-all opacity-0 group-hover/scroll:opacity-100 -translate-x-1/2 backdrop-blur-sm"
          data-testid="button-scroll-left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      <div
        ref={scrollRef}
        className={`flex gap-4 md:gap-6 overflow-x-auto [&::-webkit-scrollbar]:hidden ${isDragging ? "cursor-grabbing select-none" : "cursor-grab scroll-smooth"}`}
        style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onScroll={checkScroll}
        onClickCapture={handleClickCapture}
      >
        {children}
      </div>

      {canScrollRight && (
        <button
          onClick={() => scrollBy(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-background/90 border border-border/60 shadow-lg flex items-center justify-center text-foreground/70 hover:text-foreground hover:bg-background transition-all opacity-0 group-hover/scroll:opacity-100 translate-x-1/2 backdrop-blur-sm"
          data-testid="button-scroll-right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-background to-transparent pointer-events-none z-[5]" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent pointer-events-none z-[5]" />
      )}
    </div>
  );
}

export function ScrollItem({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      data-scroll-item
      className={`shrink-0 min-w-[160px] ${className}`}
    >
      {children}
    </div>
  );
}
