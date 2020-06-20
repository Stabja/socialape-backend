const { db } = require('../../utils/admin');
const request = require('request');
const axios = require('axios');
const querystring = require('querystring');
const articlesData = require('../../utils/nytArticlesData');
const { nytarticles_url } = require('../../config/externalUrls');
const {
  addDataAsync,
  shortenArticle,
  lowercaseArticle,
} = require('../../utils/articleUtils');
const {
  validateCursor,
  paginateQuery
} = require('../../utils/paginationUtils');



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
    shortenedList.push(shortenArticle(article));
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
      return res.json(shortenedList);
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
  if(cursor) {
    let startingDoc = await validateCursor(cursor, 'nytarticles');
    if(startingDoc) {
      firebaseQuery = db.collection('nytarticles')
        .orderBy('pub_date', 'desc')
        .select('pub_date')
        .startAfter(startingDoc)
        .limit(pageSize);
    } else {
      return res.status(400).json({ error: 'Invalid Cursor' });
    }
  } else {
    firebaseQuery = db.collection('nytarticles')
      .orderBy('pub_date', 'desc')
      .select('pub_date')
      .limit(pageSize);
  }

  paginateQuery(firebaseQuery, baseUrl, pageSize, res);
};


exports.fetchOneArticleById = (req, res) => {
  db.doc(`/nytarticles/${req.params.articleId}`)
    .get()
    .then((doc) => {
      if(!doc.exists){
        return res.status(400).json({ error: 'Invalid ArticleId' });
      }
      return res.json(doc.data());
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.lowercasePersons = async (req, res) => {
  let startCursor = null;
  let execute = () => {
    return new Promise((resolve, reject) => {
      db.doc(`/nytarticles/${req.query.cursor}`)
        .get()
        .then(doc => {
          if(!doc.exists) {
            return res.status(400).json({ error: 'Invalid Cursor' });
          }
          resolve(doc)
        })
        .catch(err => {
          console.log(err);
          return res.status(500).json({ error: err.code });
        });
    });
  };
  startCursor = await execute();

  db.collection('nytarticles')
    .orderBy('pub_date', 'desc')
    .select('byline')
    .startAfter(startCursor)
    //.limit(30000)
    .get()
    .then(snapshot => {
      let articlesList = [];
      let lastCursor = null;
      snapshot.docs.map((doc, i, arr) => {
        let article = doc.data();
        article._id = doc.id;
        articlesList.push(article);
        if(i === arr.length - 1) {
          lastCursor = doc.data();
          lastCursor.articleId = doc.id;
        }
      });
      let responseList = [];
      articlesList.map((article, i) => {
        const lowercasedArticle = lowercaseArticle(article);
        responseList.push(lowercasedArticle);
        snapshot.docs[i].ref.update({ byline: lowercasedArticle.byline });
      });
      let response = {};
      response['articles_list'] = responseList;
      response['last_doc'] = lastCursor;
      console.log('Start_Cursor', startCursor);
      console.log('DONE!!..........');
      console.log(snapshot.docs.length + ' Docs Modified');
      return res.json(response);
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.getArticlesByNewsdesk = async (req, res) => {
  let pageSize = parseInt(req.query.page_size);
  let cursor = req.query.cursor;
  const baseUrl = nytarticles_url + '/by-newsdesk/' + req.params.newsdesk;
  console.log('pageSize', pageSize);
  console.log('cursor', cursor);

  if(!pageSize){
    return res.status(400).json({ error: 'page_size should not be null' });
  }
  
  let firebaseQuery = null;
  if(cursor) {
    let startingDoc = await validateCursor(cursor, 'nytarticles');
    if(startingDoc) {
      firebaseQuery = db.collection('nytarticles')
        .where('news_desk', '==', req.params.newsdesk)
        .orderBy('pub_date', 'desc')
        //.select('pub_date')
        .startAfter(startingDoc)
        .limit(pageSize);
    } else {
      return res.status(400).json({ error: 'Invalid Cursor' });
    }
  } else {
    firebaseQuery = db.collection('nytarticles')
      .where('news_desk', '==', req.params.newsdesk)
      .orderBy('pub_date', 'desc')
      //.select('pub_date')
      .limit(pageSize);
  }

  paginateQuery(firebaseQuery, baseUrl, pageSize, res);
};


exports.getArticlesByPerson = async (req, res) => {
  let pageSize = parseInt(req.query.page_size);
  let cursor = req.query.cursor;
  const baseUrl = nytarticles_url + '/by-person/' + req.params.person;
  console.log(pageSize, cursor, req.params.person);

  if(!pageSize){
    return res.status(400).json({ error: 'page_size should not be null' });
  }

  let user = req.params.person;
  let name = user.split(' ');
  let matchObj = null;
  if(name.length >= 3) {
    matchObj = {
      firstname: name[0],
      middlename: name[1],
      lastname: name[2]
    }
  } else if (name.length === 2) {
    matchObj = {
      firstname: name[0],
      middlename: null,
      lastname: name[1]
    }
  } else if (name.length === 1) {
    matchObj = {
      firstname: name[0],
      middlename: null,
      lastname: null
    }
  } else {
    return res.status(400).json({ error: 'Person cannot be empty' });
  }
  console.log('byline.person', matchObj);
  console.log('req.body', req.body);
  let firebaseQuery = null;
  if(cursor) {
    let startingDoc = await validateCursor(cursor, 'nytarticles');
    if(startingDoc) {
      firebaseQuery = db.collection('nytarticles')
        .where('byline.person', 'array-contains', req.body)
        .orderBy('pub_date', 'desc')
        .select('pub_date')
        .startAfter(startingDoc)
        .limit(pageSize);
    } else {
      return res.status(400).json({ error: 'Invalid Cursor' });
    }
  } else {
    firebaseQuery = db.collection('nytarticles')
      .where('byline.person', 'array-contains', req.body)
      .orderBy('pub_date', 'desc')
      .select('pub_date')
      .limit(pageSize);
  }

  paginateQuery(firebaseQuery, baseUrl, pageSize, res);
};


exports.getArticlesByKeyword = async (req, res) => {
  let pageSize = parseInt(req.query.page_size);
  let cursor = req.query.cursor;
  const baseUrl = nytarticles_url + '/by-keyword';
  console.log(pageSize, cursor);

  if(!pageSize){
    return res.status(400).json({ error: 'page_size should not be null' });
  }
  
  let firebaseQuery = null;
  if(cursor) {
    let startingDoc = await validateCursor(cursor, 'nytarticles');
    if(startingDoc) {
      firebaseQuery = db.collection('nytarticles')
        .where('keywords', 'array-contains', req.body)
        .orderBy('pub_date', 'desc')
        //.select('pub_date')
        .startAfter(startingDoc)
        .limit(pageSize);
    } else {
      return res.status(400).json({ error: 'Invalid Cursor' });
    }
  } else {
    firebaseQuery = db.collection('nytarticles')
      .where('keywords', 'array-contains', req.body)
      .orderBy('pub_date', 'desc')
      //.select('pub_date')
      .limit(pageSize);
  }

  paginateQuery(firebaseQuery, baseUrl, pageSize, res);
};


exports.createNewsdesks = async (req, res) => {
  let newsDesks = await axios.get('http://localhost:8080/api/articles/newsdesks');
  console.log('Newsdesks Length', newsDesks.data.length);
  let deskCount = 0;
  let execute = newsDesks.data.map(desk => {
    return new Promise((resolve) => {
      if(desk.name !== '') {
        db.collection('news_desks')
          .doc(desk.name.replace(/\//g, '%'))
          .set(desk)
          .then(() => {
            deskCount++;
            console.log(`${desk.name} Added.`);
            resolve();
          })
          .catch(err => {
            console.log(err);
            return res.status(500).json({ error: err.code });
          });
      }
    });
  });
  Promise.all(execute)
    .then(() => {
      console.log(`${deskCount} newsDesks added to Firebase.`);
      return res.json(newsDesks.data);
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err });
    });
};


exports.createPersons = async (req, res) => {
  let persons = await axios.get('http://localhost:8080/api/articles/all-persons');
  console.log('Persons Length', persons.data.length);
  let deskCount = 0;
  let execute = persons.data.map(desk => {
    return new Promise((resolve) => {
      if(desk.name !== '') {
        db.collection('persons')
          .doc(desk.name.replace(/\//g, '%'))
          .set(desk)
          .then(() => {
            deskCount++;
            console.log(`${desk.name} Added`);
            resolve();
          })
          .catch(err => {
            console.log(err);
            return res.status(500).json({ error: err.code });
          });
      }
    });
  });
  Promise.all(execute)
    .then(() => {
      console.log(`${deskCount} Persons added to Firebase.`);
      return res.json(persons.data);
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err });
    });
};


exports.createKeywords = async (req, res) => {
  let keywords = await axios.get(`http://localhost:8080/api/articles/keywords/${req.params.word}`);
  console.log('Keywords Length', keywords.data.length);
  let deskCount = 0;
  let execute = keywords.data.map(desk => {
    return new Promise((resolve) => {
      if(desk.name !== '') {
        db.collection(`keyword_${req.params.word}`)
          .doc(desk.name.replace(/\//g, '%'))
          .set(desk)
          .then(() => {
            deskCount++;
            console.log(`${desk.name} Added`);
            resolve();
          })
          .catch(err => {
            console.log(err);
            res.status(500).json({ error: err.code });
          });
      }
    });
  });
  Promise.all(execute)
    .then(() => {
      console.log(`${deskCount} Keywords added to Firebase.`);
      return res.json(keywords.data);
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err });
    });
};