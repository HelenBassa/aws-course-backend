import { get } from "http";
import data from "../data.json";

export const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Credentials": true,
};

export const buildResponse = (statusCode: any, body: any) => ({
  statusCode: statusCode,
  headers: CORS_HEADERS,
  body: JSON.stringify(body),
});

export const checkBodyParameters = (requiredParameters: any, data: any) => {
  return requiredParameters.every((parameter: any) => {
    const parameterValue = get(data, parameter);

    if (parameterValue === undefined) {
      return false;
    }

    return true;
  });
};

export const getProductsData = () => Promise.resolve(data);
export const getProductByIdData = (id: string) => {
  const product = data.find((p) => p.id === id);
  if (product) {
    return Promise.resolve(product);
  }
  return Promise.reject({ error: 404, message: "Product not found!" });
};
