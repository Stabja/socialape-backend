const { db, admin } = require('./admin');
const querystring = require('querystring');


exports.validateCursor = (cursor, table) => {
  return new Promise((resolve, reject) => {
    db.doc(`/${table}/${cursor}`)
      .get()
      .then(doc => {
        if(!doc.exists){
          return resolve(null);
        };
        return resolve(doc);
      })
      .catch(err => {
        console.error(err);
        return resolve(err);
      });
  });
};


exports.paginateQuery = (query, baseUrl, pageSize, res) => {
  query.get()
    .then((snapshot) => {
      let paginatedList = [];
      snapshot.forEach(doc => {
        let docData = doc.data();
        docData.id = doc.id;
        paginatedList.push(docData);
        console.log(doc.id);
      });
      console.log('length: ', paginatedList.length);
      if(paginatedList.length === 0){
        return res.status(400).json({ error: 'No matching documents found' });
      }
      const nextCursor = paginatedList[paginatedList.length-1].id;
      console.log('next_cursor', nextCursor); 
      let resJson = {};
      resJson['collection'] = paginatedList;
      if(paginatedList.length === pageSize) {
        const urlQueries = querystring.stringify({
          page_size: pageSize,
          cursor: nextCursor
        });
        resJson['next_href'] = baseUrl + '?' + urlQueries;
      }
      return res.json(resJson);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};