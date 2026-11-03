import { useQuery } from "@tanstack/react-query";
import { getPlayerIdentity } from "@/lib/playerIdentity";
import { registerPlayer } from "@/lib/anonymousApi";

export const displayName = (player) => player?.username || "Player";

export default function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const identity = getPlayerIdentity();
      await registerPlayer();
      return identity;
    },
    initialData: getPlayerIdentity,
    staleTime: 0,
    retry: 1,
  });
}
