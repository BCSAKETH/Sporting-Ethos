import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../constants/queryKeys";
import {
  bookAppointment,
  cancelAppointment,
  getBookedSlots,
  listMyAppointments,
  type BookAppointmentInput,
} from "../../services/appointments.service";

export function useMyAppointments() {
  return useQuery({ queryKey: queryKeys.appointments(), queryFn: listMyAppointments });
}

export function useBookedSlots(doctorId: string | undefined, date: Date) {
  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  return useQuery({
    queryKey: queryKeys.bookedSlots(doctorId ?? "", dayStart.toISOString()),
    queryFn: () => getBookedSlots(doctorId as string, dayStart.toISOString(), dayEnd.toISOString()),
    enabled: !!doctorId,
  });
}

export function useBookAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BookAppointmentInput) => bookAppointment(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments() });
    },
  });
}

export function useCancelAppointment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => cancelAppointment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.appointments() });
    },
  });
}
