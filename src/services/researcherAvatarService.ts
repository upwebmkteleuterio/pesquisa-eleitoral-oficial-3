import { supabase } from "@/src/integrations/supabase/client";
import { researcherDirectoryService } from "./researcherDirectoryService";

const MAX_OUTPUT_BYTES = 300 * 1024;
const ACCEPTED_INPUT_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface ProcessedAvatar {
  blob: Blob;
  mimeType: "image/webp" | "image/jpeg";
}

function validateAvatarInput(file: File): void {
  if (!file || !ACCEPTED_INPUT_TYPES.has(file.type)) {
    throw new Error("Selecione uma imagem JPEG, PNG ou WebP.");
  }
  if (file.size === 0) throw new Error("A imagem selecionada está vazia.");
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Não foi possível processar a imagem.")), type, quality);
  });
}

export async function processResearcherAvatar(file: File): Promise<ProcessedAvatar> {
  validateAvatarInput(file);
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = new Image();
    image.src = sourceUrl;
    await image.decode();

    const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
    if (!sourceSize) throw new Error("A imagem selecionada não possui dimensões válidas.");

    for (const size of [256, 224, 192, 160, 128]) {
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Não foi possível preparar a imagem.");
      const offsetX = (image.naturalWidth - sourceSize) / 2;
      const offsetY = (image.naturalHeight - sourceSize) / 2;
      context.drawImage(image, offsetX, offsetY, sourceSize, sourceSize, 0, 0, size, size);

      for (const quality of [0.84, 0.74, 0.64, 0.54]) {
        const webp = await canvasBlob(canvas, "image/webp", quality);
        if (webp.type === "image/webp" && webp.size <= MAX_OUTPUT_BYTES) return { blob: webp, mimeType: "image/webp" };
        const jpeg = await canvasBlob(canvas, "image/jpeg", quality);
        if (jpeg.type === "image/jpeg" && jpeg.size <= MAX_OUTPUT_BYTES) return { blob: jpeg, mimeType: "image/jpeg" };
      }
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("processar")) throw error;
    throw new Error("Não foi possível processar a imagem selecionada.");
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }

  throw new Error("A imagem processada excede o limite de 300 KB.");
}

async function removeAvatar(path: string | null | undefined): Promise<void> {
  if (!path) return;
  await supabase.storage.from("researcher-avatars").remove([path]);
}

function legacyAvatarUrl(url: string | null | undefined): string | null {
  if (!url || url.includes("/storage/v1/object/sign/researcher-avatars/")) return null;
  return url;
}

export const researcherAvatarService = {
  async save({
    pesquisadorId,
    nome,
    cpf,
    file,
    remove = false,
    legacyUrl,
  }: {
    pesquisadorId: string;
    nome: string;
    cpf: string;
    file?: File;
    remove?: boolean;
    legacyUrl?: string | null;
  }): Promise<void> {
    const previous = await researcherDirectoryService.getRawById(pesquisadorId);
    if (!file && !remove) {
      await researcherDirectoryService.upsert({
        pesquisador_id: pesquisadorId,
        nome,
        cpf,
        foto_avatar_path: previous?.foto_avatar_path || null,
        foto_avatar_url: legacyAvatarUrl(previous?.foto_avatar_url) || legacyAvatarUrl(legacyUrl),
      });
      return;
    }

    if (file) {
      const processed = await processResearcherAvatar(file);
      const newPath = `${pesquisadorId}/${crypto.randomUUID()}.${processed.mimeType === "image/webp" ? "webp" : "jpg"}`;
      const { error: uploadError } = await supabase.storage
        .from("researcher-avatars")
        .upload(newPath, processed.blob, { contentType: processed.mimeType, upsert: false });
      if (uploadError) throw uploadError;

      try {
        await researcherDirectoryService.upsert({
          pesquisador_id: pesquisadorId,
          nome,
          cpf,
          foto_avatar_path: newPath,
          foto_avatar_url: legacyAvatarUrl(previous?.foto_avatar_url) || legacyAvatarUrl(legacyUrl),
        });
      } catch (error) {
        await removeAvatar(newPath).catch(() => undefined);
        throw error;
      }

      await removeAvatar(previous?.foto_avatar_path).catch(() => undefined);
      return;
    }

    await researcherDirectoryService.upsert({
      pesquisador_id: pesquisadorId,
      nome,
      cpf,
      foto_avatar_path: null,
      foto_avatar_url: null,
    });
    await removeAvatar(previous?.foto_avatar_path).catch(() => undefined);
  },
};
