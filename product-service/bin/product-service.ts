#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as apiGateway from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import * as sns from "aws-cdk-lib/aws-sns";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { config } from "dotenv";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";

config();

const { PRODUCT_AWS_REGION, STOCK_EMAIL } = process.env;

const app = new cdk.App();

const stack = new cdk.Stack(app, "ProductServiceStack", {
  env: { region: PRODUCT_AWS_REGION },
});

const importProductTopic = new sns.Topic(stack, "ImportProductTopic", {
  topicName: "import-products-topic",
});

const importQueue = new sqs.Queue(stack, "ImportQueue", {
  queueName: "import-file-queue",
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

const catalogBatchProcess = new NodejsFunction(
  stack,
  "CatalogBatchProcessLambda",
  {
    runtime: lambda.Runtime.NODEJS_18_X,
    functionName: "catalogBatchProcess",
    entry: "src/handlers/catalogBatchProcess.ts",
  }
);

importProductTopic.grantPublish(catalogBatchProcess);
catalogBatchProcess.addEventSource(
  new SqsEventSource(importQueue, { batchSize: 5 })
);

const getProductsList = new NodejsFunction(stack, "GetProductsListLambda", {
  runtime: lambda.Runtime.NODEJS_18_X,
  functionName: "getProductsList",
  entry: "src/handlers/getProductsList.ts",
  environment: {
    PRODUCT_AWS_REGION: PRODUCT_AWS_REGION!,
  },
});

const getProductById = new NodejsFunction(stack, "GetProductByIdLambda", {
  runtime: lambda.Runtime.NODEJS_18_X,
  functionName: "getProductById",
  entry: "src/handlers/getProductById.ts",
  environment: {
    PRODUCT_AWS_REGION: PRODUCT_AWS_REGION!,
  },
});

const createProduct = new NodejsFunction(stack, "CreateProductLambda", {
  runtime: lambda.Runtime.NODEJS_18_X,
  functionName: "createProduct",
  entry: "src/handlers/createProduct.ts",
  environment: {
    PRODUCT_AWS_REGION: PRODUCT_AWS_REGION!,
  },
});

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
