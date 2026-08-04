import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../constants/queryKeys";
import { listHospitalQueue, spotCheckIn, subscribeToHospitalQueue, type SpotCheckInInput } from "../../services/checkins.service";

export { queuePosition } from "../../utils/queue";

export function useHospitalQueue(hospitalId: string | undefined) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["checkins", "queue", hospitalId],
    queryFn: () => listHospitalQueue(hospitalId as string),
    enabled: !!hospitalId,
  });

  useEffect(() => {
    if (!hospitalId) return;
    const unsubscribe = subscribeToHospitalQueue(hospitalId, () => {
      queryClient.invalidateQueries({ queryKey: ["checkins", "queue", hospitalId] });
    });
    return unsubscribe;
  }, [hospitalId, queryClient]);

  return query;
}

export function useSpotCheckIn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SpotCheckInInput) => spotCheckIn(input),
    onSuccess: (checkin) => {
      queryClient.invalidateQueries({ queryKey: ["checkins", "queue", checkin.hospital_id] });
      queryClient.invalidateQueries({ queryKey: queryKeys.checkins() });
    },
  });
}
