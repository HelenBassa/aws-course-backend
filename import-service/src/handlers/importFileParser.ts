import { S3Event } from "aws-lambda";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import { PassThrough, Readable } from "stream";
import { buildResponse } from "../handlers/libs/utils";
import csv from "csv-parser";

const { IMPORT_SERVICE_AWS_REGION, SQS_URL } = process.env;

export const handler = async (event: S3Event) => {
  const records = event.Records;
  if (!records.length) throw new Error("Found no record");

  const key = records[0].s3.object.key;
  const bucketName = event.Records[0].s3.bucket.name;
  console.log({ key });
  console.log({ bucketName });

  const params = {
    Bucket: bucketName,
    Key: key,
  };

  const client = new S3Client({ region: IMPORT_SERVICE_AWS_REGION });
  const sqsClient = new SQSClient({ region: IMPORT_SERVICE_AWS_REGION });

  const getCommand = new GetObjectCommand(params);
  const deleteCommand = new DeleteObjectCommand(params);

  const parsedKey = key.replace("uploaded", "parsed");
  console.log({ parsedKey });

  const copyCommand = new CopyObjectCommand({
    Bucket: bucketName,
    Key: parsedKey,
    CopySource: `${bucketName}/${key}`,
  });

  try {
    const file = await client.send(getCommand);
    console.log({ file });
    const readStream = file.Body;

    if (!(readStream instanceof Readable)) {
      throw new Error("Failed to read file");
    }

    await new Promise((resolve, reject) => {
      const stream = readStream.pipe(new PassThrough());
      stream
        .pipe(csv())
        .on("data", async (data) => {
          stream.pause();

          try {
            console.log("Send message to SQS", data);

            await sqsClient.send(
              new SendMessageCommand({
                QueueUrl: SQS_URL,
                MessageBody: JSON.stringify(data),
              })
            );
          } catch (err) {
            console.log("sqs dont send message with this data->", data);
            reject(err);
          }

          stream.resume();
        })
        .on("error", reject)
        .on("end", async () => {
          console.log("Finished reading");
          console.log({
            Bucket: bucketName,
            CopySource: bucketName + "/" + key,
            Key: key.replace("uploaded", "parsed"),
            sqsUrl: SQS_URL,
          });

          const copyRes = await client.send(copyCommand);
          console.log(copyRes, "Copied to /parsed");
          const deleteRes = await client.send(deleteCommand);
          console.log(deleteRes, "Deleted from /uploaded");
          resolve(null);
        });
    });

    return buildResponse(200, {
      message: "Parsed successful",
    });
  } catch (error: any) {
    console.error(error);
    return buildResponse(500, {
      message: error.message,
    });
  }
};
