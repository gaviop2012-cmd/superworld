import { useQuery } from "@tanstack/react-query";
import { getPlayerIdentity } from "@/lib/playerIdentity";

export const displayName = (player) => player?.username || "Player";

export default function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: getPlayerIdentity,
    initialData: getPlayerIdentity,
    staleTime: Infinity,
  });
}
