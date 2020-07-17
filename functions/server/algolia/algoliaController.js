const functions = require('firebase-functions');
const algoliasearch = require('algoliasearch');
const { v4: uuid } = require('uuid');
const { db } = require('../../utils/admin');

const APP_ID = functions.config().algolia.appid;
const ADMIN_KEY = functions.config().algolia.adminkey;

const client = algoliasearch(APP_ID, ADMIN_KEY);
const index = client.initIndex('test_index');


exports.addToAlgoliaIndex = (req, res) => {
  const objectID = uuid();
  const body = req.body;
  index.saveObject({ objectID, ...body })
    .then(({ objectID }) => {
      console.log(`${objectID}`.green);
      return res.json(`${objectID} Saved in Algolia`);
    })
    .catch(err => {
      console.log(`${err}`.red);
      return res.status(400).json({ error: err.message });
    });
};


exports.updateAlgoliaIndex = (req, res) => { 
  const objectID = req.params.objectID;
  const body = req.body;
  index.partialUpdateObject({ objectID, ...body })
    .then(({ objectID }) => {
      console.log(`${objectID}`.green);
      return res.json(`${objectID} Updated in Algolia`);
    })
    .catch(err => {
      console.log(`${err}`.red);
      return res.status(400).json({ error: err.message });
    });
};


exports.deleteFromIndex = (req, res) => {
  const objectID = req.params.objectID;
  index.deleteObject(objectID)
    .then(() => {
      console.log(`${objectID}`.green);
      return res.json(`${objectID} Deleted from Algolia`);
    })
    .catch(err => {
      console.log(`${err}`.red);
      return res.status(400).json({ error: err.message });
    });
};