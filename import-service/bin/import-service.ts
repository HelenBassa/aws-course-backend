#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apiGw from "aws-cdk-lib/aws-apigateway";
import { TokenAuthorizer } from "aws-cdk-lib/aws-apigateway";
import { aws_iam } from "aws-cdk-lib";
import { PolicyDocument, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { config } from "dotenv";

config();

const { IMPORT_SERVICE_AWS_REGION, S3_BUCKET_NAME, SQS_ARN, AUTH_LAMBDA_ARN } =
  process.env;

console.log(
  "IMPORT_SERVICE_AWS_REGION from import-service/import-service",
  IMPORT_SERVICE_AWS_REGION
);
console.log(
  "S3_BUCKET_NAME from import-service/import-service",
  S3_BUCKET_NAME
);
console.log("SQS_ARN from import-service/import-service", SQS_ARN);

const app = new cdk.App();

const stack = new cdk.Stack(app, "ImportServiceStack", {
  env: { region: IMPORT_SERVICE_AWS_REGION! },
});

const bucket = new s3.Bucket(stack, "ImportBucket", {
  bucketName: S3_BUCKET_NAME!,
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

const queue = sqs.Queue.fromQueueArn(stack, "importFileQueue", SQS_ARN!);

const authLambda = lambda.Function.fromFunctionArn(
  stack,
  "BasicAuthorizerLambda",
  AUTH_LAMBDA_ARN!
);

const authRole = new Role(stack, "authorizerRole", {
  roleName: "authorizer-role",
  assumedBy: new ServicePrincipal("apigateway.amazonaws.com"),
  inlinePolicies: {
    allowLambdaInvocation: PolicyDocument.fromJson({
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Action: ["lambda:InvokeFunction", "lambda:InvokeAsync"],
          Resource: AUTH_LAMBDA_ARN!,
        },
      ],
    }),
  },
});

const authorizer = new TokenAuthorizer(stack, "basicAuthorizer", {
  handler: authLambda,
  authorizerName: "ImportAuthorizer",
  resultsCacheTtl: cdk.Duration.seconds(0),
  assumeRole: authRole,
});

authLambda.addPermission("apigateway", {
  principal: new aws_iam.ServicePrincipal("apigateway.amazonaws.com"),
  sourceArn: authorizer.authorizerArn,
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
      SQS_URL: queue.queueUrl,
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
    SQS_URL: queue.queueUrl,
  },
  bundling: {
    externalModules: ["aws-lambda"],
  },
});

bucket.grantReadWrite(importFileParser);
bucket.grantDelete(importFileParser);
queue.grantSendMessages(importFileParser);

bucket.addEventNotification(
  s3.EventType.OBJECT_CREATED,
  new s3n.LambdaDestination(importFileParser),
  { prefix: "uploaded/" }
);

const api = new apiGw.RestApi(stack, "Import-Api", {
  restApiName: "Import Service",
});

const importModel = api.addModel("ImportModel", {
  modelName: "ImportModel",
  contentType: "application/json",
  schema: {
    schema: apiGw.JsonSchemaVersion.DRAFT4,
    title: "importModel",
    type: apiGw.JsonSchemaType.OBJECT,
    properties: {
      name: {
        type: apiGw.JsonSchemaType.STRING,
      },
    },
  },
});

const importProductFilesIntegration = new apiGw.LambdaIntegration(
  importProductsFile
);

const importProductFilesResource = api.root.addResource("import");

importProductFilesResource.addCorsPreflight({
  allowOrigins: ["*"],
  allowHeaders: ["*"],
  allowMethods: apiGw.Cors.ALL_METHODS,
});

importProductFilesResource.addMethod("GET", importProductFilesIntegration, {
  authorizer: authorizer,
  authorizationType: apiGw.AuthorizationType.CUSTOM,
  methodResponses: [
    {
      statusCode: "200",
      responseModels: {
        "application/json": importModel,
      },
      responseParameters: {
        "method.response.header.Access-Control-Allow-Origin": true,
        "method.response.header.Access-Control-Allow-Credentials": true,
      },
    },
    {
      statusCode: "400",
      responseModels: {
        "application/json": importModel,
      },
      responseParameters: {
        "method.response.header.Access-Control-Allow-Origin": true,
        "method.response.header.Access-Control-Allow-Credentials": true,
      },
    },
  ],
});

const responseHeaders = {
  "Access-Control-Allow-Origin": "'*'",
  "Access-Control-Allow-Headers": "'*'",
  "Access-Control-Allow-Methods": "'GET'",
};

api.addGatewayResponse("apiGwResponseUNAUTHORIZED", {
  type: apiGw.ResponseType.UNAUTHORIZED,
  responseHeaders,
});
api.addGatewayResponse("apiGwResponseACCESS_DENIED", {
  type: apiGw.ResponseType.ACCESS_DENIED,
  responseHeaders,
});
