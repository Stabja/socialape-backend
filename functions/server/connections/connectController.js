const { db } = require('../../utils/admin');
const { DEBUG } = require('../../config/constants');
const moment = require('moment');

const {
  fetchUserAvatar,
  doesUserExist,
  doesConnectionExists,
  connectionAlreadyExists
} = require('./connectUtils');



exports.getConnectionById = async (req, res) => {
  let doc = await db.doc(`/connections/${req.params.id}`).get();
  if(!doc.exists) {
    return res.status(500).json({ error: 'Invalid ConnectionId' });
  }
  let connection = doc.data();
  connection.connectionId = doc.id;
  return res.json(connection);
};


exports.addConnection = async (req, res) => {
  if(req.user.handle === req.params.handle) {
    return res.status(400).json({ error: 'Can\'t connect to the same user.' });
  }
  if(await connectionAlreadyExists(req.user.handle, req.params.handle)) {
    return res.status(409).json({ error: 'Connection Already Exists.' });
  }
  let newConnection = {
    commonConnections: 0,
    connected: false,
    status: 'Pending',
    createdAt: moment().format(),
    updatedAt: moment().format()
  };
  if(await doesUserExist(req.user.handle) && await doesUserExist(req.params.handle)){
    newConnection.sender = await fetchUserAvatar(req.user.handle);
    newConnection.receiver = await fetchUserAvatar(req.params.handle);
  } else {
    return res.status(404).json({ error: 'User Doesn\'t exist.'});
  }
  const doc = await db.collection('connections').add(newConnection);
  if(!doc) {
    return res.status(500).json({ error: 'Something went wrong.' });
  }
  let result = newConnection;
  result.connectionId = doc.id;
  return res.json(result);
};


exports.withdrawRequest = async (req, res) => {
  if(await doesConnectionExists(req.params.id) === false){
    return res.status(404).json({ error: 'Connection doesn\'t exist.' });
  }
  db.doc(`/connections/${req.params.id}`)
    .delete()
    .then(() => {
      return res.json({ message: 'Request Withdrawn Successfully.' });
    })
    .catch(err => {
      DEBUG && console.log(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.acceptRequest = async (req, res) => {
  if(await doesConnectionExists(req.params.id) === false){
    return res.status(404).json({ error: 'Connection doesn\'t exist.' });
  }
  db.doc(`/connections/${req.params.id}`)
    .update({
      connected: true,
      status: 'Connected',
      updatedAt: moment().format()
    })
    .then(() => {
      return res.json({ message: 'Users Connected Successfully.' });
    })
    .catch(err => {
      DEBUG && console.log(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.rejectRequest = async (req, res) => {
  if(await doesConnectionExists(req.params.id) === false){
    return res.status(404).json({ error: 'Connection doesn\'t exist.' });
  }
  db.doc(`/connections/${req.params.id}`)
    .update({
      connected: false,
      status: 'Rejected',
      updatedAt: moment().format()
    })
    .then(() => {
      return res.json({ message: 'Connection Rejected.' });
    })
    .catch(err => {
      DEBUG && console.log(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.disconnect = async (req, res) => {
  if(await doesConnectionExists(req.params.id) === false){
    return res.status(404).json({ error: 'Connection doesn\'t exist.' });
  }
  db.doc(`/connections/${req.params.id}`)
    .delete()
    .then(() => {
      return res.json({ message: 'Users Disconnected Successfully.' });
    })
    .catch(err => {
      DEBUG && console.log(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.findSender = async (req, res) => {
  let data = await db.collection('connections')
    .where('sender.id', '==', req.user.handle)
    .where('receiver.id', '==', req.params.handle)
    .get();
  if(!data){
    return res.status(500).json({ error: 'Something went wrong' });
  }
  if(data.empty){
    return res.json({ connectionId: null });
  }
  return res.json({ connectionId: data.docs[0].id });
};


exports.findReceiver = async (req, res) => {
  let data = await db.collection('connections')
    .where('sender.id', '==', req.params.handle)
    .where('receiver.id', '==', req.user.handle)
    .get();
  if(!data){
    return res.status(500).json({ error: 'Something went wrong' });
  }
  if(data.empty){
    return res.json({ connectionId: null });
  }
  db.doc(`/connections/${data.docs[0].id}`).get()
    .then(doc => {
      let result = {};
      result.followedBack = doc.data().followBack;
      result.followedId = doc.id;
      return res.json(result);
    })
    .catch(err => {
      DEBUG && console.log(err);
      return res.status(500).json({ error: 'Something went wrong' });
    });
};
