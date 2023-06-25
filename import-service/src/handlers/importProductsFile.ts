import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { buildResponse } from "../handlers/libs/utils";

const { IMPORT_SERVICE_AWS_REGION, S3_BUCKET_NAME } = process.env;

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const fileName = event.queryStringParameters?.name;
  const bucketName = S3_BUCKET_NAME!;

  if (!fileName) {
    return buildResponse(400, {
      message: "Missing parameter: filename",
    });
  }

  const client = new S3Client({ region: IMPORT_SERVICE_AWS_REGION! });
  const key = `uploaded/${fileName}`;

  const putCommand = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
    ContentType: "text/csv",
  });

  try {
    await client.send(putCommand);
    const url = await getSignedUrl(client, putCommand, { expiresIn: 600 });
    return buildResponse(200, url);
  } catch (error: any) {
    return buildResponse(500, {
      message: error.message,
    });
  }
};
