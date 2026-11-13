export type AudioPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface AudioRecordingResult {
  blob: Blob;
  mimeType: string;
  durationSeconds: number;
}

export interface AudioRecordingSession {
  completed: Promise<AudioRecordingResult>;
  consentAt: string;
  cancel: () => void;
}

const AUDIO_DURATION_MS = 120_000;
const MINIMUM_AUDIO_DURATION_MS = 119_500;
const AUDIO_STOP_GRACE_MS = 5_000;
const AUDIO_WATCHDOG_INTERVAL_MS = 1_000;
const AUDIO_TIMESLICE_MS = 1_000;
const preferredMimeTypes = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/mp4',
];

export function getAudioPermissionState(): AudioPermissionState {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') return 'unsupported';
  return 'prompt';
}

export async function getAudioPermission(): Promise<AudioPermissionState> {
  const initial = getAudioPermissionState();
  if (initial === 'unsupported') return initial;

  if (!navigator.permissions?.query) return initial;
  try {
    const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
    return permission.state === 'granted' || permission.state === 'denied' ? permission.state : 'prompt';
  } catch {
    return initial;
  }
}

export async function startAudioRecording(consentAt: string): Promise<AudioRecordingSession> {
  if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
    throw new Error('unsupported');
  }

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: { ideal: 1 }, sampleRate: { ideal: 16000 } },
  });
  const mimeType = preferredMimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, mimeType ? { mimeType, audioBitsPerSecond: 32000 } : undefined);
  } catch {
    stream.getTracks().forEach(track => track.stop());
    throw new Error('recording-failed');
  }

  const chunks: Blob[] = [];
  const startedAt = Date.now();
  let finished = false;
  let watchdog: number | undefined;
  let resolveCompleted!: (result: AudioRecordingResult) => void;
  let rejectCompleted!: (error: Error) => void;
  const completed = new Promise<AudioRecordingResult>((resolve, reject) => {
    resolveCompleted = resolve;
    rejectCompleted = reject;
  });

  const buildResult = (): AudioRecordingResult | null => {
    const finalMimeType = recorder.mimeType || mimeType || 'audio/webm';
    const blob = new Blob(chunks, { type: finalMimeType });
    if (blob.size === 0) return null;
    return { blob, mimeType: finalMimeType, durationSeconds: 120 };
  };

  const cleanup = () => {
    if (watchdog) window.clearInterval(watchdog);
    document.removeEventListener('visibilitychange', handleVisibility);
    stream.getTracks().forEach(track => track.stop());
  };

  // Fecha a gravação mesmo quando o sistema suspende o app e o gravador
  // nunca avisa que parou, para a tela de finalização nunca esperar para sempre.
  const forceComplete = () => {
    if (finished) return;
    finished = true;
    cleanup();
    const result = buildResult();
    if (!result) {
      rejectCompleted(new Error('recording-failed'));
      return;
    }
    resolveCompleted(result);
  };

  const fail = (error: Error) => {
    if (finished) return;
    finished = true;
    cleanup();
    rejectCompleted(error);
  };

  function handleVisibility() {
    if (document.visibilityState === 'visible') checkDeadline();
  }

  function checkDeadline() {
    if (finished) return;
    const elapsed = Date.now() - startedAt;
    if (elapsed >= AUDIO_DURATION_MS && recorder.state === 'recording') {
      try {
        recorder.stop();
      } catch {
        forceComplete();
        return;
      }
    }
    if (elapsed >= AUDIO_DURATION_MS + AUDIO_STOP_GRACE_MS) forceComplete();
  }

  recorder.ondataavailable = event => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.onerror = () => fail(new Error('recording-failed'));
  recorder.onstop = () => {
    if (finished) return;
    finished = true;
    cleanup();
    const duration = Date.now() - startedAt;
    if (duration < MINIMUM_AUDIO_DURATION_MS) {
      rejectCompleted(new Error('recording-interrupted'));
      return;
    }
    const result = buildResult();
    if (!result) {
      rejectCompleted(new Error('recording-failed'));
      return;
    }
    resolveCompleted(result);
  };

  const interrupt = () => {
    if (finished) return;
    if (recorder.state === 'recording') {
      try {
        recorder.stop();
      } catch {
        fail(new Error('recording-interrupted'));
        return;
      }
    }
    fail(new Error('recording-interrupted'));
  };

  stream.getTracks().forEach(track => {
    track.onended = interrupt;
  });

  try {
    recorder.start(AUDIO_TIMESLICE_MS);
  } catch {
    cleanup();
    throw new Error('recording-failed');
  }

  if (recorder.state !== 'recording') {
    cleanup();
    throw new Error('recording-failed');
  }

  watchdog = window.setInterval(checkDeadline, AUDIO_WATCHDOG_INTERVAL_MS);
  document.addEventListener('visibilitychange', handleVisibility);

  return {
    completed,
    consentAt,
    cancel: () => {
      if (finished) return;
      finished = true;
      cleanup();
      rejectCompleted(new Error('recording-cancelled'));
    },
  };
}

export function getAudioErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : error instanceof Error ? error.message : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'O microfone foi recusado. Libere o microfone nas configurações deste site e tente novamente.';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'Nenhum microfone foi encontrado neste dispositivo.';
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'O microfone está ocupado ou indisponível. Feche outros aplicativos que possam estar usando-o e tente novamente.';
  if (name === 'unsupported') return 'Este navegador ou dispositivo não oferece suporte à gravação de áudio.';
  if (name === 'recording-interrupted') return 'A gravação foi interrompida antes da conclusão. A coleta não pode prosseguir.';
  if (name === 'recording-cancelled') return 'A gravação foi cancelada. Inicie a coleta novamente para continuar.';
  return 'Não foi possível concluir a gravação. Verifique o microfone e tente novamente.';
}

export function getAudioExtension(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'mp4';
  return 'webm';
}
