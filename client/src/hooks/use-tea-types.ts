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
  return {
    bg: "",
    text: "",
    border: "",
    style: {
      backgroundColor: `hsl(${h} ${s}% ${l}% / 0.12)`,
      color: `hsl(${h} ${s}% ${Math.min(l + 10, 65)}%)`,
      borderColor: `hsl(${h} ${s}% ${l}% / 0.25)`,
    } as React.CSSProperties,
  };
}
