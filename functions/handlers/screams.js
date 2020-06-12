const { db, admin } = require('../util/admin');
const parseFormData = require('../util/parseFormData');
const {
  validateCursor,
  paginateQuery,
  initializePagination
} = require('../util/paginationUtils');
const {
  screams_url,
  comments_url
} = require('../config/externalUrls');


exports.getAllScreams = (req, res) => {
  db.collection('screams')
    .orderBy('createdAt', 'desc')
    .get()
    .then(snapshot => {
      let screams = [];
      var map = new Map();
      snapshot.forEach(doc => {
        let scream = doc.data();
        scream.screamId = doc.id;
        screams.push(scream);
        map[doc.id] = doc.data();
      });
      return res.json(screams);
    })
    .catch((err) => {
      console.log(err);
    });
};


exports.getPaginatedScreams = async (req, res) => {
  let pageSize = parseInt(req.query.page_size);
  let cursor = req.query.cursor;
  let baseUrl = screams_url;
  
  if(!pageSize){
    pageSize = 6;
  }

  initializePagination('screams', 'createdAt', cursor, baseUrl, pageSize, res);
};


exports.getCommentsByScreamId = async (req, res) => {
  let pageSize = parseInt(req.query.page_size);
  let cursor = req.query.cursor;
  let screamId = req.params.screamId;
  let baseUrl = comments_url + `/${screamId}/comments`;

  if(!pageSize){
    return res.status(400).json({ error: 'page_size should not be null' });
  }

  let firebaseQuery = null;
  if(cursor) {
    let startingDoc = await validateCursor(cursor, 'comments');
    if(cursor) {
      firebaseQuery = db.collection('comments')
        .where('screamId', '==', screamId)
        .orderBy('createdAt', 'desc')
        .startAfter(startingDoc)
        .limit(pageSize);
    } else {
      return res.status(400).json({ error: 'Invalid Cursor' });
    }
  } else {
    firebaseQuery = db.collection('comments')
      .where('screamId', '==', screamId)
      .orderBy('createdAt', 'desc')
      .limit(pageSize);
  }

  paginateQuery(firebaseQuery, baseUrl, pageSize, res);
};


exports.getScreamById = (req, res) => {
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


exports.getScreamByTag = (req, res) => {
  const screamsRef = db.collection('screams');
  console.log(req.params.tag);
  screamsRef.where('tagList', 'array-contains', req.params.tag)
    .get()
    .then(snapshot => {
      let screams = [];
      snapshot.forEach(doc => {
        let scream = doc.data();
        scream.screamId = doc.id;
        screams.push(scream);
      });
      console.log(screams);
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


exports.commentOnScream = (req, res) => {
  if(req.body.body.trim() === '') {
    return res.status(400).json({ comment: 'Must not be empty' });
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
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection('comments').add(newComment);
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


// Tricy function. Involves parsing DormData using Busboy
exports.postOneScream = async (req, res) => {

  // First upload the image and get the path, then post the Scream object
  const parsedFormData = await parseFormData(
    req.headers,
    req.rawBody
  );
  console.log(parsedFormData);

  if(parsedFormData.error){
    console.log('Wrong file type submitted');
    return res.status(400).json({ error: parsedFormData.error });
  }

  if(parsedFormData.body.trim() === '') {
    return res.status(400).json({ body: 'Body must not be empty' });
  }

  // Convert parsedFormData.tagList to List
  const tagsList = parsedFormData.tagList.split(',');

  const newScream = {
    body: parsedFormData.body,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    contentImage: parsedFormData.contentImage,
    tagList: tagsList,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0
  };

  // Add the new tags in 'tags' collection
  db.collection('tags').get()
    .then((snapshot) => {
      let fetchedTagList = [];
      snapshot.forEach(doc => {
        fetchedTagList.push(doc.id);
      })
      tagsList.forEach(tag => {
        if(!fetchedTagList.includes(tag)){
          db.collection('tags').doc(tag).set({});
        }
      });
    })
    .catch((err) => {
      console.error(err);
      console.log('Could not add Tags.');
    });

  // Add the new Scream in 'screams' collection 
  db.collection('screams')
    .add(newScream)
    .then((doc) => {
      console.log(newScream);
      const resScream = newScream;
      resScream.screamId = doc.id;
      return res.json(resScream);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: 'Something went wrong' });
    });
  
};


//Like a scream
exports.likeScream = (req, res) => {
  const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId).limit(1);

  const screamDocument = db.doc(`/screams/${req.params.screamId}`);

  let screamData;

  screamDocument.get()
    .then(doc => {
      if(doc.exists){
        screamData = doc.data();
        screamData.screamId = doc.id;
        return likeDocument.get()
      } else {
        return res.status(404).json({ error: 'Scream not found' });
      }
    })
    .then(data => {
      if(data.empty){
        return db.collection('likes').add({
          screamId: req.params.screamId,
          userHandle: req.user.handle
        })
        .then(() => {
          screamData.likeCount++;
          return screamDocument.update({ likeCount: screamData.likeCount });
        })
        .then(() => {
          return res.json(screamData);
        })
      } else {
        return res.status(400).json({ error: 'Scream already liked' });
      }
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

//Unlike Scream
exports.unlikeScream = (req, res) => {
  const likeDocument = db.collection('likes').where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId).limit(1);

  const screamDocument = db.doc(`/screams/${req.params.screamId}`);

  let screamData;

  screamDocument.get()
    .then(doc => {
      if(doc.exists){
        screamData = doc.data();
        screamData.screamId = doc.id;
        return likeDocument.get()
      } else {
        return res.status(404).json({ error: 'Scream not found' });
      }
    })
    .then(data => {
      if(data.empty){
        return res.status(400).json({ error: 'Scream not liked' });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            screamData.likeCount--;
            return screamDocument.update({ likeCount: screamData.likeCount });
          })
          .then(() => {
            res.json(screamData);
          })
      }
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

// Delete a scream
exports.deleteScream = (req, res) => {
  const document = db.doc(`/screams/${req.params.screamId}`);
  document.get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'Scream not found' });
      }
      if(doc.data().userHandle !== req.user.handle){
        return res.status(403).json({ error: 'Unauthorized' });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      return res.json({ message: 'Scream deleted succesfully' });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
