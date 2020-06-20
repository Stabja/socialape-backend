const express = require('express');
const router = express.Router();

const utilsController = require('./utilsController');
const exportController = require('../../utils/exportCollections')



router.get('/tags', utilsController.getAllTags);

router.get('/export-all-data', exportController.exportAllData);

router.post('/addExtraUserDetails', utilsController.addExtraUserDetails);

router.post('/addOneExtraUserDetail/:handle', utilsController.addOneExtraUserDetail);

router.post('/addScreamTags', utilsController.addScreamTags);

router.post('/uploadImageAndDisplay', utilsController.uploadImageAndDisplayScreams);

router.put('/setContentImage', utilsController.setContentImageForAllScreams);

router.post('/create-connections-from-followers', utilsController.createConnectionsFromFollowers);


module.exports = router;