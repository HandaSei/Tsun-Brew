import { useQuery } from "@tanstack/react-query";
import { type TeaType } from "@shared/schema";

export function useTeaTypes() {
  return useQuery<TeaType[]>({
    queryKey: ['/api/tea-types'],
    retry: 3,
  });
}

interface TeaWithColor {
  typeColorHue?: number | null;
  typeColorSaturation?: number | null;
  typeColorLightness?: number | null;
}

function buildColorStyle(h: number, s: number, l: number) {
  const textColor = l > 55 ? `hsl(${h}, ${Math.min(s + 10, 100)}%, 15%)` : `hsl(${h}, 10%, 98%)`;
  return {
    bg: "",
    text: "",
    border: "",
    style: {
      backgroundColor: `hsl(${h}, ${s}%, ${l}%)`,
      color: textColor,
      borderColor: `hsl(${h}, ${s}%, ${Math.max(l - 10, 10)}%)`,
    } as React.CSSProperties,
  };
}

const fallbackResult = {
  bg: "bg-primary/10",
  text: "text-primary",
  border: "border-primary/20",
  style: {} as React.CSSProperties,
};

function findMatchingType(types: TeaType[], name: string): TeaType | undefined {
  const lower = name.toLowerCase();
  return types.find(t => t.name.toLowerCase() === lower) ||
    types.find(t => t.name.toLowerCase().replace(/\s*tea$/i, '') === lower) ||
    types.find(t => lower.startsWith(t.name.toLowerCase())) ||
    types.find(t => t.name.toLowerCase().startsWith(lower));
}

export function getTeaTypeColor(teaTypes: TeaType[] | undefined, typeName: string, tea?: TeaWithColor) {
  if (tea?.typeColorHue != null && tea?.typeColorSaturation != null && tea?.typeColorLightness != null) {
    return buildColorStyle(tea.typeColorHue, tea.typeColorSaturation, tea.typeColorLightness);
  }
  const teaType = teaTypes ? findMatchingType(teaTypes, typeName) : undefined;
  if (!teaType) {
    return fallbackResult;
  }
  return buildColorStyle(teaType.colorHue, teaType.colorSaturation, teaType.colorLightness);
}
