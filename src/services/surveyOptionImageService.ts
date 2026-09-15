import localforage from "localforage";
import { supabase } from "../integrations/supabase/client";
import { SurveyOptionImage } from "../types";

const IMAGE_BUCKET = "survey-option-images";
const METADATA_PREFIX = "survey_option_images_";
const BYTES_PREFIX = "survey_option_image_bytes_";

const metadataKey = (surveyId: string) => `${METADATA_PREFIX}${surveyId}`;
const bytesKey = (storagePath: string) => `${BYTES_PREFIX}${encodeURIComponent(storagePath)}`;

function safePathPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function extensionForMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/bmp": "bmp",
    "image/svg+xml": "svg",
  };
  return extensions[mimeType.toLowerCase()] || "img";
}

export const surveyOptionImageService = {
  async getForSurvey(surveyId: string): Promise<SurveyOptionImage[]> {
    const cached = await localforage.getItem<SurveyOptionImage[]>(metadataKey(surveyId));
    if (!navigator.onLine) {
      await Promise.all((cached || []).map(image => this.getImageBlob(image)));
      return cached || [];
    }

    try {
      const { data, error } = await supabase
        .from("pesquisa_alternativa_imagens")
        .select("id, pesquisa_id, pergunta_id, alternativa, storage_path, created_at, updated_at")
        .eq("pesquisa_id", surveyId);
      if (error) return cached || [];

      const metadata = (data || []) as SurveyOptionImage[];
      await localforage.setItem(metadataKey(surveyId), metadata);
      await Promise.all(metadata.map(image => this.getImageBlob(image)));
      return metadata;
    } catch {
      return cached || [];
    }
  },

  getPublicUrl(storagePath: string): string {
    return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
  },

  async getImageBlob(image: SurveyOptionImage): Promise<Blob | null> {
    const key = bytesKey(image.storage_path);
    const cached = await localforage.getItem<Blob>(key);
    if (!navigator.onLine) return cached || null;

    try {
      const response = await fetch(this.getPublicUrl(image.storage_path));
      if (!response.ok) return cached || null;
      const blob = await response.blob();
      await localforage.setItem(key, blob);
      return blob;
    } catch {
      return cached || null;
    }
  },

  async upload(
    surveyId: string,
    questionId: string,
    alternative: string,
    file: File,
  ): Promise<SurveyOptionImage> {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedMimeTypes.includes(file.type)) {
      throw new Error("Use uma imagem JPEG, PNG ou WebP.");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("A imagem deve ter no máximo 5 MB.");
    }

    const storagePath = `${safePathPart(surveyId)}/${safePathPart(questionId)}/${crypto.randomUUID()}.${extensionForMimeType(file.type)}`;
    const { error: uploadError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(storagePath, file, { upsert: false, contentType: file.type });
    if (uploadError) throw uploadError;

    const { data, error } = await supabase
      .from("pesquisa_alternativa_imagens")
      .upsert({
        pesquisa_id: surveyId,
        pergunta_id: questionId,
        alternativa: alternative,
        storage_path: storagePath,
      }, { onConflict: "pesquisa_id,pergunta_id,alternativa" })
      .select("id, pesquisa_id, pergunta_id, alternativa, storage_path, created_at, updated_at")
      .single();
    if (error) throw error;

    const image = data as SurveyOptionImage;
    const metadata = await localforage.getItem<SurveyOptionImage[]>(metadataKey(surveyId)) || [];
    const nextMetadata = metadata.filter(item => !(item.pergunta_id === questionId && item.alternativa === alternative));
    await localforage.setItem(metadataKey(surveyId), [...nextMetadata, image]);
    await localforage.setItem(bytesKey(storagePath), file);
    return image;
  },

  async remove(image: SurveyOptionImage): Promise<void> {
    const { data: deletedMetadata, error: metadataError } = await supabase
      .from("pesquisa_alternativa_imagens")
      .delete()
      .eq("id", image.id)
      .eq("pesquisa_id", image.pesquisa_id)
      .select("id")
      .maybeSingle();
    if (metadataError) throw metadataError;
    if (!deletedMetadata) throw new Error("A imagem selecionada não foi encontrada.");

    const { count: remainingReferences, error: referencesError } = await supabase
      .from("pesquisa_alternativa_imagens")
      .select("id", { count: "exact", head: true })
      .eq("storage_path", image.storage_path)
      .neq("id", image.id);
    if (referencesError) throw referencesError;
    if (remainingReferences === null) throw new Error("Não foi possível verificar as referências da imagem.");

    if (remainingReferences === 0) {
      const { error: storageError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .remove([image.storage_path]);
      if (storageError) throw storageError;
    }

    const metadata = await localforage.getItem<SurveyOptionImage[]>(metadataKey(image.pesquisa_id)) || [];
    await localforage.setItem(
      metadataKey(image.pesquisa_id),
      metadata.filter(item => item.id !== image.id),
    );
    if (remainingReferences === 0) {
      await localforage.removeItem(bytesKey(image.storage_path));
    }
  },
};

export { IMAGE_BUCKET };
