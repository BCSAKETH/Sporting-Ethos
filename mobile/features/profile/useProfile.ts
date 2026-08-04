import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../constants/queryKeys";
import { getMyProfile, updateMyProfile } from "../../services/profile.service";
import {
  addPatientAllergy,
  addPatientDisease,
  listAllergies,
  listDiseases,
  listMyAllergies,
  listMyDiseases,
  removePatientAllergy,
  removePatientDisease,
} from "../../services/medicalLookups.service";
import { useAuthStore } from "../../store/authStore";
import type { Database } from "../../types/database";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export function useProfile() {
  return useQuery({ queryKey: queryKeys.profile(), queryFn: getMyProfile });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const setProfile = useAuthStore((s) => s.setProfile);
  return useMutation({
    mutationFn: (patch: ProfileUpdate) => updateMyProfile(patch),
    onSuccess: (profile) => {
      setProfile(profile);
      queryClient.invalidateQueries({ queryKey: queryKeys.profile() });
    },
  });
}

export function useDiseasesCatalog() {
  return useQuery({ queryKey: queryKeys.diseases, queryFn: listDiseases });
}

export function useAllergiesCatalog() {
  return useQuery({ queryKey: queryKeys.allergies, queryFn: listAllergies });
}

export function useMyDiseases() {
  return useQuery({ queryKey: queryKeys.patientDiseases(), queryFn: listMyDiseases });
}

export function useMyAllergies() {
  return useQuery({ queryKey: queryKeys.patientAllergies(), queryFn: listMyAllergies });
}

export function useToggleDisease() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { patientId: string; diseaseId: string; add: boolean }) =>
      vars.add ? addPatientDisease(vars.patientId, vars.diseaseId) : removePatientDisease(vars.patientId, vars.diseaseId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.patientDiseases() }),
  });
}

export function useToggleAllergy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { patientId: string; allergyId: string; add: boolean; severity?: string }) =>
      vars.add
        ? addPatientAllergy(vars.patientId, vars.allergyId, vars.severity)
        : removePatientAllergy(vars.patientId, vars.allergyId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.patientAllergies() }),
  });
}
