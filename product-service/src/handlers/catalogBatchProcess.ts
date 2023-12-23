import { PublishCommand } from "@aws-sdk/client-sns";
import { buildResponse } from "./libs/utils.js";
import { createProduct } from "../handlers/libs/dynamoDB";
import { snsClient } from "./libs/utils";
import { v4 as uuidv4 } from "uuid";
import { config } from "dotenv";

config();

const { SNS_ARN } = process.env;

export const handler = async (event: any) => {
  try {
    const { Records } = event;

    for (const record of Records) {
      const body = JSON.parse(record.body);
      const { description, title, price, count } = body;
      const id = uuidv4();
      const product = {
        id,
        description,
        title,
        price: Number(price),
        count: Number(count),
      };

      await createProduct(product);

      await snsClient.send(
        new PublishCommand({
          Subject: "New Product",
          TopicArn: SNS_ARN,
          Message: JSON.stringify({
            id: id,
            description: description,
            title: title,
            price: price,
            count: count,
          }),
          MessageAttributes: {
            count: {
              DataType: "Number",
              StringValue: String(count),
            },
          },
        })
      );
    }

    return buildResponse(200, {
      message: Records.length + " products created",
      Records,
    });
  } catch (err) {
    console.log(err);
    return buildResponse(500, err);
  }
};