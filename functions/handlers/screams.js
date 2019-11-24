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