import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { productService } from "../services/productService";

export function useSellerProducts() {
  return useQuery({
    queryKey: ["seller", "products"],
    queryFn: productService.listSellerProducts,
  });
}

export function useProductCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: productService.listCategories,
  });
}

export function useCreateSellerProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productService.createSellerProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seller", "products"] }),
  });
}

export function useUpdateSellerProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ productId, formData }) => productService.updateSellerProduct(productId, formData),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seller", "products"] }),
  });
}

export function useDeleteSellerProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: productService.deleteSellerProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seller", "products"] }),
  });
}
