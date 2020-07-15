const functions = require('firebase-functions');
const algoliasearch = require('algoliasearch');
const {
  ALGOLIA_APP_ID,
  ALGOLIA_ADMIN_KEY
} = require('../config/constants');
const client = algoliasearch(ALGOLIA_APP_ID, ALGOLIA_ADMIN_KEY);
const index = client.initIndex('conduit_index');


exports.addToIndex = 
  functions.firestore.document('/algoliatest/{id}')
    .onCreate(snapshot => {
      const data = snapshot.data();
      const objectId = snapshot.id;
      return index.addObject({ ...data, objectId });
    });


exports.updateIndex = 
  functions.firestore.document('/algoliatest/{id}')
    .onUpdate((change) => {
      const newData = change.after.data();
      const objectId = change.after.id;
      return index.saveObject({ ...newData, objectId });
    });


exports.deleteFromIndex = 
  functions.firestore.document('/algoliatest/{id}')
  .onDelete(snapshot => index.deleteObject(snapshot.id));