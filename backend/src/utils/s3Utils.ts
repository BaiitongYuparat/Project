import { GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../middlewares/upload";

const bucketName = process.env.AWS_S3_BUCKET_NAME!;

// สร้าง URL สำหรับดูรูปภาพ
export const getImageUrl = async (
  key: string,
  expiresIn: number =  86400
): Promise<string> => {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
    { expiresIn }
  );
};

// ลบรูปภาพจาก S3
export const deleteImage = async (key: string): Promise<void> => {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    })
  );
};
