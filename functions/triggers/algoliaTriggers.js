const functions = require('firebase-functions');
const algoliasearch = require('algoliasearch');
const trigger = functions.region('asia-east2').firestore;

const APP_ID = functions.config().algolia.appid;
const ADMIN_KEY = functions.config().algolia.adminkey;

const client = algoliasearch(APP_ID, ADMIN_KEY);
const index = client.initIndex('test_index');



exports.addToIndex = 
  trigger.document('/algoliatest/{id}')
    .onCreate(snapshot => {
      const data = snapshot.data();
      const objectID = snapshot.id;
      console.log(`CREATING OBJECT ${objectID} IN ALGOLIA`);
      return index.saveObject({ ...data, objectID });
    });


exports.updateIndex = 
  trigger.document('/algoliatest/{id}')
    .onUpdate((change) => {
      const newData = change.after.data();
      const objectID = change.after.id;
      console.log(`MODIFYING OBJECT ${objectID} IN ALGOLIA`);
      return index.saveObject({ ...newData, objectID });
    });


exports.deleteFromIndex = 
  trigger.document('/algoliatest/{id}')
    .onDelete(snapshot => {
      console.log(`DELETING OBJECT ${snapshot.id} IN ALGOLIA`);
      index.deleteObject(snapshot.id)
    });