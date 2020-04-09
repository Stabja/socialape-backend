const { db, admin } = require('../util/admin');


exports.getAllTracks = (req, res) => {
  db.collection('tracks')
    .orderBy('release_date')
    .get()
    .then(snapshot => {
      let tracks = [];
      snapshot.forEach(doc => {
        let track = doc.data();
        track.trackId = doc.id;
        tracks.push(track);
      });
      return res.json(tracks);
    })
    .catch(err => {
      console.log(err);
    });
};


exports.getTrackByArtistId = (req, res) => {

};


exports.getTrackByArtistName = (req, res) => {

};


exports.getTrackById = (req, res) => {

};


exports.getTrackByName = (req, res) => {

};


exports.getTrackByReleaseDate = (req, res) => {

};