const express = require('express');
const router = express.Router();

const nytarticleController = require('./nytarticleController');




router.get('/', nytarticleController.fetchArticlesUsingPagination);

router.post('/create', nytarticleController.createNYTArticles);

router.get('/getCount', nytarticleController.getNYTArticlesCount);

router.get('/removeOdd', nytarticleController.getAnomalousItem);

router.get('/article/:articleId', nytarticleController.fetchOneArticleById);

router.delete('/removeDuplicate', nytarticleController.removeDuplicateArticles);

router.put('/lowercase-byline', nytarticleController.lowercasePersons);

router.get('/by-newsdesk/:newsdesk', nytarticleController.getArticlesByNewsdesk);

router.get('/by-person/:person', nytarticleController.getArticlesByPerson);

router.get('/by-keyword', nytarticleController.getArticlesByKeyword);

router.post('/newsdesks/create', nytarticleController.createNewsdesks);

router.post('/persons/create', nytarticleController.createPersons);

router.post('/keywords/:word/create', nytarticleController.createKeywords);


module.exports = router;