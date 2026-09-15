import { useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { SurveyOptionImage } from "../../types";
import { surveyOptionImageService } from "../../services/surveyOptionImageService";
import { SurveyOptionImage as SurveyOptionImagePreview } from "../SurveyOptionImage";

interface SurveyOptionImageControlProps {
  surveyId?: string;
  questionId: string;
  alternative: string;
  image?: SurveyOptionImage;
}

export function SurveyOptionImageControl({ surveyId, questionId, alternative, image }: SurveyOptionImageControlProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const uploadMutation = useMutation({
    mutationFn: (file: File) => surveyOptionImageService.upload(surveyId!, questionId, alternative, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey-option-images", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["survey-option-image-bytes"] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () => surveyOptionImageService.remove(image!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["survey-option-images", surveyId] });
      queryClient.invalidateQueries({ queryKey: ["survey-option-image-bytes"] });
    },
  });

  if (image) {
    const deleteError = deleteMutation.error instanceof Error
      ? deleteMutation.error.message
      : deleteMutation.error
        ? "Não foi possível excluir a imagem."
        : null;

    return (
      <div className="flex flex-col items-start gap-1">
        <div className="group relative h-12 w-12">
          <SurveyOptionImagePreview
            image={image}
            alt={`Imagem da alternativa ${alternative}`}
            className="h-12 w-12 rounded-lg border border-outline object-cover"
          />
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Excluir a imagem da alternativa “${alternative}”?`)) {
                deleteMutation.mutate();
              }
            }}
            disabled={deleteMutation.isPending}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-error text-white opacity-0 shadow-sm transition-opacity hover:bg-error/80 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error/40 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Excluir imagem da alternativa ${alternative}`}
            title="Excluir imagem"
          >
            {deleteMutation.isPending ? <LoaderCircle size={14} className="animate-spin" /> : <X size={14} />}
          </button>
        </div>
        {deleteError && <span className="max-w-40 text-[10px] leading-tight text-error">{deleteError}</span>}
      </div>
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
