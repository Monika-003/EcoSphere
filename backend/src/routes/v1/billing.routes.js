'use strict';

const router = require('express').Router();
const ctrl   = require('../../controllers/billing.controller');
const { authenticate } = require('../../middleware/auth');
const { authorize }    = require('../../middleware/rbac');

router.use(authenticate);

router.get ('/subscription',        authorize('billing', 'read'),   ctrl.getSubscription);
router.post('/order',               authorize('billing', 'read'),   ctrl.createOrder);
router.post('/verify',              authorize('billing', 'read'),   ctrl.verifyPayment);
router.get ('/history',             authorize('billing', 'read'),   ctrl.getPaymentHistory);

module.exports = router;
