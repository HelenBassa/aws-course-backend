#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import * as apiGateway from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";

const app = new cdk.App();

const stack = new cdk.Stack(app, "ProductServiceStack", {
  env: { region: "us-east-1" },
});

const getProductsList = new NodejsFunction(stack, "GetProductsListLambda", {
  runtime: lambda.Runtime.NODEJS_18_X,
  functionName: "getProductsList",
  entry: "src/handlers/getProductsList.ts",
  environment: {
    PRODUCT_AWS_REGION: "us-east-1",
  },
});

const getProductById = new NodejsFunction(stack, "GetProductByIdLambda", {
  runtime: lambda.Runtime.NODEJS_18_X,
  functionName: "getProductById",
  entry: "src/handlers/getProductById.ts",
  environment: {
    PRODUCT_AWS_REGION: "us-east-1",
  },
});

const createProduct = new NodejsFunction(stack, "CreateProductLambda", {
  runtime: lambda.Runtime.NODEJS_18_X,
  functionName: "createProduct",
  entry: "src/handlers/createProduct.ts",
  environment: {
    PRODUCT_AWS_REGION: "us-east-1",
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
