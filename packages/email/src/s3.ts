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
