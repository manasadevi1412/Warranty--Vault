import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const bucket = process.env.AWS_S3_BUCKET;
const publicBase = process.env.AWS_S3_PUBLIC_URL; // optional, e.g. CloudFront or public bucket URL

let client: S3Client | null = null;

export function s3Configured(): boolean {
  return Boolean(region && accessKeyId && secretAccessKey && bucket);
}

export function getS3(): S3Client {
  if (!s3Configured()) throw new Error("AWS S3 env vars not set");
  if (!client) {
    client = new S3Client({
      region: region!,
      credentials: { accessKeyId: accessKeyId!, secretAccessKey: secretAccessKey! },
    });
  }
  return client;
}

export async function uploadToS3(args: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<{ key: string; url: string }> {
  const c = getS3();
  await c.send(
    new PutObjectCommand({
      Bucket: bucket!,
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
    })
  );

  let url: string;
  if (publicBase) {
    url = `${publicBase.replace(/\/$/, "")}/${args.key}`;
  } else {
    // signed URL fallback, valid for 7 days
    url = await getSignedUrl(c, new GetObjectCommand({ Bucket: bucket!, Key: args.key }), {
      expiresIn: 60 * 60 * 24 * 7,
    });
  }
  return { key: args.key, url };
}

export async function deleteFromS3(key: string): Promise<void> {
  const c = getS3();
  await c.send(new DeleteObjectCommand({ Bucket: bucket!, Key: key }));
}

export async function presignS3Get(key: string, expiresInSec = 60 * 60): Promise<string> {
  const c = getS3();
  return getSignedUrl(c, new GetObjectCommand({ Bucket: bucket!, Key: key }), {
    expiresIn: expiresInSec,
  });
}
