'use strict';

const multer  = require('multer');
const multerS3 = require('multer-s3');
const AWS     = require('aws-sdk');
const path    = require('path');
const { v4: uuid } = require('uuid');
const { AppError } = require('./errorHandler');

/* ── AWS S3 ── */
const s3 = new AWS.S3({
  accessKeyId:     process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region:          process.env.AWS_REGION || 'ap-south-1'
});

const ALLOWED_MIME = {
  document: ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  image:    ['image/jpeg','image/png','image/webp'],
  excel:    ['application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  csv:      ['text/csv','application/csv']
};

const ALL_ALLOWED = [
  ...ALLOWED_MIME.document,
  ...ALLOWED_MIME.image,
  ...ALLOWED_MIME.excel,
  ...ALLOWED_MIME.csv
];

/* ── S3 Storage ── */
function s3Storage(folder) {
  return multerS3({
    s3,
    bucket: process.env.AWS_S3_BUCKET,
    acl:    'private',
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (req, file, cb) => {
      const ext  = path.extname(file.originalname).toLowerCase();
      const name = `${folder}/${uuid()}${ext}`;
      cb(null, name);
    },
    metadata: (req, file, cb) => {
      cb(null, {
        userId:          req.user?.id   || 'anonymous',
        organizationId:  req.user?.orgId || '',
        originalName:    file.originalname
      });
    }
  });
}

/* ── Local Storage (dev fallback) ── */
const localStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuid()}${ext}`);
  }
});

/* ── File Filter ── */
function fileFilter(allowed) {
  return (req, file, cb) => {
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError(`File type ${file.mimetype} not allowed`, 400, 'INVALID_FILE_TYPE'), false);
    }
  };
}

/* ── Multer instances ── */
const useS3 = process.env.NODE_ENV === 'production' && process.env.AWS_ACCESS_KEY_ID;

function createUploader(folder, maxSizeMb = 10, allowedTypes = ALL_ALLOWED) {
  return multer({
    storage:  useS3 ? s3Storage(folder) : localStorage,
    limits:   { fileSize: maxSizeMb * 1024 * 1024 },
    fileFilter: fileFilter(allowedTypes)
  });
}

/* ── Pre-configured uploaders ── */
const documentUploader    = createUploader('documents', 10, ALLOWED_MIME.document);
const imageUploader       = createUploader('images',     5, ALLOWED_MIME.image);
const reportUploader      = createUploader('reports',   20, [...ALLOWED_MIME.document, ...ALLOWED_MIME.excel]);
const dataUploader        = createUploader('data',      10, [...ALLOWED_MIME.excel, ...ALLOWED_MIME.csv]);
const certificateUploader = createUploader('certificates', 5, ALLOWED_MIME.document);

/* ── S3 helpers ── */
async function uploadToS3(key, buffer, contentType) {
  const params = {
    Bucket:      process.env.AWS_S3_BUCKET,
    Key:         key,
    Body:        buffer,
    ContentType: contentType,
    ACL:         'private'
  };
  return s3.upload(params).promise();
}

async function getSignedUrl(key, expiresIn = 3600) {
  return s3.getSignedUrlPromise('getObject', {
    Bucket:  process.env.AWS_S3_BUCKET,
    Key:     key,
    Expires: expiresIn
  });
}

async function deleteFromS3(key) {
  return s3.deleteObject({
    Bucket: process.env.AWS_S3_BUCKET,
    Key:    key
  }).promise();
}

module.exports = {
  documentUploader, imageUploader, reportUploader, dataUploader, certificateUploader,
  uploadToS3, getSignedUrl, deleteFromS3, createUploader
};
