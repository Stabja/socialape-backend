const { db, admin } = require('../../utils/admin');
const axios = require('axios');
const querystring = require('querystring');
const qs = require('qs');
const request = require('request');
const moment = require('moment');
const { 
  validateCursor,
  paginateQuery
} = require('../../utils/paginationUtils');
const { SPOTIFY_ENCODED_SECRET } = require('../../config/constants');
const {
  spotify_token_url,
  spotify_artist_url,
  spotify_tracks_url,
  spotify_toptracks_url,
  jb_tracks_url,
  tracks_url
} = require('../../config/externalUrls');


// Get AccessToken using ClientId and ClientSecret (Axios Implementation)
exports.getClientTokenWithAxios = (req, resp) => {
  const clientIdSecret = SPOTIFY_ENCODED_SECRET;
  const urlData = { 'grant_type': 'client_credentials' };
  const options = {
    url: spotify_token_url,
    method: 'POST',
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + clientIdSecret
    },
    data: qs.stringify(urlData),
  };
  axios(options)
    .then(res => {
      console.log(res.data);
      return resp.json(res.data);
    })
    .catch(err => {
      console.log(err.data);
      return resp.status(500).json({ error: err.message });
    });
};

// Get Justin Bieber Tracks using the AccessToken from previous API (Axios Implementation)
exports.getJbTracksWithAxios = (req, resp) => {
  const limit = req.query.limit || '10';
  const market = req.query.market || 'US';
  const accessToken = req.accessToken;

  const options = {
    url: jb_tracks_url,
    method: 'GET',
    params: {
      limit,
      market
    },
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
  };
  axios(options)
    .then(res => {
      return resp.json(res.data.items);
    })
    .catch(err => {
      console.log(err.data);
      return resp.status(500).json({ error: err.data });
    });
};

// Get AccessToken using ClientId and ClientSecret (Request Implementation)
exports.getClientToken = (req, res) => {
  const clientIdSecret = SPOTIFY_ENCODED_SECRET;
  var authOptions = {
    url: spotify_token_url,
    form: {
      grant_type: 'client_credentials'
    },
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + clientIdSecret
    },
    json: true
  };
  request.post(authOptions, (error, response, body) => {
    if(!error && response.statusCode === 200) {
      return res.json(body);
    } else {
      return res.status(response.statusCode).json(body);
    }
  });
};

