var AWS = require("aws-sdk");
const { generateKeyPair } = require("crypto");

const PUBLIC_KEY_GROUP_ID = process.env.PUBLIC_KEY_GROUP_ID;
const PUBLIC_KEY_GROUP_NAME = process.env.PUBLIC_KEY_GROUP_NAME;
const PUBLIC_KEY_NAME = process.env.PUBLIC_KEY_NAME;
const PRIVATE_KEY_SECRET_ARN = process.env.PRIVATE_KEY_SECRET_ARN;
const STACK_NAME = process.env.STACK_NAME;

/*
This is for secret manager private key rotation lambda function and will not be used to run this locally as a npm script

Reference:
AWS-SDK secret manager API documentation - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/SecretsManager.html
AWS-SDK cloudfront API documentation - https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/CloudFront.html 
*/
exports.handler = async (event) => {
  var cloudfront = new AWS.CloudFront({ apiVersion: "2020-05-31" });

  // creates private and public key
  const response = await new Promise((resolve) => {
    generateKeyPair(
      "rsa",
      {
        modulusLength: 2048,
        publicKeyEncoding: {
          type: "spki",
          format: "pem",
        },
        privateKeyEncoding: {
          type: "pkcs8",
          format: "pem",
        },
      },
      (err, publicKey, privateKey) => {
        resolve({ publicKey, privateKey });
      }
    );
  });

  var params = {
    Id: PUBLIC_KEY_GROUP_ID,
  };

  // retrieve public key group created for the cloudfront distribution
  const keyGroups = await cloudfront.getKeyGroup(params).promise();

  // get existing public key attached to public key group
  const pkGet = await new Promise((resolve) =>
    cloudfront.getPublicKey(
      { Id: keyGroups.KeyGroup.KeyGroupConfig.Items[0] },
      function (err, data) {
        if (err) console.log(err, err.stack);
        else resolve(data);
      }
    )
  );

  const timeStamp = new Date().getTime();

  const createParams = {
    PublicKeyConfig: {
      // CallerReference needs to be a unique ID to avoid replaying same request, hence timestamp is used
      CallerReference: `${timeStamp}`,
      EncodedKey: response.publicKey,
      Name: `${PUBLIC_KEY_NAME}-${timeStamp}`,
      Comment: `public key created by rotation lambda for ${STACK_NAME} - ${timeStamp}`,
    },
  };

  // create a new public key in cloudfront using generated public key
  const pkCreation = await new Promise((resolve) =>
    cloudfront.createPublicKey(createParams, function (err, data) {
      if (err) console.log(err, err.stack);
      else resolve(data);
    })
  );

  console.log("Created public key: ", pkCreation);

  var updateParams = {
    Id: keyGroups.KeyGroup.Id,
    KeyGroupConfig: {
      Items: [pkCreation.PublicKey.Id],
      Name: PUBLIC_KEY_GROUP_NAME,
      Comment: `public key created by rotation lambda for ${STACK_NAME} - ${timeStamp}`,
    },
    IfMatch: keyGroups.ETag,
  };

  // attach newly created public key with public key group of the cloudfront distribution
  const pkGroupUpdate = await new Promise((resolve) =>
    cloudfront.updateKeyGroup(updateParams, function (err, data) {
      if (err) console.log(err, err.stack);
      else resolve(data);
    })
  );

  console.log("Updated public key group: ", pkGroupUpdate);

  // delete previous public key
  const deletePreviousPublicKey = await new Promise((resolve) =>
    cloudfront.deletePublicKey(
      // ETag header is retrieved when fetching public key
      { Id: pkGet.PublicKey.Id, IfMatch: pkGet.ETag },
      function (err, data) {
        if (err) console.log(err, err.stack);
        else resolve(data);
      }
    )
  );

  console.log("Previous public key deletion: ", deletePreviousPublicKey);

  const secretsmanager = new AWS.SecretsManager();

  const privateKeyParams = {
    Description: `private key updated by rotation lambda for ${STACK_NAME} - ${timeStamp}`,
    SecretId: PRIVATE_KEY_SECRET_ARN,
    SecretString: response.privateKey,
  };

  // update private key in secret manager with generated private key
  const updatePrivateKey = await new Promise((resolve) =>
    secretsmanager.updateSecret(privateKeyParams, function (err, data) {
      if (err) console.log(err, err.stack);
      else resolve(data);
    })
  );

  console.log("Updated private key in secret manager: ", updatePrivateKey);
};
