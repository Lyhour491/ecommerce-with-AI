import { useQuery } from "@tanstack/react-query";
import { productService } from "../services/productService";
import { authStore } from "../store/authStore";

export function usePersonalizedRecommendations(limit = 8) {
  return useQuery({
    queryKey: ["recommendations", "for-you", limit],
    queryFn: () => productService.recommendedForYou(limit),
    enabled: Boolean(authStore.getToken()),
    staleTime: 60_000,
  });
}
