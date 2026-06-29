const MAX_DIMENSION = 1800;
const TARGET_BYTES = 4.5 * 1024 * 1024;

export async function compressImageForUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Selecione uma imagem.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível processar a imagem.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  for (const quality of [0.86, 0.72, 0.58, 0.44]) {
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (blob && blob.size <= TARGET_BYTES) return new File([blob], `${file.name.replace(/\.[^.]+$/, "")}.webp`, { type: "image/webp" });
  }
  throw new Error("Imagem grande demais mesmo após compactação.");
}
