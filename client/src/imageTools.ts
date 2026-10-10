export const MAX_IMAGES_PER_PRODUCT = 5;
export const MAX_IMAGE_DATA_URL_CHARS = 400_000;

export async function fileToResizedDataUrl(file: File, maxDimension = 800): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not read that photo in this browser.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  let dataUrl = canvas.toDataURL("image/jpeg", 0.8);
  if (dataUrl.length > MAX_IMAGE_DATA_URL_CHARS) {
    dataUrl = canvas.toDataURL("image/jpeg", 0.6);
  }
  if (dataUrl.length > MAX_IMAGE_DATA_URL_CHARS) {
    throw new Error(`"${file.name}" is too detailed to store. Try a smaller photo.`);
  }
  return dataUrl;
}

export async function filesToDataUrls(files: File[], limit: number): Promise<string[]> {
  if (files.length > limit) {
    throw new Error(`Choose up to ${limit} photos at a time.`);
  }

  const dataUrls: string[] = [];
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      throw new Error(`"${file.name}" is not an image file.`);
    }
    dataUrls.push(await fileToResizedDataUrl(file));
  }
  return dataUrls;
}
