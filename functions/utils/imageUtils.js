const { db, admin } = require('./admin');
const BusBoy = require('busboy');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { config } = require('./getconfig');
const { fbstorage_url } = require('../config/externalUrls');
const { DEBUG } = require('../config/constants');
const colors = require('colors');



const updateFieldInUsersCollection = async (userHandle, imageUrl, resolve, reject) => {
  try {
    await db.doc(`/users/${userHandle}`).update({ imageUrl });
  } catch(err) {
    console.error(`${err}`.red);
    reject({ error: err.code });
  }
  resolve({ message: 'Image Uploaded Successfully' });
};


const uploadImageToStorageBucket = async (imageFile, userHandle, bucketName, resolve, reject) => {
  let { filepath, mimetype, imagefilename } = imageFile;
  try {
    await admin
      .storage()
      .bucket()
      .upload(filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: mimetype
          }
        }
      });
  } catch(err) {
    DEBUG && console.error(`${err}`.red);
    reject({ error: 'Error uploading Image.' });
  }
  const imageUrl = `${fbstorage_url}/v0/b/${config.storageBucket}/o/${imagefilename}?alt=media`;
  updateFieldInUsersCollection(userHandle, imageUrl, resolve, reject);
};


const changeProfileImage = async (headers, rawBody, userHandle, bucketName) => {

  return new Promise((resolve, reject) => {
    const busboy = new BusBoy({ headers: headers });
    let imagefilename;
    let imageToBeUploaded = null;

    DEBUG && console.log(colors.magenta({ headers, rawBody }));

    busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
      console.log(colors.yellow({ fieldname, file, filename, encoding, mimetype }));
      if(mimetype !== 'image/jpeg' && mimetype !== 'image/png'){
        reject({ error: 'Wrong file type submitted' });
      }
      const imageExtension = filename.split('.')[filename.split('.').length - 1];
      imagefilename = `${Math.round(Math.random() * 100000000000)}.${imageExtension}`;  // 32756238461724837.png
      const filepath = path.join(os.tmpdir(), imagefilename);
      imageToBeUploaded = { filepath, mimetype, imagefilename };
      DEBUG && console.log(colors.yellow({ imageToBeUploaded }));
      file.pipe(fs.createWriteStream(filepath));
    });
  
    busboy.on('finish', async () => {
      DEBUG && console.log({ imageToBeUploaded });
      imageToBeUploaded === null
       ? reject({ error: 'Image is null.' })
       : uploadImageToStorageBucket(imageToBeUploaded, userHandle, bucketName, resolve, reject);
    });
  
    busboy.end(rawBody);
  });

};


module.exports = {
  changeProfileImage
};