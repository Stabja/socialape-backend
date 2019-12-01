const functions = require('firebase-functions');

const {
  getOneScream,
  getAllScreams, 
  postOneScream, 
  getScream,
  commentOnScream
} = require('./handlers/screams');
const { 
  signup, 
  login, 
  uploadImage, 
  addUserDetails,
  getAuthenticatedUser,
  getProfileDetailsOfanUser
} = require('./handlers/users');

const FBAuth = require('./util/fbAuth');

const express = require('express');
const app = express();

let tasksList = [
  {"_id":0,"title":"Learn all the features of discord","isDone":false},
  {"_id":1,"title":"Study DBSchema Features","isDone":false},
  {"_id":2,"title":"Right way to design Firebase DB Video","isDone":false},
  {"_id":3,"title":"Full Stack React & Firebase Freecodecamp","isDone":false},
  {"_id":4,"title":"Report Youtube Bug","isDone":false},
  {"_id":5,"title":"Create Exhaustive List of PUBG Discord Servers","isDone":false},
  {"_id":6,"title":"Study FIFA Tournament Bracket","isDone":false},
  {"_id":7,"title":"Solve 'That' HackerRank Problem","isDone":false}
];

app.get('/tasks', (req, res) => {
  res.send(tasksList);
});


// Scream routes
//app.get('/scream/:screamId', getOneScream);
app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postOneScream);
app.post('/scream/:screamId/comment', FBAuth, commentOnScream);
app.get('/scream/:screamId', getScream);
// TODO: delete scream
// TODO: like a scream
// TODO: unlike a scream
// TODO: comment on scream


// Users Routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/:handle/profile', getProfileDetailsOfanUser);


exports.api = functions.https.onRequest(app);


