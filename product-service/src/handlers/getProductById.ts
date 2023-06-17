import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

import { buildResponse } from "./libs/utils.js";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

async function getStockCountForProduct(productId: string): Promise<number> {
  const stocksResult = await docClient.send(
    new GetCommand({
      TableName: "Stock",
      Key: {
        product_id: productId,
      },
    })
  );

  let { Item: stockItem } = stocksResult;

  if (!stockItem) {
    return 0;
  }

  return Number(stockItem.count) || 0;
}

export const handler = async (event: any) => {
  try {
    console.log("Hello from getProductById", event);

    const { productId } = event.pathParameters;
    console.log(productId);

    const command = new GetCommand({
      TableName: "Product",
      Key: {
        id: productId,
      },
    });

    const response = await docClient.send(command);
    console.log(response);

    if (response.Item === undefined) {
      return buildResponse(404, {
        message: "Product not found",
      });
    } else {
      const stockCount = await getStockCountForProduct(productId);

      const productWithStock = {
        id: response.Item.id,
        price: Number(response.Item.price),
        title: response.Item.title,
        description: response.Item.description,
        count: stockCount,
      };

      return buildResponse(200, {
        product: productWithStock,
      });
    }
  } catch (err: any) {
    return buildResponse(500, {
      message: err.message,
    });
  }
};
