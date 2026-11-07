import "dotenv/config";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
});

async function testS3() {
console.log("Bucket:", process.env.AWS_S3_BUCKET);
console.log("Region:", process.env.AWS_REGION);
  await s3.send(
    new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET_NAME!,
      Key: "uploads/test1.txt",
      Body: "S3 connection test",
      ContentType: "text/plain",
    })
  );

  console.log("Upload successful!");
}

testS3().catch(console.error);