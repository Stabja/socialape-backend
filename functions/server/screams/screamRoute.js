const express = require('express');
const router = express.Router();

const screamController = require('./screamController');
const { isUserAuthorized } = require('../../utils/customMiddleware');



router.get('/allscreams', screamController.getAllScreams);

router.get('/screams', screamController.getPaginatedScreams);

router.get('/:screamId', screamController.getScreamById);

router.get('/:screamId/comments', screamController.getCommentsByScreamId);

router.get('/by-tag/:tag', screamController.getScreamByTag);

router.post('/', isUserAuthorized, screamController.postOneScream);

router.put('/:screamId', isUserAuthorized, screamController.editScream);

router.delete('/:screamId', isUserAuthorized, screamController.deleteScream);

router.post('/:screamId/like', isUserAuthorized, screamController.likeScream);

router.delete('/:screamId/unlike', isUserAuthorized, screamController.unlikeScream);

router.post('/:screamId/comment', isUserAuthorized, screamController.commentOnScream);


module.exports = router;