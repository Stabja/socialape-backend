const functions = require('firebase-functions');
const { 
  isUserAuthorized, 
  isProfileAuthorized, 
  isTrackAuthorized 
} = require('./utils/customMiddleware');
const screamTriggers = require('./triggers/screamTriggers');
const followTriggers = require('./triggers/followTriggers');
const routes = require('./routes');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const swaggerUI = require('swagger-ui-express');
const swagger = require('./swagger/swagger');
require('dotenv').config();


console.log('Environment: ', process.env.NODE_ENV);


const app = express();
app.use(cors());
app.use(morgan('dev'));
app.use(cookieParser());
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swagger));

routes(app);  // Mount the Routes

app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

app.use((err, req, res, next) => {
  console.log(`ERROR ::: Something went wrong, error: ${err.message}, stack: ${err.stack}`);
  res.status(err.status || 500);
  if (req.is('html')) {
    res.render('error', {
      message: err.message,
      error: {},
    });
    return;
  }
  res.send({
    code: err.status || 500,
    status: 'failure',
    message: err.message || 'Something went wrong, please try again later',
    errorCode: err.errorCode,
    errors: err.errors,
  });
});



exports.api = functions.region('asia-east2').https.onRequest(app);
exports.createNotificationOnLike = screamTriggers.createNotificationOnLike;
exports.deleteNotificationOnUnlike = screamTriggers.deleteNotificationOnUnlike;
exports.createNotificationOnComment = screamTriggers.createNotificationOnComment;
exports.onUserImageChange = screamTriggers.onUserImageChange;
exports.onScreamDelete = screamTriggers.onScreamDelete;
exports.createNotificationOnFollow = followTriggers.createNotificationOnFollow;
exports.createNotificationOnFollowBack = followTriggers.createNotificationOnFollowBack;