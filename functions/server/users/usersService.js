const { db } = require('../../utils/admin');
const { DEBUG } = require('../../config/constants');
const { 
  ScreamModel, 
  LikeModel, 
  ConnectionModel,
  NotificationModel
} = require('../../utils/collectionModels');


exports.getScreamsCreatedByUser = async (userHandle) => {
  return new Promise(async (resolve, reject) => {
    DEBUG && console.log('getScreamsCreatedByUser Started');
    let userScreams = await ScreamModel
      .where('userHandle', '==', userHandle)
      .orderBy('createdAt', 'desc')
      .get();
    if(!userScreams) {
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
    if(doc.exists){
      let scream = doc.data();
      scream.id = doc.id;
      screamsList.push(scream);
    }
  });
  return screamsList;
};


exports.getScreamsLikedByUser = async (userHandle) => {
  return new Promise(async (resolve, reject) => {
    DEBUG && console.log('getScreamsLikedByUser Started');
    const userLikes = await LikeModel.where('userHandle', '==', userHandle).get();
    if(!userLikes){
      reject('Likes not found.');
    }
    let likedIds = [];
    userLikes.docs.map((doc) => {
      likedIds.push(db.doc(`/screams/${doc.data().screamId}`));
    });
    let likedScreams = getScreamsByIds(likedIds);
    if(!likedScreams){
      reject('Liked Screams not found.');
    }
    resolve(likedScreams);
  });
};


exports.getUserLikes = async (userHandle) => {
  return new Promise(async (resolve, reject) => {
    DEBUG && console.log('getUserLikes Started');
    const userLikes = await LikeModel.where('userHandle', '==', userHandle).get();
    if(!userLikes){
      reject('Likes not found.');
    }
    let likes = [];
    userLikes.docs.forEach(doc => {
      likes.push(doc.data());
    });
    DEBUG && console.log('getUserLikes Ended');
    resolve(likes);
  });
};


exports.getUserConnections = async (userHandle) => {
  return new Promise(async (resolve, reject) => {
    DEBUG && console.log('getUserConnections Started');
    const sender = await ConnectionModel.where('sender.id', '==', userHandle).get();
    const receiver = await ConnectionModel.where('receiver.id', '==', userHandle).get();
    if(!sender || !receiver){
      reject('Connections not found.');
    }
    let connectionsList = [];
    sender.forEach(doc => {
      let connection = doc.data();
      connection.id = doc.id;
      connectionsList.push(connection);
    });
    receiver.forEach(doc => {
      let connection = doc.data();
      connection.connectionId = doc.id;
      connectionsList.push(connection);
    });
    DEBUG && console.log('getUserConnections Ended');
    resolve(connectionsList);
  });
};


exports.getUserNotifications = async (userHandle) => {
  return new Promise(async (resolve, reject) => {
    DEBUG && console.log('getUserNotifications Started');
    const notifications = await NotificationModel
      .where('recipient', '==', userHandle)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    if(!notifications){
      reject('Notifications not found.')
    }
    let notificationList = [];
    notifications.docs.forEach(doc => {
      let noti = doc.data();
      noti.id = doc.id;
      notificationList.push(noti);
    });
    DEBUG && console.log('getUserNotifications Ended.');
    resolve(notificationList);
  });
};


exports.findIfUserIsSender = async (userHandle, profileHandle) => {
  return new Promise(async (resolve, reject) => {
    DEBUG && console.log('findIfUserIsSender Started');
    const isUserFollower = await ConnectionModel
      .where('sender.id', '==', userHandle)
      .where('receiver.id', '==', profileHandle)
      .limit(1)
      .get();
    if(!isUserFollower){
      reject('Connection not found.');
    }
    DEBUG && console.log('findIfUserIsSender Ended');
    resolve(isUserFollower);
  });
};


exports.findIfUserIsReceiver = async (userHandle, profileHandle) => {
  return new Promise(async (resolve, reject) => {
    DEBUG && console.log('findIfUserIsReceiver Started');
    const isUserFollowing = await ConnectionModel
      .where('sender.id', '==', profileHandle)
      .where('receiver.id', '==', userHandle)
      .limit(1)
      .get();
    if(!isUserFollowing){
      reject('Connection not found.');
    }
    DEBUG && console.log('findIfUserIsReceiver Ended');
    resolve(isUserFollowing);
  });
};