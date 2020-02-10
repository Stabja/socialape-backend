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
    .then((doc) => {
      console.log(newFollower);
      let result = newFollower;
      result.followerId = doc.id;
      return res.json(result);
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
      res.json({ message: 'User unfollowed Successfully' });
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
        return res.json({ message: 'User followed Back' })
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
        return res.json({ message: 'Follow back revoked' });
      }
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.findFollower = (req, res) => {
  db.collection('followers')
    .where('follower', '==', req.user.handle)
    .where('following', '==', req.params.handle)
    .limit(1)
    .get()
    .then(data => {
      if(data.empty){
        return res.status(400).json({ error: 'No such follower Exists' });
      }
      return res.json({ followId: data.docs[0].id });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: 'Something went wrong' });
    });
};

exports.findFollowed = (req, res) => {
  db.collection('followers')
    .where('follower', '==', req.params.handle)
    .where('following', '==', req.user.handle)
    .limit(1)
    .get()
    .then(data => {
      if(data.empty){
        return res.status(400).json({ error: 'No such follower Exists' });
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
      console.log(err);
      return res.status(500).json({ error: 'Something went wrong' });
    });
};
