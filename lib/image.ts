import sharp from "sharp";

const MAX_DIMENSION = 2000;
const JPEG_QUALITY = 80;

export type CompressedImage = {
  buffer: Buffer;
  contentType: string;
  ext: string;
  originalBytes: number;
  finalBytes: number;
};

export async function compressImage(input: Buffer, originalType: string): Promise<CompressedImage> {
  // PDFs (and anything sharp can't decode) pass through unchanged.
  if (originalType === "application/pdf") {
    return {
      buffer: input,
      contentType: originalType,
      ext: "pdf",
      originalBytes: input.length,
      finalBytes: input.length,
    };
  }

  try {
    const buffer = await sharp(input, { failOn: "none" })
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
    return {
      buffer,
      contentType: "image/jpeg",
      ext: "jpg",
      originalBytes: input.length,
      finalBytes: buffer.length,
    };
  } catch (err) {
    console.warn("[compressImage] sharp failed, passing through original:", err);
    return {
      buffer: input,
      contentType: originalType,
      ext: extFromType(originalType),
      originalBytes: input.length,
      finalBytes: input.length,
    };
  }
}

function extFromType(t: string): string {
  if (t === "image/jpeg") return "jpg";
  if (t === "image/png") return "png";
  if (t === "image/webp") return "webp";
  if (t === "image/heic") return "heic";
  if (t === "image/heif") return "heif";
  if (t === "application/pdf") return "pdf";
  return "bin";
}
