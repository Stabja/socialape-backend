const express = require('express');
const router = express.Router();

const authenticationController = require('./authenticationController');


router.post('/signup', authenticationController.signup);

router.post('/login', authenticationController.login);

router.get('/revoketoken/:uid', authenticationController.revokeToken);


module.exports = router;