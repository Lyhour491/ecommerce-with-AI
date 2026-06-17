import { useQuery } from "@tanstack/react-query";
import { adminService } from "../services/adminService";

export function useAdminDashboard() {
  return useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: adminService.dashboard,
  });
}
