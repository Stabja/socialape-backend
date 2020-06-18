const { db } = require('../util/admin');
const { DEBUG } = require('../config/constants');
const moment = require('moment');



exports.followUser = (req, res) => {
  let newFollower = {
    follower: req.user.handle,
    following: req.params.handle,
    followBack: false,
    createdAt: moment().format(),
    updatedAt: moment().format()
  };
  db.doc(`/users/${req.user.handle}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'User not found.' });
      }
      return db.collection('followers').add(newFollower);
    })
    .then((doc) => {
      DEBUG && console.log(newFollower);
      let result = newFollower;
      result.followId = doc.id
      return res.json(result);
    })
    .catch(err => {
      DEBUG && console.log(err);
      return res.status(500).json({ error: 'Something went wrong.' });
    });
};


exports.unfollowUser = async (req, res) => {
  const document = db.doc(`/followers/${req.params.followId}`);
  db.doc(`/followers/${req.params.followId}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'Follow document not found.' });
      }
      document.delete();
      return res.json({ message: 'User unfollowed Successfully' });
    })
    .catch(err => {
      DEBUG && console.log(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.followBack = async (req, res) => {
  const document = db.doc(`/followers/${req.params.followId}`);
  db.doc(`/followers/${req.params.followId}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'Follow document not found.' });
      }
      document.update({ followBack: true });
      return res.json({ message: 'User followed Back' });
    })
    .catch(err => {
      DEBUG && console.log(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.revokeFollowBack = async (req, res) => {
  const document = db.doc(`/followers/${req.params.followId}`);
  db.doc(`/followers/${req.params.followId}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'Follow document not found.' });
      }
      document.update({ followBack: false });
      return res.json({ message: 'Follow back revoked' });
    })
    .catch(err => {
      DEBUG && console.log(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.findFollower = async (req, res) => {
  db.collection('followers')
    .where('follower', '==', req.user.handle)
    .where('following', '==', req.params.handle)
    .limit(1)
    .get()
    .then(data => {
      if(data.empty){
        const emptyRes = {
          followId: null,
          followedId: null,
          followedBack: false
        };
        return res.json(emptyRes);
      }
      return res.json({ followId: data.docs[0].id });
    })
    .catch(err => {
      DEBUG && console.log(err);
      return res.status(500).json({ error: 'Something went wrong' });
    });
};


exports.findFollowed = async (req, res) => {
  db.collection('followers')
    .where('follower', '==', req.params.handle)
    .where('following', '==', req.user.handle)
    .limit(1)
    .get()
    .then(data => {
      if(data.empty){
        const emptyRes = {
          followId: null,
          followedId: null,
          followedBack: false
        };
        return res.json(emptyRes);
      }
      return db.doc(`/followers/${data.docs[0].id}`).get();
    })
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
