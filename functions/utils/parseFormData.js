const { admin, db } = require('./admin');
const BusBoy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');
const config = require('./getconfig').config;
const { fbstorage_url } = require('../config/externalUrls');
const { DEBUG } = require('../config/constants');
const colors = require('colors');


module.exports = (headers, rawBody) => {

  const busboy = new BusBoy({ headers: headers });
  let imageFileName;
  let imageToBeUploaded = {};

  return new Promise((resolve, reject) => {
    console.log({ headers, rawBody });
    let formData = {};
    busboy.on('field', (fieldname, val) => {
      DEBUG && console.log(fieldname, ': ', val);
      formData[fieldname] = val;
    });

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      DEBUG && console.log(fieldname, file, filename, encoding, mimetype);
      if(mimetype !== 'image/jpeg' && mimetype !== 'image/png'){
        return resolve({ error: 'Wrong file type submitted' });
      }
      const imageExtension = filename.split('.')[filename.split('.').length - 1];
      // 32756238461724837.png
      imageFileName = `${Math.round(Math.random() * 100000000000)}.${imageExtension}`;
      const filepath = path.join(os.tmpdir(), imageFileName);
      imageToBeUploaded = { filepath, mimetype };
      file.pipe(fs.createWriteStream(filepath));
    });

    busboy.on('finish', () => {
      DEBUG && console.log('formData', formData);
      DEBUG && console.log(formData['body']);
      DEBUG && console.log(formData['tagList']);
      DEBUG && console.log(formData['localImage']);
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
        formData['contentImage'] = imageUrl
        return resolve(formData);
      })
      .catch(err => {
        DEBUG && console.error(err);
        return resolve({ error: err.code });
      });
    });
    busboy.end(rawBody);
  });

};