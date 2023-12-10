import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { handler } from "../src/handlers/importProductsFile";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { APIGatewayProxyEvent } from "aws-lambda/trigger/api-gateway-proxy";

const mockSignedUrl = "https://mock.s3.amazonaws.com/testUrl";

jest.mock("@aws-sdk/s3-request-presigner");
const getSignedUrlMock = getSignedUrl as jest.MockedFunction<
  typeof getSignedUrl
>;
getSignedUrlMock.mockImplementation(() => Promise.resolve(mockSignedUrl));

const validEvent = {
  queryStringParameters: {
    name: "testEvent",
  },
} as unknown as APIGatewayProxyEvent;

const invalidEvent = {
  queryStringParameters: {},
} as unknown as APIGatewayProxyEvent;

const errorMessage = "Test error message";

describe("Import products lambda tests", () => {
  beforeAll(() => {
    const s3Mock = mockClient(S3Client);
    s3Mock
      .on(PutObjectCommand, {
        Bucket: "aws-course-import-products",
        Key: "products.csv",
      })
      .resolves({});
  });

  it("Lambda should return 200 with SignedURL", async () => {
    const response = await handler(validEvent);
    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toEqual(mockSignedUrl);
  });

  it("Lambda should return 400 if name isn't provided", async () => {
    const response = await handler(invalidEvent);
    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body).toEqual({ message: "Missing parameter: filename" });
  });

  it("Lambda should return 500 in case of unexpected error", async () => {
    getSignedUrlMock.mockImplementationOnce(() =>
      Promise.reject(new Error(errorMessage))
    );
    const response = await handler(validEvent);
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body).toEqual({ message: errorMessage });
  });
});
