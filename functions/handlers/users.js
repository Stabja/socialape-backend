const { admin, db } = require('../util/admin');

const config = require('../util/config');

const firebase = require('firebase');
firebase.initializeApp(config);

const { validateSignupData, validateLoginData, reduceUserDetails } = require('../util/validators');

// User Registration
exports.signup = (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

  const { errors, valid } = validateSignupData(newUser);

  if(!valid) return res.status(400).json(errors);

  const noImg = 'no-img.png';

  // TODO: validate data (STORE THE NEW USER IN A COLLECTION)
  let token, userId;
  db.doc(`/users/${newUser.handle}`).get()
    .then(doc => {
      if(doc.exists){
        return res.status(400).json({ handle: 'this user handle is already taken' });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((idToken) => {
      token = idToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        imageUrl: `https://firebasestorage.googleapis.com/v0/b/${
          config.storageBucket
        }/o/${noImg}?alt=media`,
        userId
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json(
        { 
          userId,
          token
        }
      );
    })
    .catch(err => {
      console.error(err);
      if(err.code === 'auth/email-already-in-use'){
        return res.status(400).json({ email: 'Email is already in use' });
      } else {
        return res.status(500).json({ general: 'Something went wrong, please try again' });
      }
    });
};

// User Login
exports.login = (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password
  };

  const { errors, valid } = validateLoginData(user);

  if(!valid) return res.status(400).json(errors);

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then(data => {
      return data.user.getIdToken();
    })
    .then(token => {
      return res.json({token});
    })
    .catch(err => {
      console.error(err);
      return res
        .status(403)
        .json({ general: 'Wrong credentials, please try again' });
    });
};

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

exports.getUserDetails = (req, res) => {
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
      return res.json(userData);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

/* exports.markNotificationsReadOld = (req, res) => {
  const docRef = db.doc(`/notifications/${req.params.notificationId}`);
  db.doc(`/notifications/${req.params.notificationId}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'Notification not found.' });
      }
      //Check whether the user logged is the one who received the notification
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
}; */

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

exports.markAllNotificationsUnread = (req, res) => {
  db.collection('notifications')
    .get()
    .then(data => {
      data.forEach(doc => {
        doc.ref.update({ read : false });
      });
      return res.json({ message: 'All Notifications marked unread' });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.followUser = (req, res) => {
  const newFollower = {
    follower: req.user.handle,
    following: req.params.handle,
    followBack: false
  };

  db.doc(`/users/${req.user.handle}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'User not found.' });
      }
      //code to be added here
      return db.collection('followers').add(newFollower);
    })
    .then(() => {
      console.log(newFollower);
      return res.json(newFollower);
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: 'Something went wrong.' });
    });
};

exports.unfollowUser = (req, res) => {
  const document = db.doc(`/followers/${req.params.followId}`);
  db.doc(`/users/${req.user.handle}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'User not found.' });
      }
      // Code to be added here
      return db.doc(`/followers/${req.params.followId}`).get();
    })
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'Follow document not found.' });
      }
      return document.delete();
    })
    .then(() => {
      res.json({ error: 'User unfollowed Successfully' });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.followBack = (req, res) => {
  const document = db.doc(`/followers/${req.params.followId}`);
  db.doc(`/followers/${req.params.followId}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'Follow document not found.' });
      }
      return document.get();
    })
    .then(doc => {
      if(doc.exists){
        //let followBackVar = doc.data().followBack;
        document.update({ followBack: true });
        return res.status(404).json({ error: 'User followed Back' })
      }
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.revokeFollowBack = (req, res) => {
  const document = db.doc(`/followers/${req.params.followId}`);
  db.doc(`/followers/${req.params.followId}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'Follow document not found.' });
      }
      return document.get();
    })
    .then(doc => {
      if(doc.exists){
        //let followBackVar = doc.data().followBack;
        document.update({ followBack: false });
        return res.status(404).json({ error: 'Follow back revoked' });
      }
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};