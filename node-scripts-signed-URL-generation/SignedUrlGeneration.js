const cfsign = require("aws-cloudfront-sign");

const getSignedUrl = async () => {
  const signingParams = {
    // Add correct public key ID relevant to public key group used in your cloudfront distribution
    keypairId: "K2C1SH3OVCEZ9B",
    privateKeyPath: "./private_key.pem",
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
