const config = require('./config');
const firebase = require('firebase');

firebase.initializeApp(config);

module.exports = {
  config,
  firebase
};