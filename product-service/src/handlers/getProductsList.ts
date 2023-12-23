import { buildResponse, getProductsData } from "./libs/utils.js";

export const handler = async () => {
  try {
    const products = await getProductsData();
    return buildResponse(200, products);
  } catch (err: any) {
    const { error, message } = err;
    return buildResponse(error, { message });
  }
};
