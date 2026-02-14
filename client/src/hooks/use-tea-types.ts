import { useQuery } from "@tanstack/react-query";
import { type TeaType } from "@shared/schema";

export function useTeaTypes() {
  return useQuery<TeaType[]>({
    queryKey: ['/api/tea-types'],
  });
}

export function getTeaTypeColor(teaTypes: TeaType[] | undefined, typeName: string) {
  const teaType = teaTypes?.find(t => t.name === typeName);
  if (!teaType) {
    return {
      bg: "bg-primary/10",
      text: "text-primary",
      border: "border-primary/20",
      style: {} as React.CSSProperties,
    };
  }
  const { colorHue: h, colorSaturation: s, colorLightness: l } = teaType;
  const textColor = l > 55 ? `hsl(${h} ${Math.min(s + 10, 100)}% 15%)` : `hsl(${h} 10% 98%)`;
  return {
    bg: "",
    text: "",
    border: "",
    style: {
      backgroundColor: `hsl(${h} ${s}% ${l}%)`,
      color: textColor,
      borderColor: `hsl(${h} ${s}% ${Math.max(l - 10, 10)}%)`,
    } as React.CSSProperties,
  };
}
