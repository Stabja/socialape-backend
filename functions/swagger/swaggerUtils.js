module.exports = {
  HTTPMethodType: {
    GET: "get",
    POST: "post",
    PUT: "put",
    DELETE: "delete",
  },

  addEndpoint: (
    method,
    _a,
    parameters,
    responses,
    security,
    tags,
    produces
  ) => {
    var _b, _c;
    var endpoint = _a.endpoint,
      description = _a.description;
    if (produces === void 0) {
      produces = ["application/json"];
    }
    return (
      (_b = {}),
      (_b[endpoint] =
        ((_c = {}),
        (_c[method] = {
          description: description,
          parameters: parameters,
          responses: responses,
          security: security,
          tags: tags,
          produces: produces,
        }),
        _c)),
      _b
    );
  },

  combineEndpoints: (...endpoints) => {
    return (endpoints || []).reduce((acc, e) => ({ ...acc, ...e }), {});
  },

  SOURCE_KEY_IMS: [
    {
      sourceKeyIMS: [],
    },
  ],

  X_AUTH_MSISDN: [
    {
      xAuthMSISDN: [],
    },
  ],
};
