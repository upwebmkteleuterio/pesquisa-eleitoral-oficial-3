import { supabase } from "@/src/integrations/supabase/client";
import { submissionService } from "./submissionService";

const AUDIO_BUCKET = "submission-audio";
const PAGE_SIZE = 1000;

type RemoteAudioSubmission = {
  id: string;
  pesquisador_id: string;
  audio_storage_path: string;
};

const RETRY_DELAYS_MS = [1000, 3000];

const uploadWithRetries = async (path: string, blob: Blob, contentType: string): Promise<boolean> => {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (!navigator.onLine) return false;

    const { error } = await supabase.storage
      .from(AUDIO_BUCKET)
      .upload(path, blob, { contentType, upsert: true });
    if (!error) return true;
    if (attempt === 2 || !navigator.onLine) return false;

    await new Promise(resolve => window.setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
  }

  return false;
};

const getRemoteAudioSubmissions = async (userId: string): Promise<RemoteAudioSubmission[]> => {
  const records: RemoteAudioSubmission[] = [];
  let pageStart = 0;

  while (true) {
    const { data, error } = await supabase
      .from("submissoes")
      .select("id,pesquisador_id,audio_storage_path")
      .eq("pesquisador_id", userId)
      .not("audio_storage_path", "is", null)
      .order("id", { ascending: true })
      .range(pageStart, pageStart + PAGE_SIZE - 1);

    if (error) throw error;
    const page = (data || []).filter(
      (record): record is RemoteAudioSubmission =>
        record.pesquisador_id === userId &&
        typeof record.id === "string" &&
        typeof record.audio_storage_path === "string" &&
        record.audio_storage_path.length > 0
    );
    records.push(...page);

    if (!data || data.length < PAGE_SIZE) break;
    pageStart += PAGE_SIZE;
  }

  return records;
};

const isUserScopedPath = (path: string, userId: string): boolean => {
  const segments = path.split("/");
  return segments.length > 1 && segments[0] === userId && segments.every(segment => segment.length > 0 && segment !== "." && segment !== "..");
};

const getStoragePaths = async (paths: string[], userId: string): Promise<Set<string>> => {
  const directories = new Set<string>();
  for (const path of paths) {
    if (!isUserScopedPath(path, userId)) throw new Error("audio-path-outside-user-scope");
    const separator = path.lastIndexOf("/");
    directories.add(path.slice(0, separator));
  }

  const existingPaths = new Set<string>();
  for (const directory of directories) {
    let offset = 0;

    while (true) {
      const { data, error } = await supabase.storage
        .from(AUDIO_BUCKET)
        .list(directory, { limit: PAGE_SIZE, offset });

      if (error) throw error;
      for (const entry of data || []) {
        if (entry.name && entry.id) existingPaths.add(`${directory}/${entry.name}`);
      }

      if (!data || data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }

  return existingPaths;
};

const activeReconciliations = new Map<string, Promise<void>>();

const reconcileAudio = async (userId: string): Promise<void> => {
  if (!navigator.onLine || !userId) return;

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user || user.id !== userId) return;

    const [remoteSubmissions, localSubmissions] = await Promise.all([
      getRemoteAudioSubmissions(userId),
      submissionService.getLocalAudioSubmissions(userId)
    ]);
    if (remoteSubmissions.length === 0 || localSubmissions.length === 0) return;

    const remoteById = new Map(remoteSubmissions.map(submission => [submission.id, submission]));
    const localById = new Map(localSubmissions.map(record => [record.submission.id, record.submission]));
    const candidates = Array.from(localById.values()).filter(submission => {
      const remote = remoteById.get(submission.id);
      return Boolean(remote && remote.pesquisador_id === userId);
    });
    if (candidates.length === 0) return;

    const paths = candidates.map(submission => remoteById.get(submission.id)!.audio_storage_path);
    const existingPaths = await getStoragePaths(paths, userId);

    for (const submission of candidates) {
      if (!submission.audio?.blob) continue;
      const storagePath = remoteById.get(submission.id)!.audio_storage_path;

      if (!existingPaths.has(storagePath)) {
        const uploaded = await uploadWithRetries(storagePath, submission.audio.blob, submission.audio.mime_type);
        if (!uploaded) continue;
        existingPaths.add(storagePath);
      }

      try {
        await submissionService.markAudioUploaded(userId, submission.id, storagePath);
      } catch {
        continue;
      }
    }
  } catch {
    return;
  }
};

export const audioReconciliationService = {
  reconcile(userId: string): Promise<void> {
    const activeReconciliation = activeReconciliations.get(userId);
    if (activeReconciliation) return activeReconciliation;

    const execution = reconcileAudio(userId);
    const trackedExecution = execution.finally(() => {
      if (activeReconciliations.get(userId) === trackedExecution) {
        activeReconciliations.delete(userId);
      }
    });
    activeReconciliations.set(userId, trackedExecution);
    return trackedExecution;
  }
};
