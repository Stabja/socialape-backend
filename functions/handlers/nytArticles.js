const { db, admin } = require('../util/admin');
const axios = require('axios');
const request = require('request');
const querystring = require('querystring');
const articlesData = require('../util/nytArticlesData');



exports.createNYTArticles = (req, res) => {
  console.log('Removing Duplicates.')
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
  const defaultThumb = 'https://firebasestorage.googleapis.com/v0/b/socialape-d8699.appspot.com/o/70922060326.jpg?alt=media&token=6f388486-901d-450e-a8fe-220f7093e544';
  const defaultCover = 'https://firebasestorage.googleapis.com/v0/b/socialape-d8699.appspot.com/o/86659230554.jpg?alt=media&token=7d526988-d3de-47ce-96b0-65c11a4932ee';
  filteredList.forEach(article => {
    let newArticle = {};
    newArticle['_id'] = article._id;
    let personList = [];
    article.byline && article.byline.person && article.byline.person.forEach(p => {
      let { firstname, lastname, middlename } = p;
      let np = { firstname, lastname, middlename };
      personList.push(np);
    });
    (personList.length === 0) && personList.push({
      firstname: 'NyTimes', 
      lastname: 'Article', 
      middlename: null
    });
    newArticle['byline'] = {};
    newArticle['byline'].person = personList;
    newArticle['byline'].organization = article.byline.organization ? article.byline.organization : 'NewYorkTimes';
    newArticle['byline'].original = article.byline.original ? 
      (article.byline.original.split('By ')[1] ? 
        article.byline.original.split('By ')[1] : 
        'NyTimes Article') :
        'NyTimes Article';
    newArticle['document_type'] = article.document_type ? article.document_type : 'article';
    let { content_kicker, main, print_headline } = article.headline;
    newArticle['headline'] = { content_kicker, main, print_headline };
    let keywordList = [];
    article.keywords && article.keywords.forEach(word => {
      let { name, value } = word;
      let newWord = { name, value };
      keywordList.push(newWord);
    });
    (keywordList.length === 0) && keywordList.push({
      name: 'subject',
      value: 'Default Article'
    });
    newArticle['keywords'] = keywordList;
    newArticle['lead_paragraph'] = article.lead_paragraph ? article.lead_paragraph : 'default Paragraph';
    let mediaList = [];
    article.multimedia && article.multimedia.forEach(media => {
      let newUrl = 'https://static01.nyt.com/' + media.url;
      mediaList.push(newUrl);
    });
    if(mediaList.length === 0){
      mediaList.push(defaultCover);
      mediaList.push(defaultThumb);
    }
    newArticle['multimedia'] = mediaList;
    newArticle['news_desk'] = article.news_desk ? article.news_desk : null;
    //newArticle['print_page'] = article.print_page;
    newArticle['pub_date'] = article.pub_date ? article.pub_date : null;
    newArticle['score'] = article.score ? article.score : null;
    newArticle['section_name'] = article.section_name ? article.section_name : null;
    newArticle['snippet'] = article.snippet ? article.snippet : null;
    newArticle['source'] = article.source ? article.source : null;
    newArticle['type_of_material'] = article.type_of_material ? article.type_of_material : null;
    newArticle['uri'] = article.uri ? article.uri : null;
    newArticle['web_url'] = article.web_url ? article.web_url : null;
    newArticle['word_count'] = article.word_count ? article.word_count : null;
    shortenedList.push(newArticle);
  });
  responseJson['articles'] = shortenedList;
  console.log('ShortenedList', shortenedList.length);
  console.log('Json Processed. Adding to Firebase.');

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


exports.fetchArticlesUsingPagination = (req, res) => {
  let pageSize = parseInt(req.query.page_size);
  let cursor = req.query.cursor;

  console.log('pageSize', pageSize);
  console.log('cursor', cursor);

  if(!pageSize){
    return res.status(400).json({ error: 'page_size should not be null' });
  }
  
  const baseUrl = 'http://localhost:5000/socialape-d8699/us-central1/api/nytarticles?';
  if(cursor) {
    db.doc(`/nytarticles/${cursor}`)
      .get()
      .then(doc => {
        if(!doc.exists){
          return res.status(400).json({ error: 'Invalid Cursor' });
        }
        return db.collection('nytarticles')
          .orderBy('pub_date')
          .startAfter(doc)
          .limit(pageSize)
          .get()
      })
      .then((snapshot) => {
        let articlesList = [];
        snapshot.forEach(doc => {
          let article = doc.data();
          //let { _id, headline, pub_date, section_name, snippet, source, web_url, word_count } = doc.data();
          //let article = { _id, headline, pub_date, section_name, snippet, source, web_url, word_count };
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
  } else {
    db.collection('nytarticles')
      .orderBy('pub_date')
      .limit(pageSize)
      .get()
      .then((snapshot) => {
        let articlesList = [];
        snapshot.forEach(doc => {
          let article = doc.data();
          //let { _id, headline, pub_date, section_name, snippet, source, web_url, word_count } = doc.data();
          //let article = { _id, headline, pub_date, section_name, snippet, source, web_url, word_count };
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
  }
};