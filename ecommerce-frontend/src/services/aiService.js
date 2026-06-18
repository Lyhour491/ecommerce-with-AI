import { api } from "./http";

export const aiService = {
  chat: async (payload) => {
    const { data } = await api.post("/ai/chat", payload);
    return data;
  },

  recommendProducts: async (productId) => {
    const { data } = await api.get("/ai/recommend-products", { params: { product_id: productId } });
    return data;
  },

  status: async () => {
    const { data } = await api.get("/ai/status");
    return data;
  },

  sellerStatus: async () => {
    const { data } = await api.get("/seller/ai/status");
    return data;
  },

  generateProductDraft: async (prompt) => {
    const { data } = await api.post("/seller/ai/generate-product-content", { prompt });
    return data;
  },

  generateTitle: async (prompt) => {
    const { data } = await api.post("/seller/ai/product-title", { prompt });
    return data;
  },

  generateDescription: async (prompt) => {
    const { data } = await api.post("/seller/ai/product-description", { prompt });
    return data;
  },

  suggestCategory: async (prompt) => {
    const { data } = await api.post("/seller/ai/product-category", { prompt });
    return data;
  },

  generateTags: async (prompt) => {
    const { data } = await api.post("/seller/ai/product-tags", { prompt });
    return data;
  },

  generateSeoKeywords: async (prompt) => {
    const { data } = await api.post("/seller/ai/seo-keywords", { prompt });
    return data;
  },

  suggestPrice: async (prompt) => {
    const { data } = await api.post("/seller/ai/product-price", { prompt });
    return data;
  },

  sellerInsights: async () => {
    const { data } = await api.get("/seller/ai-insights");
    return data;
  },

  reviewSentiment: async () => {
    const { data } = await api.get("/seller/ai/review-sentiment");
    return data;
  },
};
