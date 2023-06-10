import { buildResponse } from "./libs/utils.js";
import { PRODUCTS } from "./constants.js";

export const handler = async (event: any) => {
  try {
    console.log("Hello from getProductById", event);

    const { productId } = event.pathParameters;
    console.log(productId);

    const product = PRODUCTS.filter(
      (product: { id: any }) => product.id === productId
    );

    if (product && product.length > 0) {
      return buildResponse(200, {
        product: product[0],
      });
    } else {
      return buildResponse(404, {
        message: "Product not found",
      });
    }
  } catch (err: any) {
    return buildResponse(500, {
      message: err.message,
    });
  }
};
