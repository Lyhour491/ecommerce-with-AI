import { api } from "./http";

export const notificationService = {
  list: async () => {
    const { data } = await api.get("/notifications");
    return data;
  },

  markAsRead: async (id = "all") => {
    const { data } = await api.patch(`/notifications/${id}/read`);
    return data;
  },
};
