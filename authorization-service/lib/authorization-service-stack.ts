import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { config } from "dotenv";

config();

const { AUTH_SERVICE_AWS_REGION } = process.env;

const app = new cdk.App();

const stack = new cdk.Stack(app, "AuthorizationServiceStack", {
  env: { region: AUTH_SERVICE_AWS_REGION },
});

const basicAuthorizer = new NodejsFunction(stack, "BasicAuthorizerLambda", {
  runtime: lambda.Runtime.NODEJS_18_X,
  functionName: "basicAuthorizer",
  entry: "src/handlers/basicAuthorizer.ts",
});

new cdk.CfnOutput(stack, "BasicAuthorizerLambdaArn", {
  value: basicAuthorizer.functionArn,
});
