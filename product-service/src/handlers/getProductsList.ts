import { buildResponse } from "./libs/utils.js";
import { PRODUCTS } from "./constants.js";

export const handler = async (event: any) => {
  try {
    console.log("Hello from getProductsList", event);

    return buildResponse(200, {
      products: PRODUCTS,
    });
  } catch (err: any) {
    return buildResponse(500, {
      message: err.message,
    });
  }
};
