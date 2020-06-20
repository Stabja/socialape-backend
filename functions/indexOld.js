const functions = require('firebase-functions');
const { db } = require('./utils/admin');
const TrackAuth = require('./utils/trackAuth');
const ProfileAuth = require('./utils/profileAuth');
const express = require('express');
const cors = require('cors');
require('dotenv').config();


const app = express();
app.use(cors());

/* const cacheControl = require('express-cache-controller');
app.use(cacheControl({
  maxAge: 31557600
})); */

console.log('Environment: ', process.env.NODE_ENV);

const { isUserAuthorized, isProfileAuthorized } = require('./utils/customMiddleware');

const {
  signup,
  login,
  revokeToken
} = require('./server/authentication/authenticationController');

const {
  getAllScreams,
  getPaginatedScreams,
  getCommentsByScreamId,
  postOneScream,
  getScreamById,
  likeScream,
  unlikeScream,
  commentOnScream,
  deleteScream,
  getScreamByTag
} = require('./server/screams/screamController');

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
} = require('./server/users/usersController');

const {
  followUser,
  unfollowUser,
  followBack,
  revokeFollowBack,
  findFollower,
  findFollowed
} = require('./server/followers/followController');

const {
  addConnection,
  getConnectionById,
  withdrawRequest,
  acceptRequest,
  rejectRequest,
  disconnect
} = require('./server/connections/connectController');

const {
  getAllTags,
  getAllNotifications,
  markAllNotificationsUnread,
  addExtraUserDetails,
  addOneExtraUserDetail,
  addScreamTags,
  uploadImageAndDisplayScreams,
  setContentImageForAllScreams,
  createConnectionsFromFollowers
} = require('./server/serverUtils/utilsController');

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
} = require('./server/tracks/trackController');

const {
  createNYTArticles,
  getNYTArticlesCount,
  getAnomalousItem,
  removeDuplicateArticles,
  fetchArticlesUsingPagination,
  fetchOneArticleById,
  lowercasePersons,
  getArticlesByNewsdesk,
  getArticlesByPerson,
  getArticlesByKeyword,
  createNewsdesks,
  createPersons,
  createKeywords,
} = require('./server/nytarticles/nytarticleController');

const {
  exportAllData 
} = require('./utils/exportCollections');

const {
  createNotificationOnLike,
  deleteNotificationOnUnlike,
  createNotificationOnComment,
  onUserImageChange,
  onScreamDelete
} = require('./triggers/screamTriggers');

const {
  createNotificationOnFollow,
  createNotificationOnFollowBack
} = require('./triggers/followTriggers');



// Authentication Routes
app.post('/signup', signup);
app.post('/login', login);
app.get('/revoketoken/:uid', revokeToken);


// Scream Routes
app.get('/allscreams', getAllScreams);
app.get('/screams', getPaginatedScreams);
app.get('/scream/:screamId', getScreamById);
app.get('/scream/:screamId/comments', getCommentsByScreamId);
app.get('/screams/:tag', getScreamByTag);
app.post('/scream', isUserAuthorized, postOneScream);
app.delete('/scream/:screamId', isUserAuthorized, deleteScream);
app.get('/scream/:screamId/like', isUserAuthorized, likeScream);
app.get('/scream/:screamId/unlike', isUserAuthorized, unlikeScream);
app.post('/scream/:screamId/comment', isUserAuthorized, commentOnScream);


// Users Routes
app.post('/user/image', isUserAuthorized, uploadImage);
app.post('/user', isUserAuthorized, addUserDetails);
app.get('/user', isUserAuthorized, getAuthenticatedUser);
app.get('/user/feed', isUserAuthorized, getScreamsFollowedByUser);
app.get('/user/following/:handle', getFollowingListOfUser);
app.get('/user/:handle/profile', getProfileDetailsOfanUser);
app.get('/user/:handle', isProfileAuthorized,  getUserDetailsWithAuth);


// Connection Routes
app.get('/getconnection/:connectionId', isUserAuthorized, getConnectionById);
app.post('/connect/:handle', isUserAuthorized, addConnection);
app.delete('/withdraw/:connectionId', isUserAuthorized, withdrawRequest);
app.put('/accept/:connectionId', isUserAuthorized, acceptRequest);
app.put('/reject/:connectionId', isUserAuthorized, rejectRequest);
app.delete('/disconnect/:connectionId', isUserAuthorized, disconnect);


// Follow Routes
app.get('/findfollower/:handle', isUserAuthorized, findFollower);
app.get('/findfollowed/:handle', isUserAuthorized, findFollowed);
app.post('/follow/:handle', isUserAuthorized, followUser);
app.delete('/unfollow/:followId', isUserAuthorized, unfollowUser);
app.post('/followback/:followId', isUserAuthorized, followBack);
app.post('/revokefollow/:followId', isUserAuthorized, revokeFollowBack);


// Notification Routes
app.get('/notification', getAllNotifications);
app.put('/notification/:id', isUserAuthorized, markOneNotificationRead);
app.put('/notification/allread', isUserAuthorized, markAllNotificationsRead);
app.put('/notification/allunread', markAllNotificationsUnread);


// Utils Routes
app.get('/utils/tags', getAllTags);
app.get('/utils/export-all-data', exportAllData);
app.post('/utils/addExtraUserDetails', addExtraUserDetails);
app.post('/utils/addOneExtraUserDetail/:handle', addOneExtraUserDetail);
app.post('/utils/addScreamTags', addScreamTags);
app.post('/utils/uploadImageAndDisplay', uploadImageAndDisplayScreams);
app.post('/utils/setContentImage', setContentImageForAllScreams);
app.post('/utils/create-connections-from-followers', createConnectionsFromFollowers);


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
app.get('/nytarticles/article/:articleId', fetchOneArticleById);
app.delete('/nytarticles/removeDuplicate', removeDuplicateArticles);
app.put('/nytarticles/lowercase-byline', lowercasePersons);
app.get('/nytarticles/by-newsdesk/:newsdesk', getArticlesByNewsdesk);
app.get('/nytarticles/by-person/:person', getArticlesByPerson);
app.get('/nytarticles/by-keyword', getArticlesByKeyword);
app.post('/nytarticles/newsdesks/create', createNewsdesks);
app.post('/nytarticles/persons/create', createPersons);
app.post('/nytarticles/keywords/:word/create', createKeywords);



exports.api = functions.region('asia-east2').https.onRequest(app);


exports.createNotificationOnLike = createNotificationOnLike;
exports.deleteNotificationOnUnlike = deleteNotificationOnUnlike;
exports.createNotificationOnComment = createNotificationOnComment;
exports.onUserImageChange = onUserImageChange;
exports.onScreamDelete = onScreamDelete;
exports.createNotificationOnFollow = createNotificationOnFollow;
exports.createNotificationOnFollowBack = createNotificationOnFollowBack;
