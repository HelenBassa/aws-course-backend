import {
  APIGatewayTokenAuthorizerEvent,
  Callback,
  Context,
  Handler,
} from "aws-lambda";

import { generatePolicy } from "./libs/utils";

export const handler: Handler = async (
  event: APIGatewayTokenAuthorizerEvent,
  _ctx: Context,
  callback: Callback
) => {
  console.log({ event });

  try {
    const token = event.authorizationToken;
    console.log({ token });

    if (!token || !token.includes("Basic")) {
      throw new Error("Unauthorized");
    }

    const credentials = token.split(" ")[1];
    if (!credentials) {
      throw new Error("Unauthorized");
    }
    const [username, password] = Buffer.from(credentials, "base64")
      .toString()
      .split(":");

    const storedPassword = process.env[username];

    if (!storedPassword || storedPassword !== password) {
      throw new Error("Unauthorized");
    }
    return callback(null, generatePolicy("user", "Allow", event.methodArn));
  } catch (err) {
    console.log("error", err);
    return callback(null, generatePolicy("user", "Deny", event.methodArn));
  }
};
