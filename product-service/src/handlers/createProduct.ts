import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocument,
  GetCommand,
  TransactWriteCommand,
} from "@aws-sdk/lib-dynamodb";

import { buildResponse } from "./libs/utils.js";
import { v4 as uuid } from "uuid";

import { createProduct } from "../handlers/libs/dynamoDB";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocument.from(client);

export const handler = async (event: any) => {
  try {
    console.log("Hello from createProduct", event);

    if (event.body) {
      const { title, description, price, count } = JSON.parse(event.body);

      if (!title || !description || isNaN(+price) || isNaN(+count)) {
        return buildResponse(400, {
          message: "Invalid parameters",
        });
      }

      const product = {
        id: uuid(),
        title,
        description,
        price,
        count,
      };

      const res = await createProduct(product);
      console.log("res ->", res);

      // await docClient.send(
      //   new TransactWriteCommand({
      //     TransactItems: [
      //       {
      //         Put: {
      //           TableName: "Product",
      //           Item: {
      //             id: product.id,
      //             title: product.title,
      //             description: product.description,
      //             price: product.price,
      //           },
      //         },
      //       },
      //       {
      //         Put: {
      //           TableName: "Stock",
      //           Item: {
      //             product_id: product.id,
      //             count: product.count,
      //           },
      //         },
      //       },
      //     ],
      //   })
      // );

      const command = new GetCommand({
        TableName: "Product",
        Key: {
          id: product.id,
        },
      });

      const response = await docClient.send(command);

      return buildResponse(200, {
        product: response.Item,
      });
    }

    return buildResponse(400, {
      message: "Invalid data",
    });
  } catch (err: any) {
    return buildResponse(500, {
      message: err.message,
    });
  }
};
