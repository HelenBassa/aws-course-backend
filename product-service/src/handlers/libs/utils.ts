import { get } from "http";
import { SNSClient } from "@aws-sdk/client-sns";

import { config } from "dotenv";
config();

const { PRODUCT_AWS_REGION } = process.env;

export const buildResponse = (statusCode: any, body: any) => ({
  statusCode: statusCode,
  headers: {
    "Access-Control-Allow-Credentials": true,
    "Access-Control-Allow-Origins": "*",
    "Access-Control-Allow-Headers": "*",
  },
  body: JSON.stringify(body),
});

export const checkBodyParameters = (requiredParameters: any, data: any) => {
  return requiredParameters.every((parameter: any) => {
    const parameterValue = get(data, parameter);

    if (parameterValue === undefined) {
      return false;
    }

    return true;
  });
};

export const snsClient = new SNSClient({
  region: "us-east-1",
});
