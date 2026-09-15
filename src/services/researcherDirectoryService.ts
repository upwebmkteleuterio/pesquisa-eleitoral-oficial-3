import { supabase } from "@/src/integrations/supabase/client";

export interface ResearcherDirectoryEntry {
  pesquisador_id: string;
  nome: string;
  cpf: string;
  foto_avatar_url?: string | null;
  foto_avatar_path?: string | null;
  created_at?: string;
  updated_at?: string;
}

const DIRECTORY_COLUMNS = "pesquisador_id,nome,cpf,foto_avatar_url,foto_avatar_path,created_at,updated_at";
const SIGNED_URL_SECONDS = 60 * 60;

async function withSignedAvatar(entry: ResearcherDirectoryEntry): Promise<ResearcherDirectoryEntry> {
  if (!entry.foto_avatar_path) return entry;

  try {
    const { data } = await supabase.storage
      .from("researcher-avatars")
      .createSignedUrl(entry.foto_avatar_path, SIGNED_URL_SECONDS);

    return {
      ...entry,
      foto_avatar_url: data?.signedUrl || entry.foto_avatar_url || null,
    };
  } catch {
    return entry;
  }
}

export const researcherDirectoryService = {
  async getByIds(ids: string[]): Promise<ResearcherDirectoryEntry[]> {
    const uniqueIds = [...new Set(ids.filter(Boolean))];
    if (!uniqueIds.length) return [];

    const { data, error } = await supabase
      .from("pesquisadores_publicos")
      .select(DIRECTORY_COLUMNS)
      .in("pesquisador_id", uniqueIds);

    if (error) throw error;
    return Promise.all((data || []).map(entry => withSignedAvatar(entry as ResearcherDirectoryEntry)));
  },

  async getAll(): Promise<ResearcherDirectoryEntry[]> {
    const { data, error } = await supabase
      .from("pesquisadores_publicos")
      .select(DIRECTORY_COLUMNS)
      .order("nome", { ascending: true });

    if (error) throw error;
    return Promise.all((data || []).map(entry => withSignedAvatar(entry as ResearcherDirectoryEntry)));
  },

  async getRawById(id: string): Promise<ResearcherDirectoryEntry | null> {
    const { data, error } = await supabase
      .from("pesquisadores_publicos")
      .select(DIRECTORY_COLUMNS)
      .eq("pesquisador_id", id)
      .maybeSingle();

    if (error) throw error;
    return (data as ResearcherDirectoryEntry | null) || null;
  },

  async upsert(entry: Pick<ResearcherDirectoryEntry, "pesquisador_id" | "nome" | "cpf"> & Partial<Pick<ResearcherDirectoryEntry, "foto_avatar_url" | "foto_avatar_path">>): Promise<ResearcherDirectoryEntry> {
    const { data, error } = await supabase
      .from("pesquisadores_publicos")
      .upsert({ ...entry, updated_at: new Date().toISOString() }, { onConflict: "pesquisador_id" })
      .select(DIRECTORY_COLUMNS)
      .single();

    if (error) throw error;
    return data as ResearcherDirectoryEntry;
  },
};

export function indexResearcherDirectory(entries: ResearcherDirectoryEntry[]): Map<string, ResearcherDirectoryEntry> {
  return new Map(entries.map(entry => [entry.pesquisador_id, entry]));
}
