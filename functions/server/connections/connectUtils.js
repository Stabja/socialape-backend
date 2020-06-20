const { db } = require('../../utils/admin');



exports.fetchUserAvatar = async (handle) => {
  let doc = await db.doc(`/users/${handle}`).get();
  if(!doc.exists) {
    throw new Error(`Can't fetch userinfo.`);
  }
  let userInfo = {};
  userInfo.id = doc.id;
  userInfo.avatar = doc.data().imageUrl;
  userInfo.name = doc.data().fullName;
  return userInfo;
};

exports.doesUserExist = async (handle) => {
  const doc = await db.doc(`/users/${handle}`).get();
  if(!doc.exists){
    return false;
  }
  return true;
};

exports.doesConnectionExists = async (connectionId) => {
  let doc = await db.doc(`/connections/${connectionId}`).get();
  if(!doc.exists){
    return false;
  }
  return true;
};

exports.connectionAlreadyExists = async (sender, receiver) => {
  const forwardQuery = db.collection('connections')
    .where('sender.id', '==', sender)
    .where('receiver.id', '==', receiver);
  const reverseQuery = db.collection('connections')
    .where('sender.id', '==', receiver)
    .where('receiver.id', '==', sender);
  
  let promises = await Promise.all([forwardQuery.get(), reverseQuery.get()]);
  if(promises[0].docs.length > 0 || promises[1].docs.length > 0){
    DEBUG && console.log('Document already exists');
    return true;
  }
  return false;
};