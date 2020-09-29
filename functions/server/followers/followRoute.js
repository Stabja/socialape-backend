const express = require('express');
const router = express.Router();

const followController = require('./followController');
const { isUserAuthorized } = require('../../utils/customMiddleware');



router.get('/findfollower/:handle', isUserAuthorized, followController.findFollower);

router.get('/findfollowee/:handle', isUserAuthorized, followController.findFollowed);

router.post('/follow/:handle', isUserAuthorized, followController.followUser);

router.delete('/unfollow/:followId', isUserAuthorized, followController.unfollowUser);

router.put('/followback/:followId', isUserAuthorized, followController.followBack);

router.put('/revokefollow/:followId', isUserAuthorized, followController.revokeFollowBack);


module.exports = router;