const { db, admin } = require('../util/admin');
const axios = require('axios');
const querystring = require('querystring');
const qs = require('qs');
const request = require('request');
const config = require('../util/getconfig').config;
const parseFormData = require('../util/parseFormData');


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
  const tagsList = [
    "animation",
    "butt",
    "caramel",
    "cars",
    "clean",
    "coffee",
    "computerScience",
    "cookies",
    "cryptocurrency",
    "datascience",
    "dragons",
    "esports",
    "flowers",
    "gaming",
    "happiness",
    "japan",
    "money",
    "porsche",
    "pubg",
    "singapore",
    "sugar",
    "sushi",
    "test",
    "tourism",
    "training"
  ];
  
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


exports.getClientTokenWithAxios = (req, resp) => {
  const url = 'https://accounts.spotify.com/api/token';
  const clientIdSecret = 'MjRkYThmOTk0ZGJjNDIzZjgwODE4ODc1NzhjZjI5Yzc6MDI2YTg5YWNjNDZiNGQxMjg3ZjVlYjc3YjdjYmQ3MDI=';
  const urlData = { 'grant_type': 'client_credentials' };
  const options = {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + clientIdSecret
    },
    data: qs.stringify(urlData),
    url
  };
  axios(options)
    .then(res => {
      console.log(res.data);
      return resp.json(res.data);
    })
    .catch(err => {
      console.log(err.data);
      return resp.status(500).json({ error: err.message });
    });
};

exports.getJbTracksWithAxios = (req, resp) => {
  const url = 'https://api.spotify.com/v1/artists/1uNFoZAHBGtllmzznpCI3s/albums';
  const accessToken = 'BQDHJPA5-DNnvLbTsxvpuQtzbEo02lOoqDOMet9Mxfkkrfg2m0C7EQ9qLH0WX5PC-JuB10hCLAdIcxfMRvs';
  const options = {
    method: 'GET',
    params: {
      limit: 50,
      market: 'US'
    },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    url
  };
  axios(options)
    .then(res => {
      return resp.json(res.data.items);
    })
    .catch(err => {
      console.log(err.data);
      return resp.status(500).json({ error: err.data });
    });
};


exports.getClientToken = (req, res) => {
  const clientIdSecret = 'MjRkYThmOTk0ZGJjNDIzZjgwODE4ODc1NzhjZjI5Yzc6MDI2YTg5YWNjNDZiNGQxMjg3ZjVlYjc3YjdjYmQ3MDI=';
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    form: {
      grant_type: 'client_credentials'
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + clientIdSecret
    },
    json: true
  };
  request.post(authOptions, (error, response, body) => {
    if(!error && response.statusCode === 200) {
      return res.json(body);
    } else {
      return res.status(response.statusCode).json(body);
    }
  });
};


exports.getJbTracks = (req, res) => {
  const accessToken = req.query.token;
  const limit = req.query.limit || '10';
  const market = req.query.market || 'US';
  var options = {
    url: 'https://api.spotify.com/v1/artists/1uNFoZAHBGtllmzznpCI3s/albums?' + 
    querystring.stringify({
      limit,
      market
    }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    json: true
  };
  request.get(options, (error, response, body) => {
    if(!error && response.statusCode === 200) {
      /* body.items.map(track => {
        db.collection('tracks').add(track)
          .then(doc => {
            console.log(doc.id);
          })
          .catch(err => {
            console.error(err);
          });
      }); */
      return res.json(body.items);
    } else {
      return res.status(response.statusCode).json(body);
    }
  });
};


exports.createNYTArticles = (req, resp) => {
  const url = 'https://api.nytimes.com/svc/archive/v1/2019/3.json?api-key=nVKEsWvJTRUDRwkH4ZDrZGkwBo26NYPR';
  axios.get(url)
    .then(res => {
      console.log('Data Arrived');
      res.data.response.docs.map(news => {
        db.collection('nytarticles').add(news)
          .then(doc => {
            //console.log(doc.id);
          })
          .catch(err => {
            console.error(err);
          });
      });
      console.log('Data Pushed');
      return resp.json(res.data.response.docs);
    })
    .catch(err => {
      console.error(err);
      return resp.status(500).json({ error: err.data });
    });
};


exports.getNYTArticlesCount = (req, res) => {
  db.collection('nytarticles').get()
    .then(snapshot => {
      return res.json({ length: snapshot.size });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.getAnomalousItem = (req, res) => {
  db.collection('nytarticles')
    .where('test', '==', 'testing')
    .get()
    .then(data => {
      if(data.empty){
        return res.json({ msg: 'Doc Doesnt exist' });
      }
      data.forEach(doc => {
        let result = doc.data();
        result.id = doc.id;
        //db.doc(`/nytarticles/${doc.id}`).delete();
        return res.json(result);
      });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
}


exports.uploadAndDisplay = (req, res) => {
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
    // 32756238461724837.png
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
      imageUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${imageFileName}?alt=media`;
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

