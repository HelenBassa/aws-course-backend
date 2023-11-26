#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as apiGW from "aws-cdk-lib/aws-apigateway";
import {
  HttpLambdaAuthorizer,
  HttpLambdaResponseType,
} from "@aws-cdk/aws-apigatewayv2-authorizers-alpha";
import * as apiGateway from "@aws-cdk/aws-apigatewayv2-alpha";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { config } from "dotenv";
import { handler } from "../src/handlers/importFileParser";

config();

const {
  IMPORT_SERVICE_AWS_REGION,
  S3_BUCKET_NAME,
  IMPORT_PRODUCTS_TOPIC_ARN,
  AUTHORIZER_LAMBDA_NAME,
  AUTHORIZER_LAMBDA_ARN,
} = process.env;

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

const queue = sqs.Queue.fromQueueArn(
  stack,
  "ImportFileQueue",
  IMPORT_PRODUCTS_TOPIC_ARN!
);

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
      IMPORT_SQS_URL: queue.queueUrl,
    },
  }
);

const importFileParser = new NodejsFunction(stack, "ImportFileParserLambda", {
  runtime: lambda.Runtime.NODEJS_18_X,
  functionName: "importFileParser",
  entry: "src/handlers/importFileParser.ts",
  environment: {
    IMPORT_SERVICE_AWS_REGION: IMPORT_SERVICE_AWS_REGION!,
    S3_BUCKET_NAME: S3_BUCKET_NAME!,
    IMPORT_SQS_URL: queue.queueUrl,
  },
});

queue.grantSendMessages(importFileParser);

// const basicAuthorizer = lambda.Function.fromFunctionName(
//   stack,
//   "basicAuthorizerLambda",
//   AUTHORIZER_LAMBDA_NAME!
// );

const basicAuthorizerLambda = lambda.Function.fromFunctionArn(
  stack,
  "BasicAuthorizerLambda",
  AUTHORIZER_LAMBDA_ARN!
);

// const authorizer = new apiGW.TokenAuthorizer(stack, "ImportServiceAuthorizer", {
//   handler: basicAuthorizer,
// });
const authorizer = new HttpLambdaAuthorizer(
  "basicAuthorizer",
  basicAuthorizerLambda,
  {
    responseTypes: [HttpLambdaResponseType.IAM],
  }
);

new lambda.CfnPermission(stack, "AuthorizerInvoke", {
  action: "lambda:InvokeFunction",
  functionName: basicAuthorizerLambda.functionName,
  principal: "apigateway.amazonaws.com",
  // sourceArn: authorizer.authorizerArn,
});

bucket.grantReadWrite(importProductsFile);
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

// api.addGatewayResponse("GatewayResponseUnauthorized", {
//   type: apiGateway.ResponseType.UNAUTHORIZED,
//   responseHeaders: {
//     "Access-Control-Allow-Origin": "'*'",
//     "Access-Control-Allow-Headers": "'*'",
//     "Access-Control-Allow-Methods": "'GET,POST,PUT,DELETE'",
//     "Access-Control-Allow-Credentials": "'true'",
//   },
// });
api.addRoutes({
  integration: new HttpLambdaIntegration(
    "ImportProductFileIntegration",
    importProductsFile
  ),
  path: "/import",
  methods: [apiGateway.HttpMethod.GET],
  authorizer,
});

// new cdk.CfnOutput(stack, "AuthorizerArn", {
//   value: authorizer.authorizerArn,
// });
