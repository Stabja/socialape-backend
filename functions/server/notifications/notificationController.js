const { db } = require('../../utils/admin');
const { NotificationModel } = require('../../utils/collectionModels');


exports.getAllNotifications = (req, res) => {
  NotificationModel.get()
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


exports.markOneNotificationRead = (req, res) => {
  const docRef = db.doc(`/notifications/${req.params.id}`);
  db.doc(`/notifications/${req.params.id}`).get()
    .then(doc => {
      if(!doc.exists){
        return res.status(404).json({ error: 'Notification not found.' });
      }
      //Check whether the user logged in is the one who received the notification
      if(req.user.handle !== doc.data().recipient){
        return res.json({ message: 'You are not authorized to read this notification.' });
      }
      docRef.update({ read: true });
      return res.status(200).json({ message: 'Notification marked read.' });
    })
    .catch(err => {
      console.error(err);
      return res.status(500).json(err.code);
    });
};


exports.markAllNotificationsRead = (req, res) => {
  let batch = db.batch();
  req.body.forEach((id) => {
    const notification = db.doc(`/notifications/${id}`);
    batch.update(notification, { read: true });
  });
  batch
    .commit()
    .then(() => {
      return res.json({ message: 'Notifications marked read' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};


exports.markAllNotificationsUnread = (req, res) => {
  NotificationModel.get()
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