const { db } = require('../../utils/admin');
const { config } = require('../../utils/getconfig');
const parseFormData = require('../../utils/parseFormData');
const tagsList = require('../../config/tagList');
const { fbstorage_url } = require('../../config/externalUrls');
const imageUtils = require('../../utils/imageUtils');
const moment = require('moment');



// Get all tags
exports.getAllTags = async (req, res) => {
  let tags = await db.collection('tags').get();
  if(!tags){
    return res.status(500).json({ error: 'Something went wrong.' });
  }
  let tagsList = [];
  tags.forEach(doc => {
    tagsList.push(doc.id);
  });
  let tagsObj = {
    tags: tagsList
  };
  return res.json(tagsObj);
};


exports.addExtraUserDetails = (req, res) => {
  const extraUserDetails = req.body;
  db.collection('users')
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        doc.ref.update(extraUserDetails);
      });
      return res.json({ message: 'Extra Details Added Successfully.' })
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.addOneExtraUserDetail = (req, res) => {
  const extraUserDetails = req.body;
  db.doc(`/users/${req.params.handle}`).get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      doc.ref.update(extraUserDetails);
      return res.json({ message: 'Extra Details Added Successfully.' });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.addScreamTags = (req, res) => {
  db.collection('screams')
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        let numTags = Math.random()*(6-3)+3;
        let tagList = [];
        for(let i = 0; i < numTags; i++){
          tagList.push(tagsList[Math.floor(Math.random()*tagsList.length)]);
        };
        console.log(tagList);
        doc.ref.update({ tagList: tagList });
      });
      return res.status(500).json({ message: 'Tags Added successfully.' });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });  
};


exports.uploadImageAndDisplayScreams = (req, res) => {
  db.collection('screams').get()
    .then(async (snapshot) => {
      let screamsList = [];
      
      let parsedFormData = await parseFormData(req.headers, req.rawBody);
      console.log(parsedFormData);

      if(parsedFormData.error){
        console.log('Wrong file type submitted');
        return res.status(400).json({ error: parsedFormData.error });
      }

      screamsList.push(parsedFormData);
      snapshot.forEach(doc => {
        screamsList.push(doc.id);
      });
      return res.json(screamsList);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.setContentImageForAllScreams = async (req, res) => {
  let bucketName = 'profileImages';
  let uploadStatus;
  try {
    uploadStatus = await imageUtils.changeProfileImage(
      req.headers, 
      req.rawBody, 
      req.user.handle,
      bucketName
    );
  } catch(err) {
    DEBUG && console.log(`${err}`.red);
    return res.status(404).json({ error: 'User not found' });
  }
  DEBUG && console.log(`Image Uploaded to ${bucketName}`.green);
  return res.json(uploadStatus.message);
};


exports.createConnectionsFromFollowers = async (req, res) => {
  let followers = await db.collection('followers').get();
  if(!followers){
    throw new Error('Followers not found.');
  }
  let followerList = [];
  let followingList = [];
  followers.forEach(doc => {
    followerList.push(db.doc(`/users/${doc.data().follower}`));
    followingList.push(db.doc(`/users/${doc.data().following}`));
  });
  const followerDetails = await db.getAll(...followerList);
  const followingDetails = await db.getAll(...followingList);
  let followerDetailsList = [];
  let followingDetailsList = [];
  followerDetails.forEach(doc => {
    followerDetailsList.push({
      id: doc.id,
      avatar: doc.data().imageUrl,
      name: doc.data().fullName
    });
  });
  followingDetails.forEach(doc => {
    followingDetailsList.push({
      id: doc.id,
      avatar: doc.data().imageUrl,
      name: doc.data().fullName
    });
  });
  followerDetailsList.map((item, i, array) => {
    db.collection('connections').add({
      commonConnections: 10,
      sender: item,
      receiver: followingDetailsList[i],
      connected: false,
      status: 'Pending',
      createdAt: moment().format(),
      updatedAt: moment().format()
    }).then(doc => {
      console.log(`${doc.id} Written`);
      if(i === array.length - 1){
        return res.json('All Connections Created.');
      }
    }).catch(err => {
      console.log(err);
    });
  });
};


exports.addFullNameToScreams = async (req, res) => {
  let screams;
  try {
    screams = await db.collection('comments').get();
  } catch(err) {
    return res.status(500).json({ error: 'Cannot Fetch Screams.' });
  }
  await Promise.all(screams.map(async (doc) => {
    let userDoc = await db.doc(`/users/${doc.data().userHandle}`).get();
    doc.ref.update({ userName: userDoc.data().fullName });
  }));

  return res.json({ message: 'Field added to all screams.' });
};