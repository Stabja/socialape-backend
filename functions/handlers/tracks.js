const { db, admin } = require('../util/admin');
const axios = require('axios');
const querystring = require('querystring');
const qs = require('qs');
const request = require('request');
const moment = require('moment');


// Get AccessToken using ClientId and ClientSecret (Axios Implementation)
exports.getClientTokenWithAxios = (req, resp) => {
  const clientIdSecret = 'MjRkYThmOTk0ZGJjNDIzZjgwODE4ODc1NzhjZjI5Yzc6MDI2YTg5YWNjNDZiNGQxMjg3ZjVlYjc3YjdjYmQ3MDI=';
  const urlData = { 'grant_type': 'client_credentials' };
  const options = {
    url: 'https://accounts.spotify.com/api/token',
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
    url: 'https://api.spotify.com/v1/artists/1uNFoZAHBGtllmzznpCI3s/albums',
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
  const clientIdSecret = 'MjRkYThmOTk0ZGJjNDIzZjgwODE4ODc1NzhjZjI5Yzc6MDI2YTg5YWNjNDZiNGQxMjg3ZjVlYjc3YjdjYmQ3MDI=';
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
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
    url: 'https://api.spotify.com/v1/artists?' + 
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
    url: 'https://api.spotify.com/v1/tracks?' + 
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
    url: `https://api.spotify.com/v1/artists/${artistId}/top-tracks?` + 
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
          url: 'https://api.spotify.com/v1/artists?' + 
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
                        url: `https://api.spotify.com/v1/artists/${artistId}/albums?` + 
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
exports.fetchTracksUsingPagination = (req, res) => {
  let pageSize = parseInt(req.query.page_size);
  let cursor = req.query.cursor;

  if(!pageSize){
    return res.status(400).json({ error: 'page_size should not be null' });
  }

  const baseUrl = 'http://localhost:5000/socialape-d8699/us-central1/api/tracks?';
  if(cursor) {
    db.doc(`/tracks/${cursor}`)
      .get()
      .then(doc => {
        if(!doc.exists){
          return res.status(400).json({ error: 'Invalid Cursor' });
        }
        return db.collection('tracks')
          .orderBy('release_date', 'desc')
          .startAfter(doc)
          .limit(pageSize)
          .get()
      })
      .then(snapshot => {
        let tracksList = [];
        snapshot.forEach(doc => {
          console.log(doc.id);
          tracksList.push(doc.data());
        });
        let nextCursor = tracksList[tracksList.length-1].id;
        console.log('next_cursor', nextCursor);
        let resJson = {};
        resJson['collection'] = tracksList;
        if(tracksList.length === pageSize) {
          const urlQueries = querystring.stringify({
            page_size: pageSize,
            cursor: nextCursor
          });
          resJson['next_href'] = baseUrl + urlQueries;
        }
        return res.json(resJson);
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  } else {
    db.collection('tracks')
      .orderBy('release_date', 'desc')
      .limit(pageSize)
      .get()
      .then(snapshot => {
        let tracksList = [];
        snapshot.forEach(doc => {
          console.log(doc.id);
          tracksList.push(doc.data());
        });
        const nextCursor = tracksList[tracksList.length-1].id;
        console.log('next_cursor', nextCursor);
        let resJson = {};
        resJson['collection'] = tracksList;
        if(tracksList.length === pageSize) {
          const urlQueries = querystring.stringify({
            page_size: pageSize,
            cursor: nextCursor
          });
          resJson['next_href'] = baseUrl + urlQueries;
        }
        return res.json(resJson);
      })
      .catch(err => {
        console.error(err);
        return res.status(500).json({ error: err.code });
      });
  }
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
    //.limit(1)
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