const { generateKeyPair } = require("crypto");
const fs = require("fs");

keyPairGeneration = async () => {
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

  fs.writeFileSync("./public_key.pem", response.publicKey);
  fs.writeFileSync("./private_key.pem", response.privateKey);
};

keyPairGeneration();
