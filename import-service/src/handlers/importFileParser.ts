import { S3Event } from "aws-lambda";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { SendMessageCommand, SQSClient } from "@aws-sdk/client-sqs";

import { Readable } from "stream";
import csv = require("csv-parser");

import { buildResponse } from "../handlers/libs/utils";

import "dotenv/config";

import { config } from "dotenv";

config();

const { IMPORT_SERVICE_AWS_REGION, SQS_URL } = process.env;

export const handler = async (event: S3Event) => {
  const records = event.Records;
  if (!records.length) throw new Error("Found no record");

  const key = records[0].s3.object.key;
  const bucketName = event.Records[0].s3.bucket.name;

  const params = {
    Bucket: bucketName,
    Key: key,
  };

  const client = new S3Client({ region: IMPORT_SERVICE_AWS_REGION! });

  const sqsClient = new SQSClient({ region: IMPORT_SERVICE_AWS_REGION! });

  const getCommand = new GetObjectCommand(params);
  const deleteCommand = new DeleteObjectCommand(params);

  const parsedKey = key.replace("uploaded", "parsed");

  const copyCommand = new CopyObjectCommand({
    Bucket: bucketName,
    Key: parsedKey,
    CopySource: `${bucketName}/${key}`,
  });

  try {
    const file = await client.send(getCommand);
    const readStream = file.Body;

    if (!(readStream instanceof Readable)) {
      throw new Error("Failed to read file");
    }

    await new Promise((resolve, reject) => {
      // readStream
      //   .pipe(csv())
      //   .on("data", (data) => console.log("Data:", data))
      //   .on("end", async () => {
      //     console.log("Finished reading");
      //     const copyRes = await client.send(copyCommand);
      //     console.log(copyRes, "Copied to /parsed");
      //     const deleteRes = await client.send(deleteCommand);
      //     console.log(deleteRes, "Deleted from /uploaded");
      //     resolve(null);
      //   });
      readStream
        .pipe(csv())
        .on("data", async (data) => {
          console.log("Data:", data);
          readStream.pause();
          try {
            await sqsClient.send(
              new SendMessageCommand({
                QueueUrl: process.env.SQS_URL!,
                MessageBody: JSON.stringify(data),
              })
            );
            console.log(`Sending message to SQS -> ${SQS_URL}`, data);
          } catch (e) {
            console.log(`Error sending message to SQS -> ${SQS_URL}`, data);
            reject(e);
          }
          readStream.resume();
        })
        .on("error", reject)
        .on("end", async () => {
          console.log({
            Bucket: bucketName,
            CopySource: `${bucketName}/${key}`,
            Key: key.replace("uploaded", "parsed"),
            sqsUrl: SQS_URL!,
          });
          console.log("Finished reading");
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
