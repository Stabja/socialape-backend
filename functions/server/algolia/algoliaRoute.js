const express = require('express');
const router = express.Router();

const algoliaController = require('./algoliaController');


router.get('/add-index', algoliaController.addToAlgoliaIndex);

router.get('/update-index/:objectID', algoliaController.updateAlgoliaIndex);

router.get('/delete-index/:objectID', algoliaController.deleteFromIndex);


module.exports = router;