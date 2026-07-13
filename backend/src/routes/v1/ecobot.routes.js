'use strict';

const router = require('express').Router();
const ctrl   = require('../../controllers/ecobot.controller');
const { authenticate } = require('../../middleware/auth');
const { authorize }    = require('../../middleware/rbac');
const { aiLimiter }    = require('../../middleware/rateLimiter');

router.use(authenticate);

router.post('/chat',                        aiLimiter, authorize('ai','query'), ctrl.chat);
router.get ('/conversations',               ctrl.getConversations);
router.get ('/conversations/:id',           ctrl.getConversation);
router.delete('/conversations/:id',         ctrl.deleteConversation);
router.get ('/recommendations',             ctrl.getRecommendations);

module.exports = router;
