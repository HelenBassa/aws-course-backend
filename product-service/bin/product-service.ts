#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as apiGateway from "@aws-cdk/aws-apigatewayv2-alpha";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import { config } from "dotenv";

config();

const { PRODUCT_AWS_REGION, STOCK_EMAIL } = process.env;

const app = new cdk.App();

const stack = new cdk.Stack(app, "ProductServiceStack", {
  env: { region: PRODUCT_AWS_REGION },
});

const importQueue = new sqs.Queue(stack, "ImportQueue", {
  queueName: "import-file-queue",
});

const importProductTopic = new sns.Topic(stack, "ImportProductTopic", {
  topicName: "import-products-topic",
});

new sns.Subscription(stack, "BigStockSubcription", {
  endpoint: STOCK_EMAIL!,
  protocol: sns.SubscriptionProtocol.EMAIL,
  topic: importProductTopic,
});

// new sns.Subscription(stack, "RegularStockSubscription", {
//   endpoint: STOCK_EMAIL!,
//   protocol: sns.SubscriptionProtocol.EMAIL,
//   topic: importProductTopic,
//   filterPolicy: {
//     count: sns.SubscriptionFilter.numericFilter({ lessThanOrEqualTo: 10 }),
//   },
// });

const productTable = dynamodb.Table.fromTableName(
  stack,
  "ProductTable",
  "Product"
);
const stockTable = dynamodb.Table.fromTableName(stack, "StockTable", "Stock");

const environment = {
  PRODUCT_AWS_REGION: PRODUCT_AWS_REGION!,
  TABLE_NAME_PRODUCT: productTable.tableName,
  TABLE_NAME_STOCK: stockTable.tableName,
  SNS_ARN: importProductTopic.topicArn,
};

const getProductsList = new NodejsFunction(stack, "GetProductsListLambda", {
  runtime: lambda.Runtime.NODEJS_18_X,
  functionName: "getProductsList",
  entry: "src/handlers/getProductsList.ts",
  environment,
});

const getProductById = new NodejsFunction(stack, "GetProductByIdLambda", {
  runtime: lambda.Runtime.NODEJS_18_X,
  functionName: "getProductById",
  entry: "src/handlers/getProductById.ts",
  environment,
});

const createProduct = new NodejsFunction(stack, "CreateProductLambda", {
  runtime: lambda.Runtime.NODEJS_18_X,
  functionName: "createProduct",
  entry: "src/handlers/createProduct.ts",
  environment,
});

const catalogBatchProcess = new NodejsFunction(
  stack,
  "CatalogBatchProcessLambda",
  {
    runtime: lambda.Runtime.NODEJS_18_X,
    functionName: "catalogBatchProcess",
    entry: "src/handlers/catalogBatchProcess.ts",
    environment,
  }
);

importProductTopic.grantPublish(catalogBatchProcess);
catalogBatchProcess.addEventSource(
  new SqsEventSource(importQueue, { batchSize: 5 })
);

productTable.grantReadData(getProductsList);
stockTable.grantReadData(getProductsList);
productTable.grantReadData(getProductById);
stockTable.grantReadData(getProductById);
productTable.grantWriteData(createProduct);
stockTable.grantWriteData(createProduct);
productTable.grantWriteData(catalogBatchProcess);
stockTable.grantWriteData(catalogBatchProcess);

const api = new apiGateway.HttpApi(stack, "ProductApi", {
  corsPreflight: {
    allowHeaders: ["*"],
    allowOrigins: ["*"],
    allowMethods: [apiGateway.CorsHttpMethod.ANY],
  },
});

api.addRoutes({
  integration: new HttpLambdaIntegration(
    "GetProductsListIntegration",
    getProductsList
  ),
  path: "/products",
  methods: [apiGateway.HttpMethod.GET],
});

api.addRoutes({
  integration: new HttpLambdaIntegration(
    "GetProductByIdIntegration",
    getProductById
  ),
  path: "/products/{productId}",
  methods: [apiGateway.HttpMethod.GET],
});

api.addRoutes({
  integration: new HttpLambdaIntegration(
    "CreateProductIntegration",
    createProduct
  ),
  path: "/products",
  methods: [apiGateway.HttpMethod.POST],
});
