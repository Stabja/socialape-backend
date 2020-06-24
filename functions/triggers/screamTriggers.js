const { db } = require('../utils/admin');
const functions = require('firebase-functions');
const { DEBUG } = require('../config/constants');

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

//Triggers
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
        screams.forEach(async (doc) => {
          const scream = await db.doc(`/screams/${doc.id}`);
          batch.update(scream, { userName: change.after.data().fullName });
        });
        batch.commit();
        DEBUG && console.log('USERNAME FIELD IN SCREAMS UPDATED'.green);
        DEBUG && console.log('UPDATING USERNAME FIELD IN COMMENTS'.green);
        let comments;
        try {
          comments = await db.collection('comments')
            .where('userHandle', '==', change.before.data().handle)
            .get();
        } catch(err) {
          DEBUG && console.log(err);
          return;
        }
        comments.forEach(async (doc) => {
          const comment = await db.doc(`/comments/${doc.id}`);
          batch.update(comment, { userName: change.after.data().fullName });
        });
        batch.commit();
        DEBUG && console.log('USERNAME FIELD IN COMMENTS UPDATED'.green);
      } else return true;
    });
  


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
        screams.forEach(async (doc) => {
          const scream = await db.doc(`/screams/${doc.id}`);
          batch.update(scream, { userImage: change.after.data().imageUrl });
        });
        batch.commit();
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
        comments.forEach(async (doc) => {
          const comment = await db.doc(`/comments/${doc.id}`);
          batch.update(comment, { imageUrl: change.after.data().imageUrl });
        });
        batch.commit();
        DEBUG && console.log('USERIMAGE FIELD IN COMMENTS UPDATED'.green);
      } else return true;
    });


// Delete all the likes, notifications and comments related to a scream when it is deleted
exports.onScreamDelete = 
  trigger.document('/screams/{screamId}')
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