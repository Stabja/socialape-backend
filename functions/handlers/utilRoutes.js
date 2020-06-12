const { db, admin } = require('../util/admin');
const config = require('../util/getconfig').config;
const parseFormData = require('../util/parseFormData');
const tagsList = require('../config/tagList');
const { fbstorage_url } = require('../config/externalUrls');


// Get all tags
exports.getAllTags = (req, res) => {
  db.collection('tags')
    .get()
    .then(snapshot => {
      let tagsList = [];
      snapshot.forEach(doc => {
        tagsList.push(doc.id);
      });
      let tags = {
        tags: tagsList
      };
      return res.status(201).json(tags);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: 'Something went wrong.' });
    });
};

// Get all notifications
exports.getAllNotifications = (req, res) => {
  db.collection('notifications')
    .get()
    .then(snapshot => {
      let notifications = [];
      snapshot.forEach(doc => {
        let notification = {};
        notification = doc.data();
        notification.nId = doc.id;
        notifications.push(notification); 
      });
      return res.status(201).json(notifications);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: 'Something went wrong.' });
    });
};

exports.markAllNotificationsUnread = (req, res) => {
  db.collection('notifications')
    .get()
    .then(data => {
      data.forEach(doc => {
        doc.ref.update({ read : false });
      });
      return res.json({ message: 'All Notifications marked unread.' });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
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


exports.setContentImageForAllScreams = (req, res) => {
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
    const imageExtension = filename.split('.')[filename.split('.').length - 1];
    imageFileName = `${Math.round(Math.random() * 100000000000)}.${imageExtension}`;
    const filepath = path.join(os.tmpdir(), imageFileName);
    imageToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });

  busboy.on('finish', () => {
    let imageUrl = null;
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
      imageUrl = `${fbstorage_url}/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
      console.log(imageUrl);
      return db.collection('screams').get();
    })
    .then((snapshot) => {
      snapshot.forEach(doc => {
        doc.ref.update({ contentImage: imageUrl });
      })
      return res.json({ message: 'contentImage Updated Successfully.' });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
  });

  busboy.end(req.rawBody);
};

