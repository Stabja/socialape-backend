const express = require('express');
const router = express.Router();

const algoliaController = require('./algoliaController');


router.post('/add-index', algoliaController.addToAlgoliaIndex);

router.put('/update-index/:objectID', algoliaController.updateAlgoliaIndex);

router.delete('/delete-index/:objectID', algoliaController.deleteFromIndex);

router.post('/import-index', algoliaController.importAlgoliaIndex);


module.exports = router;