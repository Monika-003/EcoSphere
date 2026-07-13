'use strict';

const router = require('express').Router();
const ctrl   = require('../../controllers/notifications.controller');
const { authenticate } = require('../../middleware/auth');

router.use(authenticate);

router.get ('/',               ctrl.getNotifications);
router.get ('/unread-count',   ctrl.getUnreadCount);
router.put ('/mark-all-read',  ctrl.markAllRead);
router.put ('/:id/read',       ctrl.markRead);
router.delete('/:id',          ctrl.deleteNotification);

module.exports = router;
