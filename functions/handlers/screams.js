const { db, admin } = require('../util/admin');


exports.getAllScreams = (req, res) => {
  db.collection('screams')
    .orderBy('createdAt', 'desc')
    .get()
    .then(snapshot => {
      let screams = [];
      var map = new Object();
      snapshot.forEach(doc => {
        screams.push({
          screamId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt
        });
        map[doc.id] = doc.data();
      });
      console.log(screams);
      console.log(map);
      return res.json(screams);
    })
    .catch((err) => {
      console.log(err);
    });
};


exports.getOneScream = (req, res) => {
  let screamRef = db.collection('screams').doc(req.params.screamId);
  screamRef.get()
    .then(doc => {
      if (!doc.exists) {
        console.log('No such document!');
        return res.send('Document not found!');
      } else {
        console.log('Document data:', doc.data());
        return res.status(201).json(doc.data());
      }
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: 'Something went wrong' });
    });
};


exports.getScream = (req, res) => {
  let screamData = {};
  db.doc(`/screams/${req.params.screamId}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'Scream not found' });
      }
      screamData = doc.data();
      screamData['screamId'] = doc.id;
      return db
        .collection('comments')
        .orderBy('createdAt', 'desc')
        .where('screamId', '==', req.params.screamId)
        .get();
    })
    .then(data => {
      screamData['comments'] = [];
      data.forEach(doc => {
        screamData['comments'].push(doc.data());
      });
      return res.json(screamData);
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: err.code });
    });
};


exports.commentOnScream = (req, res) => {
  if(req.body.body.trim() === '') {
    return res.status(400).json({ body: 'Body must not be empty' });
  }

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    screamId: req.params.screamId,
    userHandle: req.user.handle,
    imageUrl: req.user.imageUrl
  };

  db.doc(`/screams/${req.params.screamId}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'Scream not found' });
      }
      return db.collection('comments').add(newComment)
    })
    .then(() => {
      console.log(newComment);
      return res.json(newComment);
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: 'Something went wrong' });
    });
};


exports.postOneScream = (req, res) => {
  if(req.body.body.trim() === '') {
    return res.status(400).json({ body: 'Body must not be empty' });
  }

  const newScream = {
    body: req.body.body,
    userHandle: req.user.handle,
    createdAt: new Date().toISOString()
  };

  db.collection('screams')
    .add(newScream)
    .then((doc) => {
      console.log(newScream);
      return res.json({ message: `document ${doc.id} created successfully` });
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: 'Something went wrong' });
    });
};