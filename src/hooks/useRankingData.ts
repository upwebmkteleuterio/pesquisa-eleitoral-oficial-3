import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../contexts/AuthContext";
import { submissionService } from "../services/submissionService";
import { surveyService } from "../services/surveyService";
import { userService } from "../services/userService";
import type { Researcher, Submission, Survey } from "../types";

export interface RankedResearcher extends Researcher {
  collectionCount: number;
}

export function useRankingData(selectedSurveyId: string) {
  const { user, profile } = useAuth();
  const isAdmin = !!user && profile?.role === "admin";

  const { data: surveys, isLoading: isSurveysLoading } = useQuery<Survey[]>({
    queryKey: ["admin_surveys", user?.id || "anonymous", profile?.role || "unknown"],
    queryFn: () => surveyService.getAllForUser(user?.id, profile?.role),
    enabled: isAdmin,
  });
  const { data: researchers, isLoading: isResearchersLoading } = useQuery<Researcher[]>({
    queryKey: ["all_researchers", user?.id || "anonymous"],
    queryFn: () => userService.getAllResearchers(),
    enabled: isAdmin,
  });
  const { data: submissions, isLoading: isSubmissionsLoading, isFetching: isSubmissionsFetching } = useQuery<Submission[]>({
    queryKey: ["submissions", "ranking", user?.id || "anonymous", selectedSurveyId],
    queryFn: () => submissionService.getBySurveyId(selectedSurveyId, true, undefined, false),
    enabled: !!selectedSurveyId && isAdmin,
  });

  const ranking = useMemo<RankedResearcher[]>(() => {
    if (!researchers || !submissions) return [];

    const counts = new Map<string, number>();
    submissions
      .filter(submission => submission.valida !== false)
      .forEach(submission => {
        const responsibleId = submission.origem === "web"
          ? submission.referenciado_por
          : submission.pesquisador_id;
        if (responsibleId) counts.set(responsibleId, (counts.get(responsibleId) || 0) + 1);
      });

    return researchers
      .map(researcher => ({ ...researcher, collectionCount: counts.get(researcher.id) || 0 }))
      .filter(researcher => researcher.collectionCount > 0)
      .sort((left, right) => right.collectionCount - left.collectionCount || left.nome.localeCompare(right.nome));
  }, [researchers, submissions]);

  return {
    surveys,
    ranking,
    isLoading: isSurveysLoading || isResearchersLoading || (
      !!selectedSurveyId && (isSubmissionsLoading || isSubmissionsFetching)
    ),
    isSurveysLoading,
  };
}
