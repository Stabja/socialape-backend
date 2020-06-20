const express = require('express');
const router = express.Router();

const trackController = require('./trackController');
const { isTrackAuthorized } = require('../../utils/customMiddleware');



router.get('/get-axios-token', trackController.getClientTokenWithAxios);

router.get('/justin-bieber', isTrackAuthorized, trackController.getJbTracksWithAxios);

router.get('/get-client-token', trackController.getClientToken);

router.get('/artists', isTrackAuthorized, trackController.getArtistsById);

router.get('/tracks', isTrackAuthorized, trackController.getTracksById);

router.get('/top-tracks/:artistId', isTrackAuthorized, trackController.getTopTracksOfArtist);

router.post('/:artistId/external', isTrackAuthorized, trackController.getTracksByArtistIdExternal);

router.get('/', trackController.fetchTracksUsingPagination);

router.get('/by-artist-id', trackController.getTracksByArtistId);

router.get('/by-artisty-name', trackController.getTracksByArtistName);

router.get('/track/:name', trackController.getTrackByTrackName);

router.get('/track', trackController.getTrackById);

router.get('/inrange', trackController.getTracksBetweenDates);


module.exports = router;