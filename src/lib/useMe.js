import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export const displayName = (u) => u?.username || u?.full_name || (u?.email || "player").split("@")[0];

export default function useMe() {
  return useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });
}