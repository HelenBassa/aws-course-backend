const { YOURS_GITHUB_ACCOUNT_LOGIN } = process.env;

export const handler = async (event: any) => {
  console.log(event);

  const { authorizationToken } = event;

  if (!authorizationToken) {
    return genPolicy("Unauthorized User", "Deny", event.methodArn);
  }

  try {
    const [authType, encodedCredentials] = authorizationToken.split(" ");
    if (authType !== "Basic" || !encodedCredentials) {
      return genPolicy("Wrong Authorization Token", "Deny", event.methodArn);
    }

    const decodedCredentials = Buffer.from(
      encodedCredentials,
      "base64"
    ).toString("utf-8");

    const [username, password] = decodedCredentials.split(":");

    const storedPassword = YOURS_GITHUB_ACCOUNT_LOGIN;

    if (
      password === storedPassword &&
      typeof password !== "undefined" &&
      typeof storedPassword !== "undefined"
    ) {
      return genPolicy(decodedCredentials, "Allow", event.methodArn);
    } else {
      return genPolicy(decodedCredentials, "Deny", event.methodArn);
    }
  } catch (error) {
    console.error(error);
    throw Error;
  }
};

type Effect = "Allow" | "Deny";

const genPolicy = (principalId: string, effect: Effect, resource: string) => {
  const policy = {
    principalId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: effect,
          Resourse: resource,
        },
      ],
    },
  };

  return policy;
};
