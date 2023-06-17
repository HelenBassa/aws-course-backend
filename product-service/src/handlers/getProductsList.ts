import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

import { buildResponse } from "./libs/utils.js";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

export const handler = async (event: any) => {
  try {
    console.log("Hello from getProductsList", event);

    const scanProduct = new ScanCommand({
      TableName: "Product",
    });

    const scanStock = new ScanCommand({
      TableName: "Stock",
    });

    const responseProduct = await docClient.send(scanProduct);
    const responseStock = await docClient.send(scanStock);

    const stocksHashMap = responseStock.Items?.reduce(
      (acc, cur) => ({
        ...acc,
        [cur.product_id]: cur.count,
      }),
      {}
    );

    const productsWithCount = responseProduct.Items?.map((product) => ({
      ...product,
      count: stocksHashMap![product.id] || 0,
    }));

    return buildResponse(200, {
      products: productsWithCount,
    });
  } catch (err: any) {
    return buildResponse(500, {
      message: err.message,
    });
  }
};
