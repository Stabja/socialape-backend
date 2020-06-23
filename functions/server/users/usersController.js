const { db } = require('../../utils/admin');
const { reduceUserDetails } = require('../../utils/validators');
const usersService = require('./usersService');
const imageUtils = require('../../utils/imageUtils');
const { DEBUG } = require('../../config/constants');
const { red } = require('colors');


// Add user details
exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);
  db.doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() => {
      return res.json({ message: 'Details added successfully' });
    })
    .catch((err) => {
      DEBUG && console.error(`${err}`.red);
      return res.status(500).json({ error: err.code })
    });
};


exports.getAuthenticatedUser = async (req, res) => {
  let user = await db.doc(`/users/${req.user.handle}`).get();
  if(!user.exists) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  let userData = {};
  userData.credentials = user.data();
  
  let userLikes = usersService.getUserLikes(req.user.handle);
  let userConnections = usersService.getUserConnections(req.user.handle);
  let userNotifications = usersService.getUserNotifications(req.user.handle);
  
  console.time('authUser'.cyan);
  Promise.all([
    userLikes,
    userConnections,
    userNotifications
  ]).then(promises => {
      userData.likes = promises[0];
      userData.connections = promises[1];
      userData.notifications = promises[2];
      console.timeEnd('authUser'.cyan);
      return res.json(userData);
    })
    .catch(err => {
      DEBUG && console.error(`${err}`,red);
      return res.status(500).json({ error: err.code })
    });
};


exports.getAuthenticatedUserOld = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.user.handle}`).get()
    .then((doc) => {
      if (doc.exists) {
        userData.credentials = doc.data();
        return db
          .collection('likes')
          .where('userHandle', '==', req.user.handle)
          .get();
      }
    })
    .then((data) => {
      userData.likes = [];
      data.forEach(doc => {
        userData.likes.push(doc.data());
      });
      return db.collection('connections')
        .where('sender.id', '==', req.user.handle)
        .get();
    })
    .then((data) => {
      userData.followers = [];
      data.forEach(doc => {
        let follower = doc.data();
        follower.followId = doc.id;
        userData.followers.push(follower);
      });
      return db.collection('connections')
        .where('receiver.id', '==', req.user.handle)
        .get();
    })
    .then((data) => {
      data.forEach(doc => {
        let follower = doc.data();
        follower.followId = doc.id;
        userData.followers.push(follower);
      });
      return db.collection('notifications')
        .where('recipient', '==', req.user.handle)
        .orderBy('createdAt', 'desc')
        .limit(10)
        .get();
    })
    .then(data => {
      userData.notifications = [];
      data.forEach(doc => {
        let notification = {};
        notification = doc.data();
        notification.notificationId = doc.id;
        userData.notifications.push(notification);
      });
      return res.json(userData);
    })
    .catch((err) => {
      DEBUG && console.error(`${err}`.red);
      return res.status(500).json({ error: err.code });
    });
};


exports.getScreamsFollowedByUser = (req, res) => {
  // First fetch all the followers of the user, then fetch screams of the followers
  db.collection('followers')
    .where('follower', '==', req.user.handle)
    .get()
    .then((data) => {
      let followList = [];
      data.forEach(doc => {
        followList.push(doc.data().following);
      });
      return db.collection('screams')
        .where('userHandle', 'in', followList)
        .orderBy('createdAt', 'desc')
        .get()
    })
    .then((data) => {
      let usersFeed = [];
      data.forEach(doc => {
        let scream = doc.data();
        scream.screamId = doc.id;
        usersFeed.push(scream);
      });
      return res.json(usersFeed);
    })
    .catch((err) => {
      DEBUG && console.error(`${err}`.red);
      return res.status(500).json({ error: err.code });
    });
};


exports.getAllConnectionsOfUser = async (req, res) => {
  try {
    let user = await db.doc(`/users/${req.params.handle}`).get();
  } catch(err) {
    DEBUG && console.error(`${err}`.red);
    return res.status(404).json({ error: 'User not found' });
  }

  let connections = usersService.getUserConnections(req.params.handle);
  connections.then(data => {
    return res.json(data);
  }).catch(err => {
    DEBUG && console.log(`${err}`.red);
    return res.status(500).json({ error: err.code });
  });
};


exports.getAllFollowersOfUser = async (req, res) => {
  db.collection('followers')
    .where('followed', '==', req.params.handle)
    .get()
    .then((data) => {
      let followList = [];
      data.forEach(doc => {
        followList.push(doc.data().following);
      });
      return res.json(followList);
    })
    .catch((err) => {
      DEBUG && console.error(`${err}`.red);
      return res.status(500).json({ error: err.code });
    });
};


exports.getFollowingListOfUser = async (req, res) => {
  db.collection('followers')
    .where('follower', '==', req.params.handle)
    .get()
    .then((data) => {
      let followList = [];
      data.forEach(doc => {
        followList.push(doc.data().following);
      });
      return res.json(followList);
    })
    .catch((err) => {
      DEBUG && console.error(`${err}`.red);
      return res.status(500).json({ error: err.code });
    });
};


exports.getProfileDetailsOfanUser = (req, res) => {
  let profileDetails = {};
  db.doc(`/users/${req.params.handle}`).get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'User not found' });
      }
      profileDetails = doc.data();
      return db
        .collection('screams')
        .where('userHandle', '==', req.params.handle)
        .get();
    })
    .then(data => {
      profileDetails.screams = [];
      data.forEach(doc => {
        let scream = {};
        scream.comments = [];
        scream = doc.data();
        scream.id = doc.id;
        profileDetails.screams.push(scream);
      });
      return res.json(profileDetails);
    })
    .catch(err => {
      DEBUG && console.log(`${err}`.red);
      res.status(500).json({ error: err.code });
    });
};

// Upload a profile image for user
exports.uploadImage = async (req, res) => {
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


exports.getUserDetailsWithAuth = async (req, res) => {
  let user;
  try {
    user = await db.doc(`/users/${req.params.handle}`).get();
  } catch(err) {
    DEBUG && console.log(`${err}`.red);
    return res.status(404).json({ error: 'User not found' });
  }

  let userData = {};

  userData.user = user.data();
  
  let screamsList = usersService.getScreamsCreatedByUser(req.params.handle);
  let likedScreams = usersService.getScreamsLikedByUser(req.params.handle);
  let connectionsList = usersService.getUserConnections(req.params.handle);
  let isUserFollower = usersService.findIfUserIsSender(req.user.handle, req.params.handle);
  let isUserFollowing = usersService.findIfUserIsReceiver(req.user.handle, req.params.handle);
  
  DEBUG && console.time('FetchProfile'.blue);
  Promise.all([
    screamsList,
    likedScreams,
    connectionsList,
    isUserFollower,
    isUserFollowing
  ]).then(promises => {
      userData.screams = promises[0];
      userData.likedScreams = promises[1];
      userData.connections = promises[2];
      if(promises[3].docs.length > 0){
        userData.connection = {
          senderId: promises[3].docs[0].id,
          receiverId: null,
          connected: promises[3].docs[0].data().connected,
          status: promises[3].docs[0].data().status
        };
      } else if (promises[4].docs.length > 0){
        userData.connection = {
          senderId: null,
          receiverId: promises[4].docs[0].id,
          connected: promises[4].docs[0].data().connected,
          status: promises[4].docs[0].data().status
        };
      } else {
        userData.connection = null;
      }
      DEBUG && console.timeEnd('FetchProfile'.blue);
      return res.json(userData);
    })
    .catch(err => {
      DEBUG && console.error(err);
      return res.status(500).json({ error: err.code })
    });
};
