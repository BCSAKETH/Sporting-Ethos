import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../constants/queryKeys";
import { getDoctor, getDoctorAvailability, listDoctors, type DoctorFilters } from "../../services/doctors.service";

export function useDoctors(filters: DoctorFilters) {
  return useQuery({
    queryKey: queryKeys.doctors(filters),
    queryFn: () => listDoctors(filters),
  });
}

export function useDoctor(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.doctor(id ?? ""),
    queryFn: () => getDoctor(id as string),
    enabled: !!id,
  });
}

export function useDoctorAvailability(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.doctorAvailability(id ?? ""),
    queryFn: () => getDoctorAvailability(id as string),
    enabled: !!id,
  });
}
