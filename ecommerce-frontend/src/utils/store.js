import { STORAGE_BASE_URL } from "../api/axios";

export const unwrapList = (payload, keys = []) => {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key];
  }
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload)) return payload;
  return [];
};

export const money = (value) => `$${Number(value || 0).toFixed(2)}`;

export const toImageUrl = (path) => {
  if (!path) return "";
  const value = String(path);
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("data:")) return value;
  if (value.startsWith("/storage/")) return `${STORAGE_BASE_URL}${value}`;
  if (value.startsWith("storage/")) return `${STORAGE_BASE_URL}/${value}`;
  return `${STORAGE_BASE_URL}/storage/${value.replace(/^\/+/, "")}`;
};

export const getProductImages = (product) => {
  const urls = [];

  if (Array.isArray(product?.image_urls)) urls.push(...product.image_urls);
  if (product?.primary_image_url) urls.push(product.primary_image_url);

  if (Array.isArray(product?.images)) {
    product.images.forEach((image) => {
      urls.push(image?.image_url || image?.url || image?.image_path || image?.image || image?.path);
    });
  }

  urls.push(product?.image_url, product?.image_path, product?.image, product?.thumbnail);

  return [...new Set(urls.map(toImageUrl).filter(Boolean))];
};

export const getImageUrl = (product) => getProductImages(product)[0] || "";

export const firstApiError = (err, fallback = "Something went wrong.") => {
  const errors = err.response?.data?.errors;
  if (errors) return Object.values(errors)?.[0]?.[0] || fallback;
  return err.response?.data?.message || fallback;
};

export const unwrapUser = (payload) => payload?.user || payload?.data?.user || payload?.data || payload || { name: "Admin" };
