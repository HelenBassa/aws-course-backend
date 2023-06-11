import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument, GetCommand } from "@aws-sdk/lib-dynamodb";

import { buildResponse /*uuidv4*/ } from "./libs/utils.js";

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
        id: /*uuidv4()*/ "testId2",
        title,
        description,
        price,
        count,
      };

      const ProductParams = {
        TableName: "Product",
        Item: {
          id: product.id,
          title: product.title,
          description: product.description,
          price: product.price,
        },
      };

      const StockParams = {
        TableName: "Stock",
        Item: {
          product_id: product.id,
          count: product.count,
        },
      };

      docClient.put(StockParams, function (err: any, data: any) {
        if (err) {
          console.log("Error Stock", err);
        } else {
          console.log("Success Stock", data);
        }
      });

      docClient.put(ProductParams, function (err: any, data: any) {
        if (err) {
          console.log("Error Product", err);
        } else {
          console.log("Success Product", data);
        }
      });

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
