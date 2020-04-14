const { db, admin } = require('./admin');

module.exports = (cursor, table, dateField, pageSize) => {
  return new Promise((resolve, reject) => {
    db.doc(`/${table}/${cursor}`)
      .get()
      .then(doc => {
        if(!doc.exists){
          return resolve(null);
        };
        let query = db.collection(table)
          .orderBy(dateField, 'desc')
          .startAfter(doc)
          .limit(pageSize);
        return resolve(query);
      })
      .catch(err => {
        console.error(err);
        return resolve(err);
      });
  });
};