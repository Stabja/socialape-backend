const functions = require('firebase-functions');
const { db } = require('./util/admin');
const FBAuth = require('./util/fbAuth');
const express = require('express');
const app = express();

const cors = require('cors');
app.use(cors());

const {
  getOneScream,
  getAllScreams, 
  postOneScream, 
  getScream,
  likeScream,
  unlikeScream,
  commentOnScream,
  deleteScream
} = require('./handlers/screams');

const { 
  signup, 
  login, 
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
  revokeFollowBack
} = require('./handlers/followRoutes');

const {
  getAllTags,
  getAllNotifications,
  markAllNotificationsUnread,
  addExtraUserDetails,
  addScreamTags
} = require('./handlers/utilRoutes');


// Scream routes
//app.get('/scream/:screamId', getOneScream);
app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postOneScream);
app.get('/scream/:screamId', getScream);
app.delete('/scream/:screamId', FBAuth, deleteScream);
app.get('/scream/:screamId/like', FBAuth, likeScream);
app.get('/scream/:screamId/unlike', FBAuth, unlikeScream);
app.post('/scream/:screamId/comment', FBAuth, commentOnScream);


// Users Routes
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/:handle/profile', getProfileDetailsOfanUser);
app.get('/user/:handle', getUserDetails);
app.post('/notifications', FBAuth, markAllNotificationsRead);
app.get('/notification/:notificationId', FBAuth, markOneNotificationRead);


// Follow routes
app.post('/user/:handle/follow', FBAuth, followUser);
app.post('/user/:followId/unfollow', FBAuth, unfollowUser);
app.post('/user/:followId/followBack', FBAuth, followBack);
app.post('/user/:followId/revokeFollowBack', FBAuth, revokeFollowBack);


// Utils Routes
app.get('/tags', getAllTags);
app.get('/notifications', getAllNotifications);
app.get('/notifications/allunread', markAllNotificationsUnread);
app.post('/addExtraUserDetails', addExtraUserDetails);
app.post('/addScreamTags', addScreamTags);


exports.api = functions.https.onRequest(app);


exports.createNotificationOnLike = functions.firestore.document('/likes/{id}')
  .onCreate((snapshot) => {
    return db.doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then(doc => {
        if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle){
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'like',
            read: false,
            screamId: doc.id
          });
        }
      })
      .catch(err => {
        console.error(err);
      });
});


exports.deleteNotificationOnUnlike = functions.firestore.document('/likes/{id}')
  .onDelete(snapshot => {
    return db.doc(`/notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return;
      });
});

//Triggers
exports.createNotificationOnComment = functions.firestore.document('/comments/{id}')
  .onCreate(snapshot => {
    return db.doc(`/screams/${snapshot.data().screamId}`)
      .get()
      .then((doc) => {
        if(doc.exists && doc.data().userHandle !== snapshot.data().userHandle) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle,
            type: 'comment',
            read: false,
            screamId: doc.id
          });
        }
      })
      .catch((err) => {
        console.error(err);
        return;
      });
});


exports.onUserImageChange = functions.firestore.document('/users/{userId}')
  .onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());
    if(change.before.data().imageUrl !== change.after.data().imageUrl){
      console.log('image has changed');
      let batch = db.batch();
      return db
        .collection('screams')
        .where('userHandle', '==', change.before.data().handle)
        .get()
        .then((data) => {
          data.forEach(doc => {
            const scream = db.doc(`/screams/${doc.id}`);
            batch.update(scream, { userImage: change.after.data().imageUrl });
          });
          return batch.commit();
        });
    } else return true;
  });


// Delete all the likes, notifications and comments related to a scream when it is deleted
exports.onScreamDelete = functions.firestore.document('/screams/{screamId}')
  .onDelete((snapshot, context) => {
    const screamId = context.params.screamId;
    const batch = db.batch();
    return db
      .collection('comments')
      .where('screamId', '==', screamId)
      .get()
      .then((data) => {
        data.forEach(doc => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db
          .collection('likes')
          .where('screamId', '==', screamId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db
          .collection('notifications')
          .where('screamId', '==', screamId)
          .get();
      })
      .then(data => {
        data.forEach(doc => {
          batch.delete(db.doc(`/notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch(err => {
        console.error(err);
      });
  });