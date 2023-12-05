import { SNSClient } from "@aws-sdk/client-sns";

import { config } from "dotenv";
config();

const { PRODUCT_AWS_REGION } = process.env;

console.log("PRODUCT_AWS_REGION from sns/product-service", PRODUCT_AWS_REGION);

// Set the AWS Region.
const REGION = PRODUCT_AWS_REGION ?? "eu-east-1"; //e.g. "us-east-1"
// Create SNS service object.
const snsClient = new SNSClient({ region: "eu-east-1" });
export { snsClient };
