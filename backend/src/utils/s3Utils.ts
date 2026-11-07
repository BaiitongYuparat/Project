import { DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../middlewares/upload";  // แก้ path

export const getImageUrl = async (key: string): Promise<string> => {
    return getSignedUrl(s3, new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
    }), { expiresIn: 86400 });
};

export const deleteImage = async (key: string): Promise<void> => {
    try {
        await s3.send(new DeleteObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME!,
            Key: key,
        }));
    } catch (err) {
        console.error("Failed to delete S3 object, key:", key, err);
    }
};