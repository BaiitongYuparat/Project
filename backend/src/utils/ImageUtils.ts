import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3 } from "../middlewares/upload";  // แก้ path

export const loadImageBase64 = async (key: string): Promise<string> => {
    const obj = await s3.send(new GetObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME!,
        Key: key,
    }));
    const bytes = await obj.Body!.transformToByteArray();
    return Buffer.from(bytes).toString("base64");
};