const { admin, db } = require('./admin');

module.exports = (req, res, next) => {
  
  if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
    let idToken = req.headers.authorization.split('Bearer ')[1];

    admin.auth().verifyIdToken(idToken)
      .then(decodedToken => {
        req.user = decodedToken;
        console.log('decodedToken', decodedToken);
        return db
          .collection('users')
          .where('userId', '==', req.user.uid)
          .limit(1)
          .get();
      })
      .then(data => {
        req.user.handle = data.docs[0].data().handle;
        req.user.imageUrl = data.docs[0].data().imageUrl;
        return next();
      })
      .catch(err => {
        console.error('Error while verifying token ', err);
        return res.status(403).json(err);
      });

  } else {
    //return res.status(403).json({ error: 'Unauthorized' });
    let userData = {};
    db.doc(`/users/${req.params.handle}`).get()
      .then((doc) => {
        if(doc.exists){
          userData.user = doc.data();
          return db
            .collection('screams')
            .where('userHandle', '==', req.params.handle)
            .orderBy('createdAt', 'desc')
            .get();
        } else {
          return res.status(404).json({ error: 'User not found' });
        }
      })
      .then((data) => {
        userData.screams = [];
        data.forEach(doc => {
          userData.screams.push({
            body: doc.data().body,
            createdAt: doc.data().createdAt,
            userHandle: doc.data().userHandle,
            userImage: doc.data().userImage,
            likeCount: doc.data().likeCount,
            commentCount: doc.data().commentCount,
            screamId: doc.id
          })
        });
        return res.json(userData);
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  };
  
};