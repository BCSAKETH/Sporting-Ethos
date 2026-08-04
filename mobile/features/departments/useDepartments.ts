import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../../constants/queryKeys";
import { getDepartment, listDepartments } from "../../services/departments.service";

export function useDepartments() {
  return useQuery({
    queryKey: queryKeys.departments,
    queryFn: listDepartments,
  });
}

export function useDepartment(id: string | undefined) {
  return useQuery({
    queryKey: ["departments", "detail", id],
    queryFn: () => getDepartment(id as string),
    enabled: !!id,
  });
}
