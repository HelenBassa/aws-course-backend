#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as apiGateway from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { config } from "dotenv";

config();

const { IMPORT_SERVICE_AWS_REGION, S3_BUCKET_NAME } = process.env;

const app = new cdk.App();

const stack = new cdk.Stack(app, "ImportServiceStack", {
  env: { region: IMPORT_SERVICE_AWS_REGION! },
});

const bucket = new s3.Bucket(stack, "ImportBucket", {
  bucketName: S3_BUCKET_NAME,
  blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  autoDeleteObjects: true,
  cors: [
    {
      allowedOrigins: ["*"],
      allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
      allowedHeaders: ["*"],
      exposedHeaders: [],
    },
  ],
});

const importProductsFile = new NodejsFunction(
  stack,
  "ImportProductsFileLambda",
  {
    runtime: lambda.Runtime.NODEJS_18_X,
    functionName: "importProductsFile",
    entry: "src/handlers/importProductsFile.ts",
    environment: {
      IMPORT_SERVICE_AWS_REGION: IMPORT_SERVICE_AWS_REGION!,
      S3_BUCKET_NAME: S3_BUCKET_NAME!,
    },
  }
);

bucket.grantReadWrite(importProductsFile);

const importFileParser = new NodejsFunction(stack, "ImportFileParserLambda", {
  runtime: lambda.Runtime.NODEJS_18_X,
  functionName: "importFileParser",
  entry: "src/handlers/importFileParser.ts",
  environment: {
    IMPORT_SERVICE_AWS_REGION: IMPORT_SERVICE_AWS_REGION!,
    S3_BUCKET_NAME: S3_BUCKET_NAME!,
  },
});

bucket.grantReadWrite(importFileParser);

bucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(importFileParser),
  { prefix: "uploaded/" }
);

const api = new apiGateway.HttpApi(stack, "ImportApi", {
  corsPreflight: {
    allowHeaders: ["*"],
    allowOrigins: ["*"],
    allowMethods: [apiGateway.CorsHttpMethod.ANY],
  },
});

api.addRoutes({
  integration: new HttpLambdaIntegration(
    "ImportProductFileIntegration",
    importProductsFile
  ),
  path: "/import",
  methods: [apiGateway.HttpMethod.GET],
});
