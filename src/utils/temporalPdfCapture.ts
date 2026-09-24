import html2canvas from 'html2canvas';

export interface TemporalChartCapture {
  dataUrl: string;
  width: number;
  height: number;
}

const waitForImages = async (target: HTMLElement): Promise<void> => {
  const images = Array.from(target.querySelectorAll('img'));
  await Promise.all(images.map(async image => {
    if (!image.complete) {
      await new Promise<void>(resolve => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      });
    }
    if (image.complete && image.decode) {
      try {
        await image.decode();
      } catch {
        // A failed image should not prevent the rest of the chart from exporting.
      }
    }
  }));
};

const waitForAnimationFrames = async (count: number): Promise<void> => {
  for (let frame = 0; frame < count; frame += 1) {
    await new Promise<void>(resolve => window.requestAnimationFrame(() => resolve()));
  }
};

const hasRenderedContent = (canvas: HTMLCanvasElement): boolean => {
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return false;

  try {
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let index = 0; index < pixels.length; index += 16) {
      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const alpha = pixels[index + 3];
      if (alpha > 0 && (red < 245 || green < 245 || blue < 245)) return true;
    }
  } catch {
    return false;
  }

  return false;
};

export const captureTemporalChart = async (target: HTMLElement | null): Promise<TemporalChartCapture | null> => {
  if (!target || typeof window === 'undefined') return null;

  try {
    await waitForAnimationFrames(2);
    const bounds = target.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;

    await waitForImages(target);
    await waitForAnimationFrames(2);
    const canvas = await html2canvas(target, {
      backgroundColor: '#ffffff',
      foreignObjectRendering: true,
      imageTimeout: 15000,
      logging: false,
      onclone: clonedDocument => {
        const clonedTarget = clonedDocument.querySelector<HTMLElement>('[data-temporal-pdf-export]');
        if (!clonedTarget) return;
        clonedTarget.style.position = 'fixed';
        clonedTarget.style.left = '0';
        clonedTarget.style.top = '0';
      },
      scale: 3,
      useCORS: true,
      allowTaint: false,
    });

    if (canvas.width <= 0 || canvas.height <= 0 || !hasRenderedContent(canvas)) return null;

    return {
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
    };
  } catch {
    return null;
  }
};
