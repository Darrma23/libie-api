const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const crypto = require("crypto");

const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY,
  },
});

async function generateUploadUrl(contentType) {
  if (!contentType) throw new Error("contentType required");

  const ext = contentType.split("/")[1] || "bin";
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: fileName,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(s3, command, {
    expiresIn: 300,
  });

  return {
    uploadUrl: signedUrl,
    fileUrl: `${process.env.R2_PUBLIC_URL}/${fileName}`,
  };
}

module.exports = {
  generateUploadUrl
};