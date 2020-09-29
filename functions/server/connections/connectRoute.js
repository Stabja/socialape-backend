const express = require('express');
const router = express.Router();

const connectController = require('./connectController');
const { isUserAuthorized } = require('../../utils/customMiddleware');



router.get('/getconnection/:id', isUserAuthorized, connectController.getConnectionById);

router.post('/connect/:handle', isUserAuthorized, connectController.addConnection);

router.delete('/withdraw/:id', isUserAuthorized, connectController.withdrawRequest);

router.put('/accept/:id', isUserAuthorized, connectController.acceptRequest);

router.put('/reject/:id', isUserAuthorized, connectController.rejectRequest);

router.delete('/disconnect/:id', isUserAuthorized, connectController.disconnect);


module.exports = router;