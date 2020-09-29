const express = require('express');
const router = express.Router();

const notificationController = require('./notificationController');
const { isUserAuthorized } = require('../../utils/customMiddleware');



router.get('/', notificationController.getAllNotifications);

router.put('/:id', isUserAuthorized, notificationController.markOneNotificationRead);

router.put('/allread', isUserAuthorized, notificationController.markAllNotificationsRead);

router.put('/allunread', notificationController.markAllNotificationsUnread);


module.exports = router;