const MAX_EDGE = 1440;
const JPEG_QUALITY = 0.85;

/**
 * Reads a picked photo and returns a JPEG no larger than 1440px on its long
 * edge. Keeps uploads small; the server stores 1080px anyway. Mirrors Android.
 */
export async function compressForUpload(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    // Applies EXIF orientation, so portrait photos stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error('Couldn’t read that photo');
  }
  const longEdge = Math.max(bitmap.width, bitmap.height);
  const scale = longEdge > MAX_EDGE ? MAX_EDGE / longEdge : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Couldn’t read that photo'))), 'image/jpeg', JPEG_QUALITY),
  );
}

/** Opens the file picker for one image. Resolves null if the user cancels. */
export function pickImage(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}
