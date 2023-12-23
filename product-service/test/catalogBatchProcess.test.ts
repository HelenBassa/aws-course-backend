import { handler as catalogBatchProcess } from "../src/handlers/catalogBatchProcess";
import { mockClient } from "aws-sdk-client-mock";
import { handler as createProduct } from "../src/handlers/createProduct";
import { PublishCommand, SNSClient } from "@aws-sdk/client-sns";
import "aws-sdk-client-mock-jest";

jest.mock("../src/handlers/createProduct");
const createProductMock = createProduct as jest.MockedFunction<
  typeof createProduct
>;

const snsMock = mockClient(SNSClient as any);
snsMock.onAnyCommand().resolves({});

const mockProduct = {
  id: "4261ec4b-b10c-48c5-9345-fc73c48a80ac",
  title: "TestProduct",
  description: "Short TestProduct Description",
  price: 1000,
  count: 10,
};

const { id, ...prouctData } = mockProduct;

const mockEvent = {
  Records: [
    {
      body: JSON.stringify(prouctData),
    },
  ],
};

describe("catalogBatchProcess lambda", () => {
  it("should create 1 product", async () => {
    const result = await catalogBatchProcess(mockEvent);
    // @ts-ignore
    const response = JSON.parse(result.body);
    expect(response.message).toBe("1 products created");
  });

  it("should send email to SNS", async () => {
    await catalogBatchProcess(mockEvent);
    expect(snsMock).toHaveReceivedCommand(PublishCommand as any);
  });
});
