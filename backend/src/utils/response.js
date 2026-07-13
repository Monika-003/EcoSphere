'use strict';

/**
 * Standardised API response helpers
 */

function success(res, data = {}, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success:   true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

function created(res, data = {}, message = 'Created successfully') {
  return success(res, data, message, 201);
}

function paginated(res, data, total, page, limit, messageOrExtra = 'Data retrieved', extra = {}) {
  /* Allow callers to pass an extra data object as 6th arg (e.g. { unreadCount }) */
  let message = 'Data retrieved';
  let extras  = {};
  if (typeof messageOrExtra === 'string') {
    message = messageOrExtra;
    extras  = extra;
  } else if (typeof messageOrExtra === 'object') {
    extras = messageOrExtra;
  }

  return res.status(200).json({
    success:    true,
    message,
    data,
    ...extras,
    pagination: {
      total,
      page:       parseInt(page),
      limit:      parseInt(limit),
      totalPages: Math.ceil(total / limit),
      hasNext:    page * limit < total,
      hasPrev:    page > 1
    },
    timestamp: new Date().toISOString()
  });
}

function noContent(res) {
  return res.status(204).send();
}

/* Parse pagination from query */
function parsePagination(query) {
  const page  = Math.max(1,   parseInt(query.page  || 1));
  const limit = Math.min(100, parseInt(query.limit || 20));
  const skip  = (page - 1) * limit;
  return { page, limit, skip };
}

/* Parse sorting from query */
function parseSort(query, allowedFields = []) {
  const field     = query.sortBy    || 'createdAt';
  const direction = query.sortOrder === 'asc' ? 'asc' : 'desc';
  if (allowedFields.length && !allowedFields.includes(field)) {
    return { createdAt: 'desc' };
  }
  return { [field]: direction };
}

module.exports = { success, created, paginated, noContent, parsePagination, parseSort };
