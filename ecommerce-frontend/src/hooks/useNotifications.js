import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "../services/notificationService";
import { authStore } from "../store/authStore";

export function useNotifications() {
  const token = authStore.getToken();

  return useQuery({
    queryKey: ["notifications"],
    queryFn: notificationService.list,
    enabled: Boolean(token),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: notificationService.markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
