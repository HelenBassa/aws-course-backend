import { PublishCommand } from "@aws-sdk/client-sns";
import { buildResponse } from "./libs/utils.js";
import { handler as createProduct } from "./createProduct";
import { get } from "lodash";
import { snsClient } from "./libs/utils";
import { v4 as uuidv4 } from "uuid";

const { IMPORT_PRODUCTS_TOPIC_ARN } = process.env;

export const handler = async (event: any) => {
  try {
    console.log("sqs event", event);
    const records = get(event, "Records", []);
    console.log("records", records);

    for (const record of records) {
      const { description, title, price, count } = JSON.parse(record.body);
      const id = uuidv4();
      const product = { id, description, title, price: Number(price) };
      const stock = { product_id: id, count: Number(count) };
      const newProduct = { ...product, ...stock };
      console.log({ newProduct });

      const result = await createProduct(record);
      console.log({ result });

      await snsClient.send(
        new PublishCommand({
          Subject: "New Products Added to Catalog",
          TopicArn: IMPORT_PRODUCTS_TOPIC_ARN,
          Message: JSON.stringify({
            id: id,
            description: description,
            title: title,
            price: price,
            count: count,
          }),
        })
      );
    }

    return buildResponse(200, records);
  } catch (err) {
    console.log(err);
    return buildResponse(500, err);
  }
};
