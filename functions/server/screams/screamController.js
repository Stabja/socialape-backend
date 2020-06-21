const { db } = require('../../utils/admin');
const parseFormData = require('../../utils/parseFormData');
const {
  validateCursor,
  paginateQuery,
  initializePagination
} = require('../../utils/paginationUtils');
const {
  screams_url,
  comments_url
} = require('../../config/externalUrls');
const colors = require('colors');



exports.getAllScreams = async (req, res) => {
  let screams = await db.collection('screams')
    .orderBy('createdAt', 'desc')
    .get();
  if(!screams){
    return res.status(500).json({ error: 'Screams not found' });
  }
  let screamsList = [];
  var map = new Map();
  screams.forEach(doc => {
    let scream = doc.data();
    scream.id = doc.id;
    screamsList.push(scream);
    map[doc.id] = doc.data();
  });
  return res.json(screamsList);
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


exports.getScreamById = async (req, res) => {
  let screamData = {};
  let doc = await db.doc(`/screams/${req.params.screamId}`).get();
  if(!doc.exists){
    return res.status(404).json({ error: 'Scream not found' });
  }
  screamData = doc.data();
  screamData.id = doc.id;
  let comments = await db.collection('comments')
    .orderBy('createdAt', 'desc')
    .where('screamId', '==', req.params.screamId)
    .get();
  if(!comments){
    return res.status(500).json({ error: err.code });
  }
  screamData.comments = [];
  comments.forEach(doc => {
    screamData.comments.push(doc.data());
  });
  return res.json(screamData);
};


exports.getScreamByTag = async (req, res) => {
  let screams = await db.collection('screams')
    .where('tagList', 'array-contains', req.params.tag)
    .get();
  if(!screams){
    return res.status(404).json({ error: 'Scream not found' });
  }
  let screamsList = [];
  screams.forEach(doc => {
    let scream = doc.data();
    scream.screamId = doc.id;
    screamsList.push(scream);
  });
  return res.json(screamsList);
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


// Tricky function. Involves parsing FormData using Busboy
exports.postOneScream = async (req, res) => {
  // First upload the image and get the path, then post the Scream object
  const parsedFormData = await parseFormData(
    req.headers,
    req.rawBody
  );
  console.log(colors.cyan({ parsedFormData }));

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
      console.log(colors.green(newScream));
      const resScream = newScream;
      resScream.screamId = doc.id;
      return res.json(resScream);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: 'Something went wrong' });
    });
};


exports.likeScream = async (req, res) => {
  const likeDocument = db.collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId)
    .limit(1);

  let screamData = {};
  let response = {};
  const screamDocument = db.doc(`/screams/${req.params.screamId}`);

  let screamDoc = await screamDocument.get();
  if(!screamDoc.exists) {
    return res.status(404).json({ error: 'Scream not found' });
  }
  screamData = screamDoc.data();
  screamData.screamId = screamDoc.id;

  let likeDoc = await likeDocument.get();
  if(!likeDoc.empty) {         // If Like already exists, don't add a new like.
    return res.status(400).json({ error: 'Scream already liked' });
  };

  let newLike = await db.collection('likes').add({
    screamId: req.params.screamId,
    userHandle: req.user.handle
  });
  if(!newLike){
    return res.status(500).json({ error: err.code });
  }
  screamData.likeCount++;
  await screamDocument.update({ likeCount: screamData.likeCount });
  response.likeId = newLike.id;
  response.screamId = req.params.screamId;
  response.userHandle = req.user.handle;
  response.likeCount = screamData.likeCount;
  return res.json(response);
};


exports.unlikeScream = async (req, res) => {
  const likeDocument = db.collection('likes')
    .where('userHandle', '==', req.user.handle)
    .where('screamId', '==', req.params.screamId)
    .limit(1);
  
  let screamData = {};
  let response = {};
  const screamDocument = db.doc(`/screams/${req.params.screamId}`);

  let screamDoc = await screamDocument.get();
  if(!screamDoc.exists) {
    return res.status(404).json({ error: 'Scream not found' });
  }
  screamData = screamDoc.data()
  screamData.screamId = screamDoc.id;

  let likeDoc = await likeDocument.get();
  if(likeDoc.empty) {
    return res.status(400).json({ error: 'Scream not liked' });
  };
 
  let deleteLike = await db.doc(`/likes/${likeDoc.docs[0].id}`).delete();
  if(!deleteLike) {
    console.log('Delete doesn\'t return Document');
    //return res.status(500).json({ error: err.code });
  }
  screamData.likeCount--;
  await screamDocument.update({ likeCount: screamData.likeCount });
  response.likeId = likeDoc.docs[0].id;
  response.screamId = req.params.screamId;
  response.userHandle = req.user.handle;
  response.likeCount = screamData.likeCount;
  return res.json(response);
};


exports.deleteScream = async (req, res) => {
  const document = db.doc(`/screams/${req.params.screamId}`);
  let doc = await document.get();
  if(!doc.exists){
    return res.status(404).json({ error: 'Scream not found' });
  }
  if(doc.data().userHandle !== req.user.handle) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  await document.delete();
  return res.json({ message: 'Scream deleted succesfully' });
};
