import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, LoaderCircle } from "lucide-react";
import { SurveyOptionImage } from "../../types";
import { surveyOptionImageService } from "../../services/surveyOptionImageService";
import { SurveyOptionImage as SurveyOptionImagePreview } from "../SurveyOptionImage";

interface SurveyOptionImageControlProps {
  surveyId?: string;
  questionId: string;
  alternative: string;
  optionIndex: number;
  image?: SurveyOptionImage;
}

export function SurveyOptionImageControl({ surveyId, questionId, alternative, optionIndex, image }: SurveyOptionImageControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const uploadMutation = useMutation({
    mutationFn: (file: File) => surveyOptionImageService.upload(surveyId!, questionId, alternative, optionIndex, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey-option-images", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["survey-option-image-bytes"] });
    },
  });

  if (image) {
    return (
      <SurveyOptionImagePreview
        image={image}
        alt={`Imagem da alternativa ${alternative}`}
        className="h-12 w-12 rounded-lg border border-outline object-cover"
      />
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={!surveyId || uploadMutation.isPending}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-primary/40 text-primary transition-colors hover:bg-primary/10 disabled:cursor-not-allowed disabled:opacity-40"
        title={surveyId ? "Adicionar imagem à alternativa" : "Salve a pesquisa antes de adicionar imagens"}
        aria-label={`Adicionar imagem à alternativa ${alternative}`}
      >
        {uploadMutation.isPending ? <LoaderCircle size={18} className="animate-spin" /> : <ImagePlus size={18} />}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) uploadMutation.mutate(file);
        }}
      />
    </>
  );
}
