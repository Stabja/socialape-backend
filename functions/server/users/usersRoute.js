const express = require('express');
const router = express.Router();

const usersController = require('./usersController');
const { isUserAuthorized, isProfileAuthorized } = require('../../utils/customMiddleware');



router.post('/', isUserAuthorized, usersController.addUserDetails);

router.get('/', isUserAuthorized, usersController.getAuthenticatedUser);

router.get('/feed', isUserAuthorized, usersController.getScreamsFollowedByUser);

router.get('/connections', isUserAuthorized, usersController.getAllConnectionsOfUser);

router.get('/:handle/followers', isUserAuthorized, usersController.getAllFollowersOfUser);

router.get('/:handle/following', isUserAuthorized, usersController.getFollowingListOfUser);

router.get('/:handle/profile', usersController.getProfileDetailsOfanUser);

router.post('/image', isUserAuthorized, usersController.uploadImage);

router.get('/:handle', isProfileAuthorized, usersController.getUserDetailsWithAuth);


module.exports = router;