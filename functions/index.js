const functions = require('firebase-functions');
const { db } = require('./util/admin');
const FBAuth = require('./util/fbAuth');
const TrackAuth = require('./util/trackAuth');
const ProfileAuth = require('./util/profileAuth');
const express = require('express');
const app = express();

const cors = require('cors');
app.use(cors());
//const cacheControl = require('express-cache-controller');
/* app.use(cacheControl({
  maxAge: 31557600
})); */

const {
  signup,
  login,
  revokeToken
} = require('./handlers/authentication');

const {
  getAllScreams, 
  postOneScream, 
  getScream,
  likeScream,
  unlikeScream,
  commentOnScream,
  deleteScream,
  getScreamByTag
} = require('./handlers/screams');

const {
  uploadImage, 
  addUserDetails,
  getAuthenticatedUser,
  getScreamsFollowedByUser,
  getFollowingListOfUser,
  getProfileDetailsOfanUser,
  getUserDetailsWithAuth,
  markAllNotificationsRead,
  markOneNotificationRead,
} = require('./handlers/users');

const {
  followUser,
  unfollowUser,
  followBack,
  revokeFollowBack,
  findFollower,
  findFollowed
} = require('./handlers/followRoutes');

const {
  getAllTags,
  getAllNotifications,
  markAllNotificationsUnread,
  addExtraUserDetails,
  addOneExtraUserDetail,
  addScreamTags,
  uploadImageAndDisplayScreams,
  setContentImageForAllScreams
} = require('./handlers/utilRoutes');

const {
  getClientTokenWithAxios,
  getJbTracksWithAxios,
  getClientToken,
  getArtistsById,
  getTracksById,
  getTopTracksOfArtist,
  getTracksByArtistIdExternal,
  fetchTracksUsingPagination,
  getTracksByArtistId,
  getTracksByArtistName,
  getTrackByTrackName,
  getTrackById,
  getTracksBetweenDates
} = require('./handlers/tracks');

const {
  createNYTArticles,
  getNYTArticlesCount,
  getAnomalousItem,
  removeDuplicateArticles,
  fetchArticlesUsingPagination
} = require('./handlers/nytArticles')


const triggers = require('./triggers/notificationTriggers');


// Authentication Routes
app.post('/signup', signup);
app.post('/login', login);
app.get('/revoketoken/:uid', revokeToken);


// Scream routes
app.get('/screams', getAllScreams);
app.get('/screams/:tag', getScreamByTag);
app.post('/scream', FBAuth, postOneScream);
app.get('/scream/:screamId', getScream);
app.delete('/scream/:screamId', FBAuth, deleteScream);
app.get('/scream/:screamId/like', FBAuth, likeScream);
app.get('/scream/:screamId/unlike', FBAuth, unlikeScream);
app.post('/scream/:screamId/comment', FBAuth, commentOnScream);


// Users Routes
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/feed', FBAuth, getScreamsFollowedByUser);
app.get('/user/following/:handle', getFollowingListOfUser);
app.get('/user/:handle/profile', getProfileDetailsOfanUser);
app.get('/user/:handle', ProfileAuth,  getUserDetailsWithAuth);
app.post('/notifications', FBAuth, markAllNotificationsRead);
app.get('/notification/:notificationId', FBAuth, markOneNotificationRead);


// Follow routes
app.post('/user/:handle/follow', FBAuth, followUser);
app.get('/findfollower/:handle', FBAuth, findFollower);
app.get('/findfollowed/:handle', FBAuth, findFollowed);
app.delete('/user/:followId/unfollow', FBAuth, unfollowUser);
app.post('/user/:followId/followBack', FBAuth, followBack);
app.post('/user/:followId/revokeFollowBack', FBAuth, revokeFollowBack);


// Utils Routes
app.get('/tags', getAllTags);
app.get('/notifications', getAllNotifications);
app.get('/notifications/allunread', markAllNotificationsUnread);
app.post('/addExtraUserDetails', addExtraUserDetails);
app.post('/addOneExtraUserDetail/:handle', addOneExtraUserDetail);
app.post('/addScreamTags', addScreamTags);
app.post('/uploadImageAndDisplay', uploadImageAndDisplayScreams);
app.post('/setContentImage', setContentImageForAllScreams);


// Tracks Routes
app.get('/tracks/get-axios-token', getClientTokenWithAxios);
app.get('/tracks/justin-bieber', TrackAuth, getJbTracksWithAxios)
app.get('/tracks/get-client-token', getClientToken);
app.get('/tracks/artists', TrackAuth, getArtistsById);
app.get('/tracks/tracks', TrackAuth, getTracksById)
app.get('/tracks/top-tracks/:artistId', TrackAuth, getTopTracksOfArtist);
app.post('/tracks/:artistId/external', TrackAuth, getTracksByArtistIdExternal);
app.get('/tracks', fetchTracksUsingPagination);
app.get('/tracks/by-artist-id', getTracksByArtistId);
app.get('/tracks/by-artisty-name', getTracksByArtistName);
app.get('/track/:name', getTrackByTrackName);
app.get('/track', getTrackById);
app.get('/tracks/inrange', getTracksBetweenDates);


// NytArticles Routes
app.post('/nytarticles/create', createNYTArticles);
app.get('/nytarticles/getCount', getNYTArticlesCount);
app.get('/nytarticles/removeOdd', getAnomalousItem);
app.get('/nytarticles', fetchArticlesUsingPagination);
app.delete('/nytarticles/removeDuplicate', removeDuplicateArticles);



exports.api = functions.https.onRequest(app);

exports.createNotificationOnLike = triggers.createNotificationOnLike;
exports.deleteNotificationOnUnlike = triggers.deleteNotificationOnUnlike;
exports.createNotificationOnComment = triggers.createNotificationOnComment;
exports.onUserImageChange = triggers.onUserImageChange;
exports.onScreamDelete = triggers.onScreamDelete;
