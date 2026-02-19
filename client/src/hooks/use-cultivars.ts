import { useQuery } from "@tanstack/react-query";
import { type Cultivar } from "@shared/schema";

export function useCultivars() {
  return useQuery<Cultivar[]>({
    queryKey: ['/api/cultivars'],
    retry: 3,
  });
}
