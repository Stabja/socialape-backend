var { paths, definitions } = require("./paths");


module.exports = {
  swagger: "2.0",
  info: {
    version: "1.0.0.67",
    title: "HIPSTER",
    description: "Hipster Staging Backend",
  },
  host: "",
  basePath: "/",
  tags: [
    {
      name: "Users",
      description: "API for users in the system",
    },
  ],
  schemes: ["http"],
  consumes: ["application/json"],
  produces: ["application/json"],
  securityDefinitions: {
    sourceKeyIMS: {
      type: "apiKey",
      in: "header",
      name: "x-source-key",
      description: "Source Key authorization to use the API",
    },
    xAuthMSISDN: {
      type: "apiKey",
      in: "header",
      name: "x-auth-msisdn",
      description: "Mongo Row Id of User",
    },
  },
  paths: {
    ...paths
  },
  definitions: {
    ...definitions
  },
};
