const cfsign = require("aws-cloudfront-sign");
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");

// secret name you created using CFT
const secret_name = "us-east-1-private-key-secret";

const client = new SecretsManagerClient({
  region: "us-east-1",
});

const getSecret = async () => {
  let response;

  try {
    response = await client.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
        VersionStage: "AWSCURRENT",
      })
    );
  } catch (error) {
    throw error;
  }

  return response.SecretString;
};

const getSignedUrl = async () => {
  // get private key from secret manager
  const privateKeyString = await getSecret();

  const signingParams = {
    // Add correct public key ID relevant to public key group used in your cloudfront distribution
    keypairId: "K2C1SH3OVCEZ9B",
    // private key string can be used instead of specifying private key path
    privateKeyString,
    // privateKeyPath: "./private_key.pem",
    // expire time is in milliseconds
    expireTime: new Date().getTime() + 1800000,
  };

  // Generating a signed URL
  const signedUrl = cfsign.getSignedUrl(
    // Add correct cloudfront URL to retrive the object
    "https://d1o9tc7aud4344.cloudfront.net/cloudfront-logo.png",
    signingParams
  );

  console.log("signed URL: ", signedUrl);
};

getSignedUrl();
