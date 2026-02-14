import { useQuery } from "@tanstack/react-query";
import { type TeaType } from "@shared/schema";
import { useEffect, useRef } from "react";

export function useTeaTypes() {
  return useQuery<TeaType[]>({
    queryKey: ['/api/tea-types'],
    retry: 3,
  });
}

function sanitizeClassName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '-');
}

export function teaTypeBadgeClass(typeName: string): string {
  return `tea-badge-${sanitizeClassName(typeName)}`;
}

function generateCssRule(name: string, h: number, s: number, l: number): string {
  const cls = sanitizeClassName(name);
  const bg = `hsl(${h}, ${s}%, ${l}%)`;
  const text = l > 55
    ? `hsl(${h}, ${Math.min(s + 10, 100)}%, 15%)`
    : `hsl(${h}, 10%, 98%)`;
  const border = `hsl(${h}, ${s}%, ${Math.max(l - 10, 10)}%)`;
  return `.tea-badge-${cls}{background-color:${bg}!important;color:${text}!important;border-color:${border}!important}`;
}

export function TeaTypeStyleInjector() {
  const { data: teaTypes } = useTeaTypes();
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (!teaTypes?.length) return;

    if (!styleRef.current) {
      styleRef.current = document.createElement('style');
      styleRef.current.id = 'tea-type-colors';
      document.head.appendChild(styleRef.current);
    }

    const css = teaTypes
      .map(tt => generateCssRule(tt.name, tt.colorHue, tt.colorSaturation, tt.colorLightness))
      .join('\n');

    styleRef.current.textContent = css;

    return () => {
      if (styleRef.current && styleRef.current.parentNode) {
        styleRef.current.parentNode.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };
  }, [teaTypes]);

  return null;
}

export function injectTeaColorFromData(typeName: string, hue: number | null | undefined, sat: number | null | undefined, light: number | null | undefined) {
  if (hue == null || sat == null || light == null) return;
  const styleId = 'tea-type-colors-fallback';
  let el = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement('style');
    el.id = styleId;
    document.head.appendChild(el);
  }
  const cls = sanitizeClassName(typeName);
  if (el.textContent?.includes(`.tea-badge-${cls}`)) return;
  el.textContent += generateCssRule(typeName, hue, sat, light) + '\n';
}
