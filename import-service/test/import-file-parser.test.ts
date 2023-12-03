import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { mockClient } from "aws-sdk-client-mock";
import { sdkStreamMixin } from "@aws-sdk/util-stream-node";
import { S3EventRecord } from "aws-lambda";

import { createReadStream } from "fs";

import { handler } from "../src/handlers/importFileParser";

const s3Mock = mockClient(S3Client);

const testEvent: { Records: Partial<S3EventRecord>[] } = {
  Records: [
    {
      s3: {
        s3SchemaVersion: "",
        configurationId: "",
        bucket: {
          name: "testBucketName",
          ownerIdentity: {
            principalId: "testPrincipalId",
          },
          arn: "testARN",
        },
        object: {
          key: "test.csv",
          size: 1,
          eTag: "testETag",
          sequencer: "testSequencer",
        },
      },
    },
  ],
};

const errorMessage = "Test error message";

describe("Import file parser lambda tests", () => {
  it("Lambda should return 200 and successful parse CSV file", async () => {
    const consoleLogSpy = jest.spyOn(console, "log");
    const stream = createReadStream("test/test.csv");
    const sdkStream = sdkStreamMixin(stream);

    s3Mock.on(GetObjectCommand).resolves({ Body: sdkStream });

    // @ts-expect-error
    const response = await handler(testEvent, {}, () => ({}));

    const recordsCalls = consoleLogSpy.mock.calls.filter(
      ([data]) => data === "Data:"
    );

    expect(response.statusCode).toBe(200);
    expect(recordsCalls).toHaveLength(2);
    consoleLogSpy.mockReset();
  });

  it("Lambda should return 500 in case of unexpected error", async () => {
    const stream = createReadStream("test/test.csv");
    const sdkStream = sdkStreamMixin(stream);

    stream.pipe = jest.fn(() => {
      throw new Error(errorMessage);
    });

    s3Mock.on(GetObjectCommand).resolves({ Body: sdkStream });

    // @ts-expect-error
    const response = await handler(testEvent, {}, () => ({}));
    expect(response.statusCode).toBe(500);
    const body = JSON.parse(response.body);
    expect(body).toEqual({ message: errorMessage });
  });
});
