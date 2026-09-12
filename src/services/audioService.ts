export type AudioPermissionState = 'prompt' | 'granted' | 'denied' | 'unsupported';

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

export async function recordAudio(): Promise<{ blob: Blob; mimeType: string; durationSeconds: number }> {
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

  return new Promise((resolve, reject) => {
    let finished = false;
    let timer: number | undefined;

    const cleanup = () => {
      if (timer) window.clearTimeout(timer);
      stream.getTracks().forEach(track => track.stop());
    };
    const fail = (error: Error) => {
      if (finished) return;
      finished = true;
      cleanup();
      reject(error);
    };

    recorder.ondataavailable = event => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onerror = () => fail(new Error('recording-failed'));
    recorder.onstop = () => {
      if (finished) return;
      finished = true;
      cleanup();
      const duration = Date.now() - startedAt;
      if (duration < 29_500) {
        reject(new Error('recording-interrupted'));
        return;
      }
      const blob = new Blob(chunks, { type: recorder.mimeType || mimeType || 'audio/webm' });
      if (blob.size === 0) {
        reject(new Error('recording-failed'));
        return;
      }
      resolve({
        blob,
        mimeType: recorder.mimeType || mimeType || 'audio/webm',
        durationSeconds: 30,
      });
    };

    stream.getTracks().forEach(track => {
      track.onended = () => {
        if (Date.now() - startedAt < 29_500) fail(new Error('recording-interrupted'));
      };
    });

    try {
      recorder.start();
      timer = window.setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, 30_000);
    } catch {
      fail(new Error('recording-failed'));
    }
  });
}

export function getAudioErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : error instanceof Error ? error.message : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') return 'O microfone foi recusado. Libere o microfone nas configurações deste site e tente novamente.';
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') return 'Nenhum microfone foi encontrado neste dispositivo.';
  if (name === 'NotReadableError' || name === 'TrackStartError') return 'O microfone está ocupado ou indisponível. Feche outros aplicativos que possam estar usando-o e tente novamente.';
  if (name === 'unsupported') return 'Este navegador ou dispositivo não oferece suporte à gravação de áudio.';
  if (name === 'recording-interrupted') return 'A gravação foi interrompida antes de 30 segundos. A coleta não pode prosseguir.';
  return 'Não foi possível concluir a gravação. Verifique o microfone e tente novamente.';
}

export function getAudioExtension(mimeType: string): string {
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('mp4')) return 'mp4';
  return 'webm';
}
