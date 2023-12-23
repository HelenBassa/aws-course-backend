#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as apiGateway from "@aws-cdk/aws-apigatewayv2-alpha";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as sns from "aws-cdk-lib/aws-sns";
import { SubscriptionProtocol } from "aws-cdk-lib/aws-sns";
import { SqsEventSource } from "aws-cdk-lib/aws-lambda-event-sources";
import "dotenv/config";

import { config } from "dotenv";

config();

const { TOPIC_EMAIL, ADDITIONAL_TOPIC_EMAIL } = process.env;

console.log("TOPIC_EMAIL from product-service/product-service", TOPIC_EMAIL);

const app = new cdk.App();

const stack = new cdk.Stack(app, "ProductServiceStack", {
  env: { region: "us-east-1" },
});

const tableProduct = dynamodb.Table.fromTableName(
  stack,
  "ProductTable",
  "Product"
);
const tableStock = dynamodb.Table.fromTableName(stack, "StockTable", "Stock");

const queue = new sqs.Queue(stack, "catalogItemsQueue", {
  queueName: "catalogItemsQueue",
});

const topic = new sns.Topic(stack, "createProductTopic", {
  topicName: "createProductTopicNotification",
});

new sns.Subscription(stack, "createProductTopicSubscription", {
  topic: topic,
  protocol: sns.SubscriptionProtocol.EMAIL,
  endpoint: TOPIC_EMAIL as string,
});

new sns.Subscription(stack, "createProductTopicLowCountSubscription", {
  topic: topic,
  protocol: sns.SubscriptionProtocol.EMAIL,
  endpoint: ADDITIONAL_TOPIC_EMAIL as string,
  filterPolicy: {
    count: sns.SubscriptionFilter.numericFilter({ greaterThan: 5 }),
  },
});

const getProductsList = new NodejsFunction(stack, "GetProductsListLambda", {
  runtime: lambda.Runtime.NODEJS_18_X,
  functionName: "getProductsList",
  entry: "src/handlers/getProductsList.ts",
  environment: {
    PRODUCT_AWS_REGION: "us-east-1",
    SNS_ARN: topic.topicArn,
    TABLE_NAME_PRODUCT: tableProduct.tableName,
    TABLE_NAME_STOCK: tableStock.tableName,
  },
});

const getProductById = new NodejsFunction(stack, "GetProductByIdLambda", {
  runtime: lambda.Runtime.NODEJS_18_X,
  functionName: "getProductById",
  entry: "src/handlers/getProductById.ts",
  environment: {
    PRODUCT_AWS_REGION: "us-east-1",
    SNS_ARN: topic.topicArn,
    TABLE_NAME_PRODUCT: tableProduct.tableName,
    TABLE_NAME_STOCK: tableStock.tableName,
  },
});

const createProduct = new NodejsFunction(stack, "CreateProductLambda", {
  runtime: lambda.Runtime.NODEJS_18_X,
  functionName: "createProduct",
  entry: "src/handlers/createProduct.ts",
  environment: {
    PRODUCT_AWS_REGION: "us-east-1",
    SNS_ARN: topic.topicArn,
    TABLE_NAME_PRODUCT: tableProduct.tableName,
    TABLE_NAME_STOCK: tableStock.tableName,
  },
});

const catalogBatchProcess = new NodejsFunction(
  stack,
  "CatalogBatchProcessLambda",
  {
    runtime: lambda.Runtime.NODEJS_18_X,
    functionName: "catalogBatchProcess",
    entry: "src/handlers/catalogBatchProcess.ts",
    environment: {
      PRODUCT_AWS_REGION: "us-east-1",
      SNS_ARN: topic.topicArn,
      TABLE_NAME_PRODUCT: tableProduct.tableName,
      TABLE_NAME_STOCK: tableStock.tableName,
    },
    timeout: cdk.Duration.seconds(30),
  }
);

tableProduct.grantReadData(getProductsList);
tableStock.grantReadData(getProductsList);
tableProduct.grantReadData(getProductById);
tableStock.grantReadData(getProductById);
tableProduct.grantWriteData(createProduct);
tableStock.grantWriteData(createProduct);
tableProduct.grantWriteData(catalogBatchProcess);
tableStock.grantWriteData(catalogBatchProcess);

topic.grantPublish(catalogBatchProcess);
catalogBatchProcess.addEventSource(new SqsEventSource(queue, { batchSize: 5 }));

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
