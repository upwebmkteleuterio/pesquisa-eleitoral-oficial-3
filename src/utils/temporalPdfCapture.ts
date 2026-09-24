import html2canvas from 'html2canvas';

export interface TemporalChartCapture {
  dataUrl: string;
  width: number;
  height: number;
}

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';

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

const numericAttribute = (value: string | null, fallback: number): number => {
  const parsed = Number.parseFloat(value || '');
  return Number.isFinite(parsed) ? parsed : fallback;
};

const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    if (typeof reader.result === 'string') resolve(reader.result);
    else reject(new Error('image-data-url-unavailable'));
  }, { once: true });
  reader.addEventListener('error', () => reject(reader.error || new Error('image-read-failed')), { once: true });
  reader.readAsDataURL(blob);
});

const embedLoadedObjectUrlImages = async (target: HTMLElement): Promise<Map<string, string>> => {
  const sources = new Set(
    Array.from(target.querySelectorAll<HTMLImageElement>('img'))
      .map(image => image.currentSrc || image.getAttribute('src') || '')
      .filter(source => source.startsWith('blob:')),
  );
  const embeddedSources = new Map<string, string>();

  await Promise.all(Array.from(sources).map(async source => {
    try {
      const response = await fetch(source);
      if (!response.ok) throw new Error(`image-fetch-failed-${response.status}`);
      embeddedSources.set(source, await blobToDataUrl(await response.blob()));
    } catch {
      // Keep the object URL as a fallback when a loaded image cannot be embedded.
    }
  }));

  return embeddedSources;
};

const replacePhotoForeignObjects = (target: HTMLElement, embeddedSources: Map<string, string>): void => {
  const foreignObjects = Array.from(target.querySelectorAll<SVGForeignObjectElement>('foreignObject'));
  foreignObjects.forEach((foreignObject, index) => {
    const containedImage = foreignObject.querySelector<HTMLImageElement>('img');
    const source = containedImage?.currentSrc || containedImage?.getAttribute('src');
    if (!source) {
      foreignObject.remove();
      return;
    }
    const imageSource = embeddedSources.get(source) || source;

    const x = foreignObject.getAttribute('x') || '0';
    const y = foreignObject.getAttribute('y') || '0';
    const width = foreignObject.getAttribute('width') || '0';
    const height = foreignObject.getAttribute('height') || '0';
    const svg = foreignObject.ownerSVGElement;
    if (!svg) {
      foreignObject.remove();
      return;
    }

    const document = foreignObject.ownerDocument;
    const defs = svg.querySelector('defs') || document.createElementNS(SVG_NAMESPACE, 'defs');
    if (!defs.parentNode) svg.insertBefore(defs, svg.firstChild);

    let clipId = `temporal-pdf-photo-clip-${index}`;
    let suffix = 0;
    while (document.getElementById(clipId)) {
      suffix += 1;
      clipId = `temporal-pdf-photo-clip-${index}-${suffix}`;
    }

    const clipPath = document.createElementNS(SVG_NAMESPACE, 'clipPath');
    clipPath.setAttribute('id', clipId);
    clipPath.setAttribute('clipPathUnits', 'userSpaceOnUse');
    const xNumber = numericAttribute(x, 0);
    const yNumber = numericAttribute(y, 0);
    const widthNumber = numericAttribute(width, 0);
    const heightNumber = numericAttribute(height, 0);
    const circle = document.createElementNS(SVG_NAMESPACE, 'circle');
    circle.setAttribute('cx', String(xNumber + widthNumber / 2));
    circle.setAttribute('cy', String(yNumber + heightNumber / 2));
    circle.setAttribute('r', String(Math.min(widthNumber, heightNumber) / 2));
    clipPath.appendChild(circle);
    defs.appendChild(clipPath);

    const image = document.createElementNS(SVG_NAMESPACE, 'image');
    image.setAttribute('x', x);
    image.setAttribute('y', y);
    image.setAttribute('width', width);
    image.setAttribute('height', height);
    image.setAttribute('href', imageSource);
    image.setAttributeNS(XLINK_NAMESPACE, 'xlink:href', imageSource);
    image.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    image.setAttribute('clip-path', `url(#${clipId})`);
    foreignObject.replaceWith(image);
  });
};

export const captureTemporalChart = async (target: HTMLElement | null): Promise<TemporalChartCapture | null> => {
  if (!target || typeof window === 'undefined') return null;

  try {
    await waitForAnimationFrames(2);
    const bounds = target.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return null;

    await waitForImages(target);
    const embeddedSources = await embedLoadedObjectUrlImages(target);
    await waitForAnimationFrames(2);
    const canvas = await html2canvas(target, {
      backgroundColor: '#ffffff',
      foreignObjectRendering: false,
      imageTimeout: 15000,
      logging: false,
      onclone: clonedDocument => {
        const clonedTarget = clonedDocument.querySelector<HTMLElement>('[data-temporal-pdf-export]');
        if (!clonedTarget) return;
        clonedTarget.style.position = 'fixed';
        clonedTarget.style.left = '0';
        clonedTarget.style.top = '0';
        clonedTarget.style.width = `${Math.max(1, Math.round(bounds.width))}px`;
        clonedTarget.style.height = `${Math.max(1, Math.round(bounds.height))}px`;
        clonedTarget.style.minWidth = clonedTarget.style.width;
        clonedTarget.style.minHeight = clonedTarget.style.height;
        replacePhotoForeignObjects(clonedTarget, embeddedSources);
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
