const { db } = require('../utils/admin');
const functions = require('firebase-functions');
const { DEBUG } = require('../config/constants');
const { asyncForEach } = require('../utils/asyncForEach');
const trigger = functions.region('asia-east2').firestore;


exports.createNotificationOnLike =
  trigger.document('/likes/{id}')
    .onCreate((snapshot) => {
      return db.doc(`/screams/${snapshot.data().screamId}`)
        .get()
        .then(doc => {
          // User cannot like his own scream
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


exports.deleteNotificationOnUnlike = 
  trigger.document('/likes/{id}')
    .onDelete(snapshot => {
      return db.doc(`/notifications/${snapshot.id}`)
        .delete()
        .catch((err) => {
          console.error(err);
          return;
        });
    });


exports.createNotificationOnComment = 
  trigger.document('/comments/{id}')
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


// Update userName field in screams and comments on User Profile Image Change
exports.onUserNameChange =
  trigger.document('/users/{userId}')
    .onUpdate(async (change) => {
      console.log({ before: change.before.data() });
      console.log({ after: change.after.data() });
      if(change.before.data().fullName !== change.after.data().fullName){
        let batch = db.batch();
        let screams;
        DEBUG && console.log('STARTING PROFILE NAME CHANGE TRIGGER'.green);
        DEBUG && console.log('UPDATING USERNAME FIELD IN SCREAMS'.green);
        try {
          screams = await db.collection('screams')
            .where('userHandle', '==', change.before.data().handle)
            .get();
        } catch(err) {
          DEBUG && console.log(err);
          return;
        }
        await asyncForEach(screams, async (doc) => {
          const scream = await db.doc(`/screams/${doc.id}`);
          await batch.update(scream, { userName: change.after.data().fullName });
        });
        DEBUG && console.log('USERNAME FIELD IN SCREAMS UPDATED');
        DEBUG && console.log('UPDATING USERNAME FIELD IN COMMENTS');
        let comments;
        try {
          comments = await db.collection('comments')
            .where('userHandle', '==', change.before.data().handle)
            .get();
        } catch(err) {
          DEBUG && console.log(err);
          return;
        }
        await asyncForEach(comments, async (doc) => {
          const comment = await db.doc(`/comments/${doc.id}`);
          await batch.update(comment, { userName: change.after.data().fullName });
        });
        batch.commit();
        DEBUG && console.log('USERNAME FIELD IN COMMENTS UPDATED'.green);
      } else return true;
    });
  

// Update userImage field in screams and comments on User Profile Image Change
exports.onUserImageChange = 
  trigger.document('/users/{userId}')
    .onUpdate(async (change) => {
      console.log({ before: change.before.data() });
      console.log({ after: change.after.data() });
      if(change.before.data().imageUrl !== change.after.data().imageUrl){
        let batch = db.batch();
        let screams;
        DEBUG && console.log('STARTING PROFILE IMAGE CHANGE TRIGGER'.green);
        DEBUG && console.log('UPDATING USERIMAGE FIELD IN SCREAMS'.green);
        try {
          screams = await db.collection('screams')
            .where('userHandle', '==', change.before.data().handle)
            .get();
        } catch(err) {
          DEBUG && console.log({ err });
          return;
        }
        await asyncForEach(screams, async (doc) => {
          const scream = await db.doc(`/screams/${doc.id}`);
          await batch.update(scream, { userImage: change.after.data().imageUrl });
        });
        DEBUG && console.log('USERIMAGE FIELD IN SCREAMS UPDATED'.green);
        DEBUG && console.log('UPDATING USERIMAGE FIELD IN COMMENTS'.green);
        let comments;
        try {
          comments = await db.collection('comments')
            .where('userHandle', '==', change.before.data().handle)
            .get();
        } catch(err) {
          DEBUG && console.log({ err });
          return;
        }
        await asyncForEach(comments, async (doc) => {
          const comment = await db.doc(`/comments/${doc.id}`);
          await batch.update(comment, { imageUrl: change.after.data().imageUrl });
        });
        batch.commit();
        DEBUG && console.log('USERIMAGE FIELD IN COMMENTS UPDATED'.green);
      } else return true;
    });


// Delete all the likes, notifications and comments related to a scream when it is deleted
exports.onScreamDelete = 
  trigger.document('/screams/{screamId}')
    .onDelete(async (snapshot, context) => {
      const screamId = context.params.screamId;
      const batch = db.batch();
      let comments, likes, notifications;
      try {
        comments = await db
          .collection('comments')
          .where('screamId', '==', screamId)
          .get();
        likes = await db
          .collection('likes')
          .where('screamId', '==', screamId)
          .get();
        notifications = await db
          .collection('notifications')
          .where('screamId', '==', screamId)
          .get();
      } catch(err) {
        console.error(err);
      }
      DEBUG && console.log('DELETING COMMENTS');
      await Promise.all(comments.docs.map(async (doc) => {
        await batch.delete(db.doc(`/comments/${doc.id}`));
      }));
      DEBUG && console.log('COMMENTS DELETED');
      DEBUG && console.log('DELETING LIKES');
      await Promise.all(likes.docs.map(async (doc) => {
        await batch.delete(db.doc(`/likes/${doc.id}`));
      }));
      DEBUG && console.log('LIKES DELETED');
      DEBUG && console.log('DELETING NOTIFICATIONS');
      await Promise.all(notifications.docs.map(async (doc) => {
        await batch.delete(db.doc(`/notifications/${doc.id}`));
      }));
      DEBUG && console.log('NOTIFICATIONS DELETED');
      return batch.commit();
    });