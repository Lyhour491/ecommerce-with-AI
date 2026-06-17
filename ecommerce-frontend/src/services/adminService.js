import { api } from "./http";

export const adminService = {
  dashboard: async () => {
    const { data } = await api.get("/admin/stats");
    return data;
  },
};
