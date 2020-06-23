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
const { DEBUG } = require('../../config/constants');



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


exports.getOneScream = async (req, res) => {
  let screamDoc;
  try {
    screamDoc = await db.doc(`/scream/${req.params.screamId}`).get();
  } catch(err) {
    DEBUG && console.log(`${err}`.red);
    return res.status(500).json({ error: 'Something went wrong' });
  }
  if(!screamDoc.exists) {
    DEBUG && console.log('Document data:', doc.data());
    return res.status(404).json({ error: 'Document not found!'});
  }
  return res.status(201).json(screamDoc.data());
};


exports.commentOnScream = async (req, res) => {
  if(req.body.body.trim() === '') {
    return res.status(400).json({ comment: 'Must not be empty' });
  }

  let screamDoc = await db.doc(`/screams/${req.params.screamId}`).get();
  if(!screamDoc.exists){
    return res.status(404).json({ error: 'Scream not found' });
  }

  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    screamId: req.params.screamId,
    userHandle: req.user.handle,
    imageUrl: req.user.imageUrl
  };

  try {
    await db.collection('comments').add(newComment);
  } catch(err) {
    DEBUG && console.log(`${err}`.red);
    return res.status(500).json({ error: 'Something went wrong' });
  }

  await screamDoc.ref.update({ commentCount: doc.data().commentCount + 1 });
  DEBUG && console.log(colors.green(newComment));
  return res.json(newComment);
};


// Tricky function. Involves parsing FormData using Busboy
exports.postOneScream = async (req, res) => {
  // First upload the image and get the path, then post the Scream object
  let parsedFormData;
  try {
    parsedFormData = await parseFormData(req.headers, req.rawBody);
  } catch(err) {
    return res.status(400).json(err);
  }
  DEBUG && console.log(colors.cyan({ parsedFormData }));

  if(parsedFormData.body.trim() === '') {
    return res.status(400).json({ body: 'Body must not be empty' });
  }

  // Convert parsedFormData.tagList to List
  const tagsList = parsedFormData.tagList.split(',');

  const newScream = {
    body: parsedFormData.body,
    userHandle: req.user.handle,
    userName: req.user.fullName,
    userImage: req.user.imageUrl,
    contentImage: parsedFormData.contentImage,
    tagList: tagsList,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0
  };

  // Add the new tags in 'tags' collection
  let tags = await db.collection('tags').get();
  if(!tags){
    return res.status(500).json({ error: 'Something went wrong' });
  }
  let fetchedTagList = [];
  tags.forEach(doc => {
    fetchedTagList.push(doc.id);
  });
  tagsList.forEach(tag => {
    if(!fetchedTagList.includes(tag)){
      db.collection('tags').doc(tag).set({});
    }
  });

  // Add the new Scream in 'screams' collection 
  let newScreamDoc = await db.collection('screams').add(newScream);
  if(!newScreamDoc){
    return res.status(500).json({ error: 'Something went wrong' });
  }
  DEBUG && console.log(colors.green(newScreamDoc));
  const resScream = newScreamDoc;
  resScream.screamId = newScreamDoc.id;

  return res.json(resScream);
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
    DEBUG && console.log('Delete doesn\'t return Document');
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


exports.editScream = async (req, res) => {
  let doc = await db.doc(`/screams/${req.params.screamId}`).get();
  console.log(colors.blue(req.body));
  if(!doc.exists){
    return res.status(404).json({ error: 'Scream Not Found.'});
  }
  await doc.ref.update({ body: req.body.text });
  return res.json(req.body);
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
