const { admin, db } = require('../util/admin');
const { reduceUserDetails } = require('../util/validators');

const config = require('../util/getconfig').config;


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
      return db.collection('followers')
        .where('follower', '==', req.user.handle)
        .get();
    })
    .then((data) => {
      userData.followers = [];
      data.forEach(doc => {
        let follower = doc.data();
        follower.followId = doc.id;
        userData.followers.push(follower);
      });
      return db.collection('followers')
        .where('following', '==', req.user.handle)
        .get();
    })
    .then((data) => {
      data.forEach(doc => {
        userData.followers.push(doc.data());
      });
      return db.collection('notifications').where('recipient', '==', req.user.handle)
        .orderBy('createdAt', 'desc').limit(10).get();
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
      const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
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


exports.getUserDetailsWithAuth = (req, res) => {
  let userData = {};
  db.doc(`/users/${req.params.handle}`).get()
    .then(doc => {
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
    .then(data => {
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
      if(req.user){
        return db
          .collection('followers')
          .where('follower', '==', req.user.handle)
          .where('following', '==', req.params.handle)
          .limit(1)
          .get();
      } else {
        return res.json(userData);
      }
    })
    .then((data) => {
      if(data.empty){
        userData.follower = {
          followId: null,
          followedId: null,
          followedBack: false
        };
        return db
          .collection('followers')
          .where('follower', '==', req.params.handle)
          .where('following', '==', req.user.handle)
          .limit(1)
          .get()
      } else {
        userData.follower = {
          followId: data.docs[0].id,
          followedId: null,
          followedBack: false
        };
        return res.json(userData);
      }
    })
    .then((data) => {
      if(data.empty){
        userData.follower = {
          followId: null,
          followedId: null,
          followedBack: false
        };
        return res.json(userData);
      }
      return db.doc(`/followers/${data.docs[0].id}`).get();
    })
    .then((doc) => {
      userData.follower = {
        followId: null,
        followedId: doc.id,
        followedBack: doc.data().followBack
      }
      return res.json(userData);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
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
      return res.status(200).json({ message: 'Notification marked read.' })
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
