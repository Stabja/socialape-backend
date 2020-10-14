const { db } = require('./admin');
const fs = require('fs');
const path = require('path');
const { DEBUG } = require('../config/constants');


const tick = Date.now();
const log = (v) => {
  let elapsedTime = Date.now() - tick;
  console.log(`${v} \n Elapsed: ${elapsedTime}`.cyan);
  return elapsedTime;
};


// This has to be made synchronous
const writeJsonToFile = (outputFile, jsonContent) => {
  return new Promise((resolve, reject) => {
    DEBUG && console.log('Writing file to Json.....'.cyan);
    fs.writeFile(outputFile, jsonContent, 'utf8', (err) => {
      if(err) {
        DEBUG && console.log(`${err}`.red);
        reject(err);
      } else {
        DEBUG && console.log(`JSON saved to ${outputFile}`.green);
        resolve();
      }
    });
  });
};

const readDataFromCollection = (collection) => {
  return new Promise(async (resolve, reject) => {
    let snapshot;
    try {
      snapshot = await db.collection(collection).get();
    } catch(err) {
      DEBUG && console.log(`${err}`.red);
      reject(err);
    }
    let responseJson = [];
    snapshot.forEach(doc => {
      let obj = doc.data();
      obj.id = doc.id;
      responseJson.push(obj);
    });
    let jsonContent = JSON.stringify(responseJson, null, 2);
    let outputFile = path.join(__dirname, `exports/${collection}.json`);
    try {
      await writeJsonToFile(outputFile, jsonContent);
      resolve();
    } catch(err) {
      DEBUG && console.log(`${err}`.red);
      reject(err);
    }
  });
};


exports.exportAllData = async (req, res) => {
  try {
    console.time('exportTime'.cyan);
    await readDataFromCollection('users');
    await readDataFromCollection('screams');
    await readDataFromCollection('likes');
    await readDataFromCollection('comments');
    await readDataFromCollection('followers');
    await readDataFromCollection('connections');
    await readDataFromCollection('notifications');
    await readDataFromCollection('tags');
    await readDataFromCollection('artists');
    await readDataFromCollection('tracks');
    await readDataFromCollection('persons');
    await readDataFromCollection('news_desks');
    await readDataFromCollection('keyword_subject');
    await readDataFromCollection('keyword_organizations');
    console.timeEnd('exportTime'.cyan);
  } catch(err) {
    DEBUG && console.log(`${err}`.red);
    return res.json(err);
  }
  let elapsedTime = log('ExportTime');
  return res.json({
    status: 'Successful',
    time: elapsedTime
  });
};