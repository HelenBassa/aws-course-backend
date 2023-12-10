import { buildResponse, getProductByIdData } from "./libs/utils.js";

export const handler = async (event: any) => {
  try {
    // console.log("Hello from getProductById", event);
    const { productId } = event.pathParameters;
    const product = await getProductByIdData(productId);
    return buildResponse(200, product);
  } catch (err: any) {
    const { error, message } = err;
    return buildResponse(error, { message });
  }
};
