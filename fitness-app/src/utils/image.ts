// Photo helpers shared by workout media and photo check-ins.

export const JPEG_QUALITY = 0.82;

export async function decodeImage(file: Blob): Promise<ImageBitmap> {
  // createImageBitmap honours EXIF orientation, so portrait phone shots stay upright.
  return createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
}

export function resizeToJpeg(
  bitmap: ImageBitmap,
  maxEdge: number,
  quality = JPEG_QUALITY
): Promise<{ blob: Blob; width: number; height: number }> {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) =>
    canvas.toBlob(b => (b ? resolve({ blob: b, width, height }) : reject(new Error('Could not encode photo'))), 'image/jpeg', quality)
  );
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

// Full-size + thumbnail JPEGs from a camera/library file.
export async function preparePhoto(file: Blob, maxEdge = 1600, thumbEdge = 400) {
  const bitmap = await decodeImage(file);
  try {
    const full = await resizeToJpeg(bitmap, maxEdge);
    const thumb = await resizeToJpeg(bitmap, thumbEdge);
    return { blob: full.blob, thumbnail: thumb.blob, width: full.width, height: full.height };
  } finally {
    bitmap.close();
  }
}

// Small JPEG data URL for sending to an AI model: enough detail to compare
// physique, without uploading the full-resolution photo.
export async function toAiDataUrl(blob: Blob, maxEdge = 768): Promise<string> {
  const bitmap = await decodeImage(blob);
  try {
    const { blob: small } = await resizeToJpeg(bitmap, maxEdge, 0.8);
    return blobToDataUrl(small);
  } finally {
    bitmap.close();
  }
}
