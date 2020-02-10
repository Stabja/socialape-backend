const functions = require('firebase-functions');
const { db } = require('./util/admin');
const FBAuth = require('./util/fbAuth');
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
  deleteScream
} = require('./handlers/screams');

const {
  uploadImage, 
  addUserDetails,
  getAuthenticatedUser,
  getProfileDetailsOfanUser,
  getUserDetails,
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
  addScreamTags
} = require('./handlers/utilRoutes');

//Triggers
const triggers = require('./triggers/notificationTriggers');

// Authentication Routes
app.post('/signup', signup);
app.post('/login', login);
app.get('/revoketoken/:uid', revokeToken);

// Scream routes
app.get('/screams', getAllScreams);
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
app.get('/user/:handle/profile', getProfileDetailsOfanUser);
app.get('/user/:handle', getUserDetails);
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
app.post('/addScreamTags', addScreamTags);


exports.api = functions.https.onRequest(app);

exports.createNotificationOnLike = triggers.createNotificationOnLike;
exports.deleteNotificationOnUnlike = triggers.deleteNotificationOnUnlike;
exports.createNotificationOnComment = triggers.createNotificationOnComment;
exports.onUserImageChange = triggers.onUserImageChange;
exports.onScreamDelete = triggers.onScreamDelete;
