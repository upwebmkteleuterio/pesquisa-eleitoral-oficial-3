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

export const captureTemporalChart = async (target: HTMLElement | null): Promise<TemporalChartCapture | null> => {
  if (!target || typeof window === 'undefined') return null;

  await waitForImages(target);
  const canvas = await html2canvas(target, {
    backgroundColor: '#ffffff',
    foreignObjectRendering: true,
    imageTimeout: 15000,
    logging: false,
    scale: 3,
    useCORS: true,
    allowTaint: false,
  });

  return {
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
};
