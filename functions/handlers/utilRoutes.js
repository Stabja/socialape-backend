const { db, admin } = require('../util/admin');


// Get all tags
exports.getAllTags = (req, res) => {
  db.collection('tags')
    .get()
    .then(snapshot => {
      let tagsList = [];
      snapshot.forEach(doc => {
        tagsList.push(doc.id);
      });
      let tags = {
        tags: tagsList
      };
      return res.status(201).json(tags);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: 'Something went wrong.' });
    });
};

// Get all notifications
exports.getAllNotifications = (req, res) => {
  db.collection('notifications')
    .get()
    .then(snapshot => {
      let notifications = [];
      snapshot.forEach(doc => {
        let notification = {};
        notification = doc.data();
        notification.nId = doc.id;
        notifications.push(notification); 
      });
      return res.status(201).json(notifications);
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: 'Something went wrong.' });
    });
};

exports.markAllNotificationsUnread = (req, res) => {
  db.collection('notifications')
    .get()
    .then(data => {
      data.forEach(doc => {
        doc.ref.update({ read : false });
      });
      return res.json({ message: 'All Notifications marked unread.' });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.addExtraUserDetails = (req, res) => {
  const extraUserDetails = req.body;
  db.collection('users')
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        doc.ref.update(extraUserDetails);
      });
      return res.json({ message: 'Extra Details Added Successfully.' })
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.addScreamTags = (req, res) => {
  const tagsList = [
    "animation",
    "butt",
    "caramel",
    "cars",
    "clean",
    "coffee",
    "computerScience",
    "cookies",
    "cryptocurrency",
    "datascience",
    "dragons",
    "esports",
    "flowers",
    "gaming",
    "happiness",
    "japan",
    "money",
    "porsche",
    "pubg",
    "singapore",
    "sugar",
    "sushi",
    "test",
    "tourism",
    "training"
  ];
  
  db.collection('screams')
    .get()
    .then(snapshot => {
      snapshot.forEach(doc => {
        let numTags = Math.random()*(6-3)+3;
        let tagList = [];
        for(let i = 0; i < numTags; i++){
          tagList.push(tagsList[Math.floor(Math.random()*tagsList.length)]);
        };
        console.log(tagList);
        doc.ref.update({ tagList: tagList });
      });
      return res.status(500).json({ message: 'Tags Added successfully.' });
    })
    .catch(err => {
      console.log(err);
      return res.status(500).json({ error: err.code });
    });
    
};