// Get Artists using the AccessToken from previous API (Request Implementation)
exports.getArtistsById = (req, res) => {
  const artistId = req.query.ids;
  const accessToken = req.accessToken;

  var options = {
    url: spotify_artist_url + 
    querystring.stringify({
      ids: artistId
    }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    json: true
  };
  request.get(options, (error, response, body) => {
    if(!error && response.statusCode === 200) {
      body.artists[0].external_urls = body.artists[0].external_urls.spotify;
      return res.json(body);
    } else {
      return res.status(response.statusCode).json(body);
    }
  });
};

// Get Tracks using the AccessToken from previous API (Request Implementation)
exports.getTracksById = (req, res) => {
  const trackIds = req.query.ids;
  const market = req.query.market || 'US';
  const accessToken = req.accessToken;

  var options = {
    url: spotify_tracks_url + 
    querystring.stringify({
      ids: trackIds,
      market
    }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    json: true
  };
  request.get(options, (error, response, body) => {
    if(!error && response.statusCode === 200) {
      return res.json(body);
    } else {
      return res.status(response.statusCode).json(body);
    }
  });
}

// Get Top 10 tracks of an Artist
exports.getTopTracksOfArtist = (req, res) => {
  const artistId = req.params.artistId
  const country = req.query.country || 'US';
  const accessToken = req.accessToken;

  var options = {
    url: `${spotify_toptracks_url}/${artistId}/top-tracks?` + 
    querystring.stringify({
      country
    }),
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + accessToken
    },
    json: true
  };
  request.get(options, (error, response, body) => {
    if(!error && response.statusCode === 200) {
      return res.json(body);
    } else {
      return res.status(response.statusCode).json(body);
    }
  });
};

// Get artist and 50 Tracks of that artist
exports.getTracksByArtistIdExternal = (req, res) => {
  // First fetch the Artist, then using the Artist info, fetch the tracks
  // If Artist is present in Local DB, then fetch from there
  // If not there in Local DB, Fetch from Spotify API and Store in Local DB
  const artistId = req.params.artistId;
  const limit = req.query.limit || '10';
  const market = req.query.market || 'US';
  const accessToken = req.accessToken;
  let responseJson = {};
  // Check for artist in localDB
  db.doc(`/artists/${artistId}`)
    .get()
    .then(doc => {
      // If Artist doesnt exist, fetch from external API
      if(!doc.exists){
        var options = {
          url: spotify_artist_url + 
          querystring.stringify({
            ids: artistId
          }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + accessToken
          },
          json: true
        };
        request.get(options, (error, response, body) => {
          if(!error && response.statusCode === 200) {
            // Modify Artist Payload
            let artistObj = body.artists[0];
            artistObj.external_urls = artistObj.external_urls.spotify;
            // Store artist in LocalDB
            db.collection('artists')
              .doc(artistId)
              .set(artistObj)
              .then(() => {
                console.log('Artist downloaded from Spotify API and added to FBDB');
                //const artistObj = body.artists[0];
                responseJson['artist'] = artistObj;
                const { external_urls, href, id, name, type, uri } = artistObj;
                let artistPayload = { external_urls, href, id, name, type, uri };
                // Check for tracks of this Artist in localDB
                db.collection('tracks')
                  .select('artists')
                  .where('artists', 'array-contains', artistPayload)
                  .get()
                  .then((snapshot) => {
                    // If < 10 tracks exist for that Artist, fetch from external API
                    if(snapshot.docs.length < 10){
                      var trackOptions = {
                        url: `${spotify_toptracks_url}/${artistId}/albums?` + 
                        querystring.stringify({
                          limit,
                          market
                        }),
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': 'Bearer ' + accessToken
                        },
                        json: true
                      };
                      request.get(trackOptions, (error, response, body) => {
                        if(!error && response.statusCode === 200) {
                          // Store Tracks in LocalDB
                          let tracksList = [];
                          body.items.map((track, i) => {
                            // Modify the payload
                            track.images = track.images[0].url;
                            track.external_urls = track.external_urls.spotify;
                            track.artists.map(artist => {
                              artist.external_urls = artist.external_urls.spotify;
                            });
                            db.collection('tracks')
                              .doc(track.id)
                              .set(track)
                              .then(() => {
                                console.log(`Track-${i} downloaded from Spotify API and added to FBDB`);
                              })
                              .catch(err => {
                                console.error(err);
                                res.status(500).json({ error: 'Error adding track in FBDB' });
                              });
                            tracksList.push(track);
                          })
                          responseJson['tracks'] = tracksList;
                          return res.json(responseJson);
                        } else {
                          return res.status(response.statusCode).json(body);
                        }
                      });
                    } else {
                      let results = [];
                      snapshot.forEach(doc => {
                        let data = doc.data();
                        data.trackId = doc.id;
                        results.push(data);
                      });
                      responseJson['tracks'] = results;
                      return res.json(responseJson);
                    }
                  })
                  .catch(err => {
                    console.error(err);
                    return res.status(500).json({ error: err.code });
                  });
              })
              .catch(err => {
                console.error(err);
                return res.status(500).json({ error: err.code });
              });
          } else {
            return res.status(response.statusCode).json(body);
          }
        });
      } else {
        // Artist exists, Fetch from LocalDb
        responseJson['artist'] = doc.data();
        const { external_urls, href, id, name, type, uri } = doc.data();
        let artistPayload = { external_urls, href, id, name, type, uri };
        // Fetch Tracks of this Artist
        db.collection('tracks')
          .where('artists', 'array-contains', artistPayload)
          .get()
          .then(snapshot => {
            let trackList = [];
            snapshot.forEach(doc => {
              let track = 
              trackList.push(track.data());
            });
            responseJson['tracks'] = trackList;
            return res.json(responseJson);
          })
          .catch(err => {
            console.error(err);
            return res.status(500).json({ error: err.code });
          });
      }
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

// Get all tracks from 'tracks' collection
exports.fetchTracksUsingPagination = async (req, res) => {
  let pageSize = parseInt(req.query.page_size);
  let cursor = req.query.cursor;
  const baseUrl = tracks_url;

  if(!pageSize){
    return res.status(400).json({ error: 'page_size should not be null' });
  }

  let firebaseQuery = null;
  if(cursor) {
    let startingDoc = await validateCursor(cursor, 'tracks');
    if(startingDoc) {
      firebaseQuery = db.collection('tracks')
        .orderBy('release_date', 'desc')
        .startAfter(startingDoc)
        .limit(pageSize);
    } else {
      return res.status(400).json({ error: 'Innvalid Cursor' });
    }
  } else {
    firebaseQuery = db.collection('tracks')
      .orderBy('release_date',  'desc')
      .limit(pageSize);
  }

  paginateQuery(firebaseQuery, baseUrl, pageSize, res);
};


exports.getTracksByArtistId = (req, res) => {
  const artistId = req.query.artistId;
  const limitVal = parseInt(req.query.limit) || 20;
  db.doc(`/artists/${artistId}`)
    .get()
    .then(doc => {
      if(!doc.exists){
        return res.status(400).json({ error: 'Invalid ArtistId' });
      }
      const { external_urls, href, id, name, type, uri } = doc.data();
      const searchParam = { external_urls, href, id, name, type, uri };
      return db.collection('tracks')
        .where('artists', 'array-contains', searchParam)
        .orderBy('release_date', 'desc')
        .limit(limitVal)
        .get()
    })
    .then(snapshot => {
      let tracks = [];
      snapshot.forEach(doc => {
        tracks.push(doc.data());
      });
      return res.json(tracks);
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.getTracksByArtistName = (req, res) => {
  const artistName = req.query.name;
  const limitVal = parseInt(req.query.limit) || 20;
  db.collection('artists')
    .where('name', '==', artistName)
    .get()
    .then(data => {
      if(data.empty){
        return res.status(400).json({ error: 'No such Artist exists' });
      }
      console.log('No of artists fetched: ', data.docs.length);
      const { external_urls, href, id, name, type, uri } = data.docs[0].data();
      const searchParam = { external_urls, href, id, name, type, uri };
      return db.collection('tracks')
        .where('artists', 'array-contains', searchParam)
        .orderBy('release_date', 'desc')
        .limit(limitVal)
        .get()
    })
    .then(snapshot => {
      let tracks = [];
      snapshot.forEach(doc => {
        tracks.push(doc.data());
      });
      return res.json(tracks);
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.getTrackByTrackName = (req, res) => {
  const trackName = req.params.name;
  db.collection('tracks')
    .where('name', '==', trackName)
    .limit(1)
    .get()
    .then(data => {
      if(data.empty){
        return res.status(400).json({ error: 'No such track with that name' });
      }
      console.log('No of Tracks', data.docs.length);
      return res.json(data.docs[0].data());
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.getTrackById = (req, res) => {
  const trackId = req.query.id;
  console.log(trackId);
  db.collection('tracks').doc(trackId)
    .get()
    .then(doc => {
      if(!doc.exists){
        return res.status(400).json({ error: 'Invalid TrackId' });
      }
      return res.json(doc.data());
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.getTracksBetweenDates = (req, res) => {
  let startDate = req.query.start_date;
  let endDate = req.query.end_date;

  if(typeof endDate === 'undefined'){
    return res.status(400).json({ message: 'end_date cannot be null' });
  } else {
    endDate = moment(endDate).unix();
  }

  if(typeof startDate === 'undefined'){
    startDate = Math.round(Date.now()/1000);
  } else {
    startDate = moment(startDate).unix();
  }

  return res.json({
    start_date: startDate,
    release_date: moment('2019-10-25').unix(),
    end_date: endDate
  });
};