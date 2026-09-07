import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { surveyService } from "../../../services/surveyService";

export function useSurveyList() {
  const [activeFilter, setActiveFilter] = useState("Ativas");

  const { data: surveys, isLoading: surveysLoading, isError: surveysError, refetch: refetchSurveys } = useQuery({
    queryKey: ['surveys_list'],
    queryFn: () => surveyService.getAll()
  });

  const { data: regions } = useQuery({
    queryKey: ['regions'],
    queryFn: () => surveyService.getRegions()
  });

  const isLoading = surveysLoading;

  const filteredSurveys = surveys?.filter(survey => {
    // No Supabase, o RLS já filtrou o que o usuário pode ver (Global ou Vinculado)
    // Aqui aplicamos apenas filtros de UI (Status)
    if (activeFilter === "Todas") return true;
    if (activeFilter === "Concluídas") return survey.status === "concluido";
    return survey.status === "ativo";
  });

  return {
    activeFilter,
    setActiveFilter,
    surveys,
    regions,
    isLoading,
    isError: surveysError,
    retry: refetchSurveys,
    filteredSurveys
  };
}