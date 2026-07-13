'use strict';

const { prisma }   = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { success, created } = require('../utils/response');
const { createAuditLog }   = require('../middleware/auditLogger');
const { logger } = require('../config/logger');

/* ── Razorpay client (lazy) ── */
let _razorpay = null;
function getRazorpay() {
  if (_razorpay) return _razorpay;
  if (!process.env.RAZORPAY_KEY_ID) return null;
  try {
    const Razorpay = require('razorpay');
    _razorpay = new Razorpay({
      key_id:     process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
  } catch { _razorpay = null; }
  return _razorpay;
}

/* ── Subscription plan pricing (INR) ── */
const PLANS = {
  BASIC:        { price: 4999,   period: 'MONTHLY', features: ['Air','Water','Noise'] },
  PROFESSIONAL: { price: 14999,  period: 'MONTHLY', features: ['Air','Water','Noise','Soil','Stack','Groundwater'] },
  ENTERPRISE:   { price: 49999,  period: 'MONTHLY', features: ['ALL','IoT','Lab Integration','Regulatory Portal'] },
  GOVERNMENT:   { price: 99999,  period: 'MONTHLY', features: ['ALL','Priority Support','Custom SLA'] }
};

/* ══════════════════════════════════════
   GET CURRENT SUBSCRIPTION
══════════════════════════════════════ */
exports.getSubscription = async (req, res) => {
  const orgId = req.user.orgId;
  if (!orgId) throw new AppError('Organization context required', 400);

  const subscription = await prisma.subscription.findFirst({
    where:   { organizationId: orgId, status: 'ACTIVE' },
    orderBy: { startDate: 'desc' }
  });

  return success(res, { subscription, plans: PLANS });
};

/* ══════════════════════════════════════
   CREATE RAZORPAY ORDER
══════════════════════════════════════ */
exports.createOrder = async (req, res) => {
  const { plan } = req.body;
  const orgId    = req.user.orgId;

  if (!PLANS[plan]) throw new AppError('Invalid plan', 400);
  if (!orgId)       throw new AppError('Organization context required', 400);

  const planDetails = PLANS[plan];
  const amountPaise = planDetails.price * 100; /* Razorpay uses paise */

  const razorpay = getRazorpay();

  let order = null;
  if (razorpay) {
    try {
      order = await razorpay.orders.create({
        amount:   amountPaise,
        currency: 'INR',
        notes: {
          orgId, plan,
          userId: req.user.id
        }
      });
    } catch (err) {
      logger.error('[Billing] Razorpay order creation failed:', err.message);
      throw new AppError('Payment gateway error. Please try again.', 502);
    }
  } else {
    /* Mock order for development */
    order = {
      id:       `mock_order_${Date.now()}`,
      amount:   amountPaise,
      currency: 'INR',
      status:   'created'
    };
  }

  /* Save pending transaction */
  await prisma.paymentTransaction.create({
    data: {
      organizationId: orgId,
      userId:         req.user.id,
      orderId:        order.id,
      plan:           plan,
      amount:         planDetails.price,
      currency:       'INR',
      status:         'PENDING'
    }
  });

  return created(res, {
    orderId:   order.id,
    amount:    amountPaise,
    currency:  'INR',
    key:       process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
    plan,
    planDetails
  }, 'Order created');
};

/* ══════════════════════════════════════
   VERIFY PAYMENT + ACTIVATE SUBSCRIPTION
══════════════════════════════════════ */
exports.verifyPayment = async (req, res) => {
  const { orderId, paymentId, signature } = req.body;
  const orgId = req.user.orgId;

  /* Signature verification */
  if (process.env.RAZORPAY_KEY_SECRET && signature) {
    const crypto = require('crypto');
    const expected = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (expected !== signature) {
      throw new AppError('Payment signature verification failed', 400, 'SIGNATURE_MISMATCH');
    }
  }

  /* Find pending transaction */
  const tx = await prisma.paymentTransaction.findFirst({
    where: { orderId, status: 'PENDING' }
  });
  if (!tx) throw new AppError('Transaction not found', 404);

  const startDate = new Date();
  const endDate   = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  /* Activate subscription & update transaction in one tx */
  await prisma.$transaction([
    prisma.paymentTransaction.update({
      where: { id: tx.id },
      data:  { status: 'COMPLETED', paymentId, paidAt: new Date() }
    }),
    prisma.subscription.upsert({
      where:  { organizationId: orgId },
      create: {
        organizationId: orgId,
        plan:           tx.plan,
        status:         'ACTIVE',
        startDate, endDate,
        amount:         tx.amount
      },
      update: {
        plan:      tx.plan,
        status:    'ACTIVE',
        startDate, endDate,
        amount:    tx.amount
      }
    })
  ]);

  await createAuditLog({
    userId: req.user.id, action: 'PAYMENT', entityType: 'Subscription',
    description: `Subscription activated: ${tx.plan}`,
    ipAddress: req.ip
  });

  return success(res, { plan: tx.plan, validUntil: endDate }, 'Subscription activated successfully');
};

/* ══════════════════════════════════════
   PAYMENT HISTORY
══════════════════════════════════════ */
exports.getPaymentHistory = async (req, res) => {
  const orgId = req.user.orgId;
  if (!orgId) throw new AppError('Organization context required', 400);

  const transactions = await prisma.paymentTransaction.findMany({
    where:   { organizationId: orgId },
    orderBy: { createdAt: 'desc' },
    take:    20
  });

  return success(res, { transactions });
};
