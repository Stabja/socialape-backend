const { db, admin } = require('../utils/admin');
const functions = require('firebase-functions');
const moment = require('moment');


// Check whether the follower and followee exists in 'users' collection
exports.createNotificationOnFollow = 
  functions
    .region('asia-east2')
    .firestore
    .document('/followers/{id}')
    .onCreate(snapshot => {
      return db.doc(`/users/${snapshot.data().follower}`)
        .get()
        .then(doc => {
          if(doc.exists && doc.id !== snapshot.data().follower){
            return db.doc(`/notifications/${snapshot.id}`).set({
              createdAt: moment().format(),
              recipient: snapshot.data().following,
              sender: snapshot.data().follower,
              type: 'follow',
              read: false,
              userId: doc.id
            });
          }
        })
        .catch(err => {
          console.error(err);
        });
    });


exports.createNotificationOnFollowBack =
  functions
    .region('asia-east2')
    .firestore
    .document('/followers/{id}')
    .onUpdate(change => {
      console.log(change.before.data().followBack);
      console.log(change.after.data().followBack);
      if(change.before.data().followBack !== change.after.data().followBack){
        console.log('User followed back');
        return db.collection('notifications').add({
          createdAt: moment().format(),
          recipient: snapshot.data().follower,
          sender: snapshot.data().following,
          type: 'follow',
          read: false,
          userId: change.after.data().follower
        });
      }
    });
    