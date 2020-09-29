const authenticationRoute = require('./server/authentication/authenticationRoute');
const usersRoute = require('./server/users/usersRoute');
const screamRoute = require('./server/screams/screamRoute');
const followRoute = require('./server/followers/followRoute');
const connectRoute = require('./server/connections/connectRoute');
const notificationRoute = require('./server/notifications/notificationRoute');
const utilsRoute = require('./server/serverUtils/utilsRoute');
const trackRoute = require('./server/tracks/trackRoute');
const nytarticleRoute = require('./server/nytarticles/nytarticleRoute');
const algoliaRoute = require('./server/algolia/algoliaRoute');



module.exports = (app) => {

  app.use('/auth', authenticationRoute);

  app.use('/user', usersRoute);

  app.use('/scream', screamRoute);

  app.use('/followers', followRoute);

  app.use('/connection', connectRoute);

  app.use('/notification', notificationRoute);

  app.use('/utils', utilsRoute);

  app.use('/tracks', trackRoute);

  app.use('/nytarticles', nytarticleRoute);

  app.use('/algolia', algoliaRoute);

};