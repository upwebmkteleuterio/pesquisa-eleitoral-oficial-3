import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Mic, MicOff, RefreshCw, ShieldCheck } from "lucide-react";
import { getAudioErrorMessage, getAudioPermission, startAudioRecording, AudioRecordingSession } from "../services/audioService";

interface AudioConsentGateProps {
  onStart: (session: AudioRecordingSession) => void;
  onBack: () => void;
}

export function AudioConsentGate({ onStart, onBack }: AudioConsentGateProps) {
  const [permission, setPermission] = useState<'prompt' | 'granted' | 'denied' | 'unsupported'>('prompt');
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    getAudioPermission().then(setPermission);
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const startRecording = async () => {
    setError(null);
    setIsPreparing(true);
    try {
      const session = await startAudioRecording(new Date().toISOString());
      setPermission('granted');
      onStart(session);
    } catch (recordingError) {
      setError(getAudioErrorMessage(recordingError));
      setPermission(await getAudioPermission());
    } finally {
      if (mountedRef.current) setIsPreparing(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface px-5 py-10 text-on-surface">
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6">
        <button type="button" onClick={onBack} disabled={isPreparing} className="flex w-fit items-center gap-2 rounded-xl p-2 font-bold text-on-surface-variant hover:bg-primary/5 hover:text-primary disabled:opacity-50"><ArrowLeft size={20} /> Voltar</button>
        <section className="rounded-3xl border border-outline bg-surface p-7 shadow-sm">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Mic size={32} /></div>
          <h1 className="text-2xl font-black">Confirmação e áudio da entrevista</h1>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant">Antes de começar, explique ao entrevistado que esta coleta será gravada para controle de qualidade. O áudio será armazenado de forma privada e poderá ser ouvido pela administração e pelo cliente responsável pela pesquisa.</p>
          <div className="mt-5 rounded-2xl bg-primary/5 p-4 text-sm font-medium text-on-surface-variant"><p className="flex items-start gap-3"><ShieldCheck size={19} className="mt-0.5 shrink-0 text-primary" />Peça a confirmação do entrevistado antes de tocar no botão abaixo.</p></div>
          {isPreparing && <div className="mt-6 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm font-black text-primary"><span className="h-3 w-3 animate-pulse rounded-full bg-primary" />Preparando gravação...</div>}
          {error && <div className="mt-6 rounded-2xl bg-rose-50 p-4 text-sm font-bold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300"><div className="flex items-start gap-3"><MicOff size={20} className="mt-0.5 shrink-0" /><span>{error}</span></div><p className="mt-3 text-xs font-medium">Se o bloqueio for permanente, libere o microfone nas configurações do site e tente novamente.</p></div>}
          {permission === 'denied' && !isPreparing && <p className="mt-4 text-xs font-bold text-amber-700 dark:text-amber-300">O navegador informou que o microfone está bloqueado. Libere-o nas configurações do site e use “Tentar novamente”.</p>}
          {permission === 'unsupported' && <p className="mt-4 text-xs font-bold text-rose-700 dark:text-rose-300">Este dispositivo não oferece a API necessária para o microfone. Use outro navegador ou dispositivo para voltar e tentar a coleta.</p>}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row"><button type="button" onClick={startRecording} disabled={isPreparing || permission === 'unsupported'} className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-4 font-black text-white shadow-lg shadow-primary/20 disabled:cursor-not-allowed disabled:opacity-50">{isPreparing ? 'Preparando...' : error ? <><RefreshCw size={19} /> Tentar novamente</> : 'Confirmar e iniciar áudio'}</button><button type="button" onClick={onBack} disabled={isPreparing} className="rounded-2xl border border-outline px-5 py-4 font-black text-on-surface-variant disabled:opacity-50">Voltar</button></div>
        </section>
      </div>
    </div>
  );
}
