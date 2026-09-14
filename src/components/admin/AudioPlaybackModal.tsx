import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Download, LoaderCircle, Pause, Play, X } from "lucide-react";
import { submissionService } from "../../services/submissionService";
import { Submission } from "../../types";

interface AudioPlaybackModalProps {
  submission: Submission | null;
  onClose: () => void;
}

export function AudioPlaybackModal({ submission, onClose }: AudioPlaybackModalProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!submission) return;
    setUrl(null);
    setError(false);
    setPlaying(false);
    setProgress(0);
    setDuration(submission.audio?.duration_seconds || 0);
    setLoading(true);
    submissionService.getAudioPlaybackUrl(submission)
      .then(setUrl)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [submission]);

  if (!submission) return null;

  const togglePlayback = async () => {
    if (!audioRef.current || !url) return;
    if (audioRef.current.paused) {
      await audioRef.current.play();
      setPlaying(true);
    } else {
      audioRef.current.pause();
      setPlaying(false);
    }
  };

  const formatTime = (value: number) => `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-[11000] flex items-center justify-center p-4">
      <button type="button" aria-label="Fechar áudio" onClick={onClose} className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" />
      <section role="dialog" aria-modal="true" aria-labelledby="audio-title" className="relative w-full max-w-md rounded-3xl border border-outline bg-white p-6 shadow-2xl dark:bg-slate-900">
        <header className="flex items-start justify-between gap-4">
          <div><h2 id="audio-title" className="text-xl font-black text-on-surface">Áudio da entrevista</h2><p className="mt-1 text-xs font-bold text-on-surface-variant">{submission.nome_entrevistado || 'Entrevistado'}</p></div>
          <button type="button" onClick={onClose} aria-label="Fechar áudio" className="rounded-xl p-2 text-on-surface-variant hover:bg-slate-100 dark:hover:bg-slate-800"><X size={21} /></button>
        </header>
        {loading && <div className="flex flex-col items-center gap-3 py-12 text-sm font-bold text-on-surface-variant"><LoaderCircle size={30} className="animate-spin text-primary" />Carregando áudio...</div>}
        {!loading && error && <div className="flex flex-col items-center gap-3 py-12 text-center text-sm font-bold text-on-surface-variant"><AlertTriangle size={30} className="text-amber-500" />Áudio indisponível para reprodução.</div>}
        {!loading && !error && url && <div className="mt-8 space-y-5"><audio ref={audioRef} src={url} preload="metadata" onLoadedMetadata={event => setDuration(event.currentTarget.duration || submission.audio?.duration_seconds || 0)} onTimeUpdate={event => setProgress(event.currentTarget.currentTime)} onEnded={() => setPlaying(false)} /><div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full bg-primary transition-all" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} /></div><div className="flex items-center justify-between text-xs font-bold text-on-surface-variant"><span>{formatTime(progress)}</span><span>{formatTime(duration)}</span></div><div className="flex flex-wrap items-center justify-center gap-3"><button type="button" onClick={togglePlayback} className="flex items-center gap-2 rounded-2xl bg-primary px-7 py-4 font-black text-white shadow-lg shadow-primary/20">{playing ? <Pause size={20} /> : <Play size={20} />}{playing ? 'Pausar' : 'Reproduzir'}</button><a href={url} download={`audio-${submission.id}`} onClick={event => event.stopPropagation()} className="inline-flex items-center gap-2 rounded-2xl border border-outline px-5 py-4 font-black text-on-surface transition-colors hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Baixar áudio da resposta"><Download size={20} />Baixar áudio</a></div></div>}
      </section>
    </div>
  );
}
