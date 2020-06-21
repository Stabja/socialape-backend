const { admin } = require('./admin');
const BusBoy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');
const config = require('./getconfig').config;
const { fbstorage_url } = require('../config/externalUrls');
const { DEBUG } = require('../config/constants');
const colors = require('colors');

let formData = {};


const uploadImage = async (imageFile, resolve) => {
  let uploadedImage = await admin
    .storage()
    .bucket()
    .upload(imageFile.filepath, {
      resumable: false,
      metadata: {
        metadata: {
          contentType: imageFile.mimetype
        }
      }
    });
  if(!uploadedImage) {
    DEBUG && console.error(err);
    resolve({ error: 'Error uploading Image.' });
  }
  const imageUrl = `${fbstorage_url}/v0/b/${config.storageBucket}/o/${imageFile.imageFileName}?alt=media`;
  return imageUrl;
};

const submitScream = async (headers, rawBody) => {
  
  const busboy = new BusBoy({ headers: headers });
  let imageFileName;
  let imageToBeUploaded = null;

  return new Promise((resolve, reject) => {
    DEBUG && console.log(colors.magenta({ headers, rawBody }));

    busboy.on('field', (fieldname, val) => {
      DEBUG && console.log(`${fieldname}: ${val}`.blue);
      formData[fieldname] = val;
    });

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      DEBUG && console.log(colors.yellow({ fieldname, file, filename, encoding, mimetype }));
      if(mimetype !== 'image/jpeg' && mimetype !== 'image/png'){
        return resolve({ error: 'Wrong file type submitted' });
      }
      const imageExtension = filename.split('.')[filename.split('.').length - 1];
      // 32756238461724837.png
      imageFileName = `${Math.round(Math.random() * 100000000000)}.${imageExtension}`;
      const filepath = path.join(os.tmpdir(), imageFileName);
      imageToBeUploaded = { filepath, mimetype, imageFileName };
      DEBUG && console.log(colors.yellow({ imageToBeUploaded }));
      file.pipe(fs.createWriteStream(filepath));
    });

    busboy.on('finish', async () => {
      DEBUG && console.log(colors.green({ formData }));
      formData['contentImage'] = imageToBeUploaded !== null
        ? await uploadImage(imageToBeUploaded, resolve)
        : "";
      return resolve(formData);
    });

    busboy.end(rawBody);
  });

};

module.exports = submitScream;