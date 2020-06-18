const { admin, db } = require('../../util/admin');
const { reduceUserDetails } = require('../../util/validators');
const config = require('../../util/getconfig').config;
const { fbstorage_url } = require('../../config/externalUrls');
const usersService = require('./usersService');


// Add user details
exports.addUserDetails = (req, res) => {
  let userDetails = reduceUserDetails(req.body);

  db.doc(`/users/${req.user.handle}`)
    .update(userDetails)
    .then(() => {
      return res.json({ message: 'Details added successfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code })
    });
};

// Get own user details
exports.getAuthenticatedUser = (req, res) => {
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
      console.error(err);
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
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.getFollowingListOfUser = (req, res) => {
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
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};


// Get profile details of an User
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
      console.log(err);
      res.status(500).json({ error: err.code });
    });
};

// Upload a profile image for user
exports.uploadImage = (req, res) => {
  const BusBoy = require('busboy');
  const path = require('path');
  const os = require('os');
  const fs = require('fs');

  const busboy = new BusBoy({ headers: req.headers });

  let imageFileName;
  let imageToBeUploaded = {};

  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    console.log(fieldname, file, filename, encoding, mimetype);
    if(mimetype !== 'image/jpeg' && mimetype !== 'image/png'){
      return res.status(400).json({ error: 'Wrong file type submitted' });
    }
    // my.image.png => ['my', 'image', 'png']
    // const arr = filename.split('.');
    // const imageExtension = arr[arr.length - 1];
    const imageExtension = filename.split('.')[filename.split('.').length - 1];
    // 32756238461724837.png
    imageFileName = `${Math.round(Math.random() * 100000000000)}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });

  busboy.on('finish', () => {
    admin
      .storage()
      .bucket()
      .upload(imageToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: imageToBeUploaded.mimetype
          }
        }
      })
    .then(() => {
      const imageUrl = `${fbstorage_url}/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
      return db.doc(`/users/${req.user.handle}`).update({ imageUrl });
    })
    .then(() => {
      return res.json({ message: 'Image Uploaded Successfully' });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
  });
  busboy.end(req.rawBody);
};


exports.getUserDetailsWithAuth = async (req, res) => {
  let user = await db.doc(`/users/${req.params.handle}`).get();
  if(!user.exists) {
    return res.status(404).json({ error: 'User not found' });
  }
  let userData = {};

  userData.user = user.data();
  let screamsList = usersService.getScreamsCreatedByUser(req.params.handle);
  let likedScreams = usersService.getScreamsLikedByUser(req.params.handle);
  let connectionsList = usersService.getUserConnections(req.params.handle);
  let isUserFollower = usersService.findIfUserIsSender(req.user.handle, req.params.handle);
  let isUserFollowing = usersService.findIfUserIsReceiver(req.user.handle, req.params.handle);

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
      return res.json(userData);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code })
    });
};


exports.markOneNotificationRead = (req, res) => {
  const docRef = db.doc(`/notifications/${req.params.notificationId}`);
  db.doc(`/notifications/${req.params.notificationId}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'Notification not found.' });
      }
      //Check whether the user logged in is the one who received the notification
      if(req.user.handle !== doc.data().recipient){
        return res.json({ message: 'You are not authorized to read this notification.' });
      }
      docRef.update({ read: true });
      return res.status(200).json({ message: 'Notification marked read.' });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json(err.code);
    });
};


exports.markAllNotificationsRead = (req, res) => {
  let batch = db.batch();
  req.body.forEach((notificationId) => {
    const notification = db.doc(`/notifications/${notificationId}`);
    batch.update(notification, { read: true });
  });
  batch
    .commit()
    .then(() => {
      return res.json({ message: 'Notifications marked read' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
