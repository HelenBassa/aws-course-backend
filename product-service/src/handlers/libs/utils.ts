import { get } from "http";

export const buildResponse = (statusCode: any, body: any) => ({
  statusCode: statusCode,
  headers: {
    "Access-Control-Allow-Credentials": true,
    "Access-Control-Allow-Origins": "*",
    "Access-Control-Allow-Headers": "*",
  },
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
