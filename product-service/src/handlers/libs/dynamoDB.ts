import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocument, TransactWriteCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const docClient = DynamoDBDocument.from(client);

export const createProduct = async (product: {
  id: any;
  title: any;
  description: any;
  price: any;
  count: any;
}) => {
  try {
    return await docClient.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: "Product",
              Item: {
                id: product.id,
                title: product.title,
                description: product.description,
                price: product.price,
              },
            },
          },
          {
            Put: {
              TableName: "Stock",
              Item: {
                product_id: product.id,
                count: product.count,
              },
            },
          },
        ],
      })
    );
  } catch (err) {
    console.log(err);
    return err;
  }
};
