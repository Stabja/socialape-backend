const { db, admin } = require('../util/admin');
const request = require('request');
const querystring = require('querystring');
const articlesData = require('../util/nytArticlesData');
const validateCursor = require('../util/validateCursor');
const shortenArticles = require('../util/shortenArticles');
const addDataAsync = require('../util/addDataAsync');
const { nytarticles_url } = require('../config/externalUrls');



exports.createNYTArticles = (req, res) => {
  console.log('Removing Duplicates.');
  //Remove Duplicates
  let articlesMap = new Map();
  let filteredList = [];
  articlesData.response.docs.map(article => {
    if(!articlesMap[article._id]) {
      articlesMap[article._id] = article;
      filteredList.push(article);
    }
  });
  console.log('FilteredList', filteredList.length);
  responseJson = {};
  responseJson['length'] = filteredList.length;
  // Shorten the Json
  let shortenedList = [];
  filteredList.forEach(article => {
    shortenedList.push(shortenArticles(article));
  });
  responseJson['articles'] = shortenedList;
  console.log('ShortenedList', shortenedList.length);
  console.log('Json Processed. Adding to Firebase.');
  // Add data to Firebase
  let firebaseArticleCount = 0;
  let execute = shortenedList.map(article => {
    return new Promise((resolve, reject) => {
      db.collection('nytarticles')
        .doc(article._id)
        .set(article)
        .then(() => {
          firebaseArticleCount++;
          console.log(`${article._id} Pushed`);
          resolve();
        })
        .catch(err => {
          console.log(err);
          res.status(500).json({ error: err.code });
        });
    });
  });
  Promise.all(execute)
    .then(() => {
      console.log(`${firebaseArticleCount} articles added to Firebase`);
      return res.json(responseJson);
    })
    .catch(err => {
      console.log(err);
      return res.json(err);
    });
};


// Get articles count from 'nytarticles' Collection
exports.getNYTArticlesCount = (req, res) => {
  db.collection('nytarticles').select('document_type').get()
    .then(snapshot => {
      console.log(snapshot.size);
      return res.json({ length: snapshot.docs.length });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Remove anomalous Document from 'nytarticles' collection
exports.getAnomalousItem = (req, res) => {
  db.collection('nytarticles')
    .where('test', '==', 'testing')
    .get()
    .then(data => {
      if(data.empty){
        return res.json({ msg: 'Doc Doesnt exist' });
      }
      data.forEach(doc => {
        let result = doc.data();
        result.id = doc.id;
        db.doc(`/nytarticles/${doc.id}`).delete();
        return res.json(result);
      });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Remove Duplicate documents from 'nytarticles' collection
exports.removeDuplicateArticles = (req, res) => {
  let articlesMap = new Map();
  db.collection('nytarticles')
    .select('_id')
    .get()
    .then(snapshot => {
      let deletedList = [];
      let cnt = 0;
      snapshot.forEach(doc => {
        cnt++;
        if(articlesMap[doc.data()._id]) {
          console.log(doc.id);
          deletedList.push(doc.data()._id);
          doc.ref.delete();
        } else {
          articlesMap[doc.data()._id] = doc.id;
        }
      });
      let respJson = {};
      respJson['list'] = deletedList;
      respJson['count'] = cnt;
      return res.json(respJson);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.fetchArticlesUsingPagination = async (req, res) => {
  let pageSize = parseInt(req.query.page_size);
  let cursor = req.query.cursor;
  const baseUrl = nytarticles_url;
  console.log('pageSize', pageSize);
  console.log('cursor', cursor);

  if(!pageSize){
    return res.status(400).json({ error: 'page_size should not be null' });
  }
  
  let firebaseQuery = null;
  cursor
    ? (firebaseQuery = await validateCursor(cursor, 'nytarticles', 'pub_date', pageSize))
    : (firebaseQuery = db.collection('nytarticles')
        .orderBy('pub_date', 'desc')
        .limit(pageSize));

  if(!firebaseQuery) {
    return res.status(400).json({ error: 'Invalid Cursor' });
  }

  firebaseQuery
    .get()
    .then((snapshot) => {
      let articlesList = [];
      snapshot.forEach(doc => {
        let article = doc.data();
        article.articleId = doc.id;
        articlesList.push(article);
        console.log(doc.id);
      });
      const nextCursor = articlesList[articlesList.length-1].articleId;
      console.log('next_cursor', nextCursor); 
      let resJson = {};
      resJson['collection'] = articlesList;
      if(articlesList.length === pageSize) {
        const urlQueries = querystring.stringify({
          page_size: pageSize,
          cursor: nextCursor
        });
        resJson['next_href'] = baseUrl + urlQueries;
      }
      return res.json(resJson);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};