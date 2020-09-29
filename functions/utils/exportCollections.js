const { db } = require('./admin');
const fs = require('fs');
const path = require('path');


// This has to be made synchronous
const writeJsonToFile = (outputFile, jsonContent) => {
  fs.writeFile(outputFile, jsonContent, 'utf8', (err) => {
    if(err) {
      console.log(err);
    } else {
      console.log("JSON saved to " + outputFile);
    }
  });
};

const readDataFromCollection = (collection) => {
  db.collection(collection)
    .get()
    .then(snapshot => {
      let responseJson = [];
      snapshot.forEach(doc => {
        let obj = doc.data();
        obj.id = doc.id;
        responseJson.push(obj);
      });
      let jsonContent = JSON.stringify(responseJson, null, 2);
      let outputFile = path.join(__dirname, `exports/${collection}.json`);
      writeJsonToFile(outputFile, jsonContent);
    })
    .catch(err => {
      console.log(err);
    });
};

exports.exportAllData = (req, res) => {
  readDataFromCollection('users');
  readDataFromCollection('screams');
  readDataFromCollection('likes');
  readDataFromCollection('comments');
  readDataFromCollection('followers');
  readDataFromCollection('notifications');
  readDataFromCollection('tags');
  readDataFromCollection('artists');
  readDataFromCollection('tracks');
  return res.json('All collections Exported.');
};