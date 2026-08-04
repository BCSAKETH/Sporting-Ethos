import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../constants/queryKeys";
import { getPrimaryHospital } from "../../services/hospitals.service";

export function usePrimaryHospital() {
  return useQuery({ queryKey: queryKeys.primaryHospital, queryFn: getPrimaryHospital });
}
