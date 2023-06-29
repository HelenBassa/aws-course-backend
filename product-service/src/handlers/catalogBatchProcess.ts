import { PublishCommand } from "@aws-sdk/client-sns";
import { buildResponse } from "./libs/utils.js";
import { handler as createProduct } from "./createProduct";
import { get } from "lodash";
import { snsClient } from "./libs/utils";
import { v4 as uuidv4 } from "uuid";

export const handler = async (event: any) => {
  console.log("sqs event", event);
  const records = get(event, "Records", []);
  console.log("records", records);

  try {
    for (const record of records) {
      const { description, title, price, count } = JSON.parse(record.body);
      const id = uuidv4();
      const product = { id, description, title, price: Number(price) };
      const stock = { product_id: id, count: Number(count) };
      const result = await createProduct(event);

      // const newProductData = await createProduct(JSON.parse(record.body));
      const newProductData = await createProduct(record);

      console.log({ newProductData });

      await snsClient.send(
        new PublishCommand({
          Subject: "New Products Added to Catalog",
          // Message: JSON.stringify(newProductData),
          TopicArn: process.env.IMPORT_PRODUCTS_TOPIC_ARN, /// <--- set arn  in .env file
          Message: JSON.stringify({
            id: id,
            description: description,
            title: title,
            price: price,
            count: count,
          }),
          // MessageAttributes: {
          //   count: {
          //     DataType: "Number",
          //     StringValue: newProductData.count, /// <-- what???
          //   },
          // },
        })
      );
    }

    return buildResponse(200, records);
  } catch (err) {
    console.log(err);
    return buildResponse(500, err);
  }
};
