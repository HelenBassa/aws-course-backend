#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { config } from "dotenv";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";

config();

const { AUTHORIZATION_SERVICE_AWS_REGION } = process.env;

const app = new cdk.App();

const stack = new cdk.Stack(app, "AuthorizationServiceStack", {
  env: { region: AUTHORIZATION_SERVICE_AWS_REGION! },
});

const environment = {
  HelenBassa: process.env.HelenBassa!,
};

const basicAuthorizer = new NodejsFunction(stack, "basicAuthorizerLambda", {
  runtime: lambda.Runtime.NODEJS_18_X,
  functionName: "basicAuthorizer",
  entry: "src/handlers/basicAuthorizer.ts",
  environment,
});
