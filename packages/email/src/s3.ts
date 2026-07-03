import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';

export interface S3Config {
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

let s3Client: S3Client | null = null;

function getClient(config: S3Config): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return s3Client;
}

export function formatS3Ref(bucket: string, key: string): string {
  return `s3://${bucket}/${key}`;
}

export function parseS3Ref(rawS3Key: string, defaultBucket: string): { bucket: string; key: string } {
  if (rawS3Key.startsWith('s3://')) {
    const rest = rawS3Key.slice(5);
    const slash = rest.indexOf('/');
    if (slash > 0) {
      return { bucket: rest.slice(0, slash), key: rest.slice(slash + 1) };
    }
  }
  return { bucket: defaultBucket, key: rawS3Key };
}

export async function fetchEmailFromS3(config: S3Config, key: string): Promise<Buffer> {
  const client = getClient(config);
  const response = await client.send(
    new GetObjectCommand({ Bucket: config.bucket, Key: key }),
  );

  if (!response.Body) {
    throw new Error(`Empty S3 object: ${key}`);
  }

  const bytes = await response.Body.transformToByteArray();
  return Buffer.from(bytes);
}
