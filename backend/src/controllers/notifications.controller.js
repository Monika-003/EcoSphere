'use strict';

const { prisma }   = require('../config/database');
const { success, paginated, parsePagination } = require('../utils/response');
const { AppError } = require('../middleware/errorHandler');

/* ── List notifications for current user ── */
exports.getNotifications = async (req, res) => {
  const { page, limit, skip } = parsePagination(req.query);
  const { isRead, type } = req.query;

  const where = { userId: req.user.id };
  if (isRead !== undefined) where.isRead = isRead === 'true';
  if (type)                 where.type   = type;

  const [notifications, total] = await Promise.all([
    prisma.notification.findMany({
      where, skip, take: limit, orderBy: { createdAt: 'desc' }
    }),
    prisma.notification.count({ where })
  ]);

  const unreadCount = await prisma.notification.count({
    where: { userId: req.user.id, isRead: false }
  });

  return paginated(res, notifications, total, page, limit, { unreadCount });
};

/* ── Mark single as read ── */
exports.markRead = async (req, res) => {
  const n = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!n) throw new AppError('Notification not found', 404);
  if (n.userId !== req.user.id) throw new AppError('Access denied', 403);

  await prisma.notification.update({
    where: { id: req.params.id },
    data:  { isRead: true, readAt: new Date() }
  });

  return success(res, {}, 'Notification marked as read');
};

/* ── Mark all as read ── */
exports.markAllRead = async (req, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user.id, isRead: false },
    data:  { isRead: true, readAt: new Date() }
  });
  return success(res, {}, 'All notifications marked as read');
};

/* ── Delete notification ── */
exports.deleteNotification = async (req, res) => {
  const n = await prisma.notification.findUnique({ where: { id: req.params.id } });
  if (!n) throw new AppError('Notification not found', 404);
  if (n.userId !== req.user.id) throw new AppError('Access denied', 403);

  await prisma.notification.delete({ where: { id: req.params.id } });
  return success(res, {}, 'Notification deleted');
};

/* ── Unread count ── */
exports.getUnreadCount = async (req, res) => {
  const count = await prisma.notification.count({
    where: { userId: req.user.id, isRead: false }
  });
  return success(res, { count });
};
