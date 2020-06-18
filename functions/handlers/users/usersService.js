const { db } = require('../../util/admin');
const { DEBUG } = require('../../config/constants');



exports.getScreamsCreatedByUser = async (userHandle) => {
  return new Promise(async (resolve, reject) => {
    DEBUG && console.log('getScreamsCreatedByUser Started');
    let userScreams = await db.collection('screams')
      .where('userHandle', '==', userHandle)
      .orderBy('createdAt', 'desc')
      .get();
    if(!userScreams) {
      //throw new Error('Problem with user screams.');
      reject('Problem with user screams.');
    }
    let screamsList = [];
    userScreams.forEach(doc => {
      let scream = doc.data();
      scream.screamId = doc.id;
      screamsList.push(scream);
    });
    DEBUG && console.log('getScreamsCreatedByUser Ended');
    resolve(screamsList);
  });
};


const getScreamsByIds = async (likedIds) => {
  const screams = likedIds.length > 0 ? await db.getAll(...likedIds) : [];
  if(!screams) {
    return null;
  }
  let screamsList = [];
  screams.forEach(doc => {
    let scream = doc.data();
    scream.screamId = doc.id;
    screamsList.push(scream);
  });
  return screamsList;
};


exports.getScreamsLikedByUser = async (userHandle) => {
  return new Promise(async (resolve, reject) => {
    DEBUG && console.log('getScreamsLikedByUser Started');
    const userLikes = await db.collection('likes')
      .where('userHandle', '==', userHandle)
      .get();
    if(!userLikes){
      //throw new Error('Likes not found.');
      reject('Likes not found.');
    }
    let likedIds = [];
    userLikes.docs.map((doc, i, array) => {
      likedIds.push(db.doc(`/screams/${doc.data().screamId}`));
    });
    let likedScreams = getScreamsByIds(likedIds);
    if(!likedScreams){
      reject('Liked Screams not found.');
    }
    resolve(likedScreams);
  });
};


exports.getUserConnections = async (userHandle) => {
  return new Promise(async (resolve, reject) => {
    DEBUG && console.log('getUserConnections Started');
    const userSender = await db.collection('connections')
      .where('sender.id', '==', userHandle)
      .get();
    const userReceiver = await db.collection('connections')
      .where('receiver.id', '==', userHandle)
      .get();
    if(!userSender || !userReceiver){
      //throw new Error('Connections not found.');
      reject('Connections not found.');
    }
    let connectionsList = [];
    userSender.forEach(doc => {
      let connection = doc.data();
      connection.connectionId = doc.id;
      connectionsList.push(connection);
    });
    userReceiver.forEach(doc => {
      let connection = doc.data();
      connection.connectionId = doc.id;
      connectionsList.push(connection);
    });
    DEBUG && console.log('getUserConnections Ended');
    resolve(connectionsList);
  });
};


exports.findIfUserIsSender = async (userHandle, profileHandle) => {
  return new Promise(async (resolve, reject) => {
    DEBUG && console.log('findIfUserIsSender Started');
    const isUserFollower = await db.collection('connections')
      .where('sender.id', '==', userHandle)
      .where('receiver.id', '==', profileHandle)
      .limit(1)
      .get();
    if(!isUserFollower){
      //throw new Error('Connection not found.');
      reject('Connection not found.');
    }
    DEBUG && console.log('findIfUserIsSender Ended');
    resolve(isUserFollower);
  });
};


exports.findIfUserIsReceiver = async (userHandle, profileHandle) => {
  return new Promise(async (resolve, reject) => {
    DEBUG && console.log('findIfUserIsReceiver Started');
    const isUserFollowing = await db.collection('connections')
      .where('sender.id', '==', profileHandle)
      .where('receiver.id', '==', userHandle)
      .limit(1)
      .get();
    if(!isUserFollowing){
      //throw new Error('Connection not found.');
      reject('Connection not found.');
    }
    DEBUG && console.log('findIfUserIsReceiver Ended');
    resolve(isUserFollowing);
  });
};