import { useMutation } from "@tanstack/react-query";
import { aiService } from "../services/aiService";

export function useAiProductDraft() {
  return useMutation({
    mutationFn: aiService.generateProductDraft,
  });
}

export function useAiProductField() {
  return useMutation({
    mutationFn: ({ field, prompt }) => {
      const actions = {
        title: aiService.generateTitle,
        description: aiService.generateDescription,
        category: aiService.suggestCategory,
        tags: aiService.generateTags,
        price: aiService.suggestPrice,
      };

      return actions[field](prompt);
    },
  });
}
