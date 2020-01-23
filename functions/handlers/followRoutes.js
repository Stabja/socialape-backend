const { db, admin } = require('../util/admin');


exports.followUser = (req, res) => {
  const newFollower = {
    follower: req.user.handle,
    following: req.params.handle,
    followBack: false
  };

  db.doc(`/users/${req.user.handle}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'User not found.' });
      }
      //code to be added here
      return db.collection('followers').add(newFollower);
    })
    .then(() => {
      console.log(newFollower);
      return res.json(newFollower);
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: 'Something went wrong.' });
    });
};

exports.unfollowUser = (req, res) => {
  const document = db.doc(`/followers/${req.params.followId}`);
  db.doc(`/users/${req.user.handle}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'User not found.' });
      }
      // Code to be added here
      return db.doc(`/followers/${req.params.followId}`).get();
    })
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'Follow document not found.' });
      }
      return document.delete();
    })
    .then(() => {
      res.json({ error: 'User unfollowed Successfully' });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.followBack = (req, res) => {
  const document = db.doc(`/followers/${req.params.followId}`);
  db.doc(`/followers/${req.params.followId}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'Follow document not found.' });
      }
      return document.get();
    })
    .then(doc => {
      if(doc.exists){
        //let followBackVar = doc.data().followBack;
        document.update({ followBack: true });
        return res.status(404).json({ error: 'User followed Back' })
      }
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.revokeFollowBack = (req, res) => {
  const document = db.doc(`/followers/${req.params.followId}`);
  db.doc(`/followers/${req.params.followId}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'Follow document not found.' });
      }
      return document.get();
    })
    .then(doc => {
      if(doc.exists){
        //let followBackVar = doc.data().followBack;
        document.update({ followBack: false });
        return res.status(404).json({ error: 'Follow back revoked' });
      }
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};