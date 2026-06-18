import { api } from "./http";

export const productService = {
  listSellerProducts: async () => {
    const { data } = await api.get("/seller/products");
    return Array.isArray(data) ? data : data?.data || [];
  },

  listCategories: async () => {
    const { data } = await api.get("/categories");
    if (Array.isArray(data)) return data;
    return data?.categories || data?.data || [];
  },

  recommendedForYou: async (limit = 8) => {
    const { data } = await api.get("/recommendations/for-you", { params: { limit } });
    return data;
  },

  createSellerProduct: async (formData) => {
    const { data } = await api.post("/seller/products", formData);
    return data;
  },

  updateSellerProduct: async (productId, formData) => {
    formData.append("_method", "PUT");
    const { data } = await api.post(`/seller/products/${productId}`, formData);
    return data;
  },

  deleteSellerProduct: async (productId) => {
    const { data } = await api.delete(`/seller/products/${productId}`);
    return data;
  },
};
