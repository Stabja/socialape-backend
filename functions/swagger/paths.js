var {
  HTTPMethodType,
  addEndpoint,
  combineEndpoints,
  X_AUTH_MSISDN,
  SOURCE_KEY_IMS,
} = require("./swaggerUtils");


var userAPI = {
  endpoint: "/api/user",
  description: "Query user in system using Auth MSISDN",
};

var internalUserAPI = {
  endpoint: "/internal/api/user",
  description: "Query user in system using dialingCode, mobileNumber or Email",
};

var userResponse200 = {
  description: "User response",
  schema: {
    $ref: "#/definitions/User",
  },
};

var userResponses = {
  200: userResponse200,
};

var QP_DIALING_CODE = {
  name: "dialingCode",
  in: "query",
  description: "User Dialing Code",
  schema: {
    type: "string",
  },
};

var QP_MOBILE_NUMBER = {
  name: "mobileNumber",
  in: "query",
  description: "User Mobile Number",
  schema: {
    type: "string",
  },
};

var QP_EMAIL = {
  name: "email",
  in: "query",
  description: "User Email",
  schema: {
    type: "string",
  },
};

module.exports = {
  paths: combineEndpoints(
    
    addEndpoint(
      HTTPMethodType.GET,
      userAPI,
      [],
      userResponses,
      X_AUTH_MSISDN,
      ["Users"]
    ),

    addEndpoint(
      HTTPMethodType.GET,
      internalUserAPI,
      [
        QP_DIALING_CODE, 
        QP_MOBILE_NUMBER, 
        QP_EMAIL
      ],
      userResponses,
      SOURCE_KEY_IMS,
      ["Users", "Internal"]
    )
  ),
  definitions: {}
};
