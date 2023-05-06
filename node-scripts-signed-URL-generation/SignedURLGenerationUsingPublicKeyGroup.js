const cfsign = require("aws-cloudfront-sign");
const {
  SecretsManagerClient,
  GetSecretValueCommand,
} = require("@aws-sdk/client-secrets-manager");
const AWS = require("aws-sdk");

/*
Reference:
AWS-SDK cloudfront API documentation - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFront.html 
*/

// secret name you created using CFT
const secret_name = "us-east-1-private-key-secret";

// public key group ID you created using CFT
const public_key_group_id = "c7d4903c-c42f-4c4f-9cda-20822050c7e8";

const client = new SecretsManagerClient({
  region: "us-east-1",
});

const cloudfront = new AWS.CloudFront();

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

const getPublicKeyId = async () => {
  try {
    const params = {
      Id: public_key_group_id,
    };
    const keyGroups = await cloudfront.getKeyGroup(params).promise();

    // get 0th indexed public key attached to public key group
    return keyGroups.KeyGroup?.KeyGroupConfig.Items[0];
  } catch (err) {
    console.error(err);

    throw err;
  }
};

const getSignedUrl = async () => {
  // get private key from secret manager
  const privateKeyString = await getSecret();

  // get public key attached to public key group
  const publicKeyId = await getPublicKeyId();

  const signingParams = {
    // Add correct public key ID relevant to public key group used in your cloudfront distribution
    keypairId: publicKeyId,
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
