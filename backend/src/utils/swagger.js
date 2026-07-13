'use strict';

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'EcoSphere Environmental Compliance API',
      version:     '1.0.0',
      description: 'Complete REST API for EcoSphere — Environmental Compliance Platform. Covers monitoring, reports, lab workflow, regulatory approvals, certificates, IoT integration, EcoBot AI, and more.',
      contact: {
        name:  'EcoSphere Support',
        email: 'support@ecosphere.app',
        url:   'https://ecosphere.app'
      },
      license: {
        name: 'Proprietary',
        url:  'https://ecosphere.app/terms'
      }
    },
    servers: [
      { url: 'http://localhost:5000/api/v1',          description: 'Development' },
      { url: 'https://api.ecosphere.app/api/v1',      description: 'Production' }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type:         'http',
          scheme:       'bearer',
          bearerFormat: 'JWT',
          description:  'Enter JWT access token obtained from POST /auth/login'
        }
      },
      schemas: {
        /* ── Auth ── */
        LoginRequest: {
          type: 'object', required: ['email','password'],
          properties: {
            email:    { type: 'string', format: 'email', example: 'admin@acmeplastics.com' },
            password: { type: 'string', minLength: 8,    example: 'SecurePass@123' }
          }
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success:      { type: 'boolean' },
            user:         { $ref: '#/components/schemas/UserSafe' },
            accessToken:  { type: 'string' },
            refreshToken: { type: 'string' },
            expiresIn:    { type: 'string', example: '15m' }
          }
        },
        UserSafe: {
          type: 'object',
          properties: {
            id:       { type: 'string', format: 'uuid' },
            email:    { type: 'string', format: 'email' },
            firstName:{ type: 'string' },
            lastName: { type: 'string' },
            role:     { type: 'string', enum: ['SUPER_ADMIN','ORG_ADMIN','ORG_ANALYST','ORG_ENGINEER','ORG_PRODUCTION_HEAD','ORG_QUALITY_HEAD','ORG_HR_HEAD','LAB_ADMIN','LAB_ANALYST','LAB_SENIOR_REVIEWER','LAB_QUALITY_MANAGER','REG_OFFICER','REG_INSPECTOR','REG_REGIONAL_OFFICER','REG_GOVERNMENT_AUTHORITY','CONSULTANT','AUDITOR'] },
            orgId:    { type: 'string', format: 'uuid', nullable: true },
            labId:    { type: 'string', format: 'uuid', nullable: true }
          }
        },
        /* ── Monitoring ── */
        MonitoringRecord: {
          type: 'object',
          properties: {
            id:               { type: 'string', format: 'uuid' },
            monitoringType:   { type: 'string', enum: ['AIR','WATER','NOISE','SOIL','STACK_EMISSION','GROUNDWATER','METEOROLOGICAL','WASTE','ETP','STP'] },
            recordingDate:    { type: 'string', format: 'date-time' },
            parameters:       { type: 'object', description: 'Key-value parameter readings' },
            complianceStatus: { type: 'string', enum: ['COMPLIANT','MARGINAL','NON_COMPLIANT','UNDER_REVIEW'] },
            violationsCount:  { type: 'integer' },
            aiAnalysis:       { type: 'string', nullable: true }
          }
        },
        /* ── Report ── */
        Report: {
          type: 'object',
          properties: {
            id:             { type: 'string', format: 'uuid' },
            reportNumber:   { type: 'string', example: 'RPT-2025-0001' },
            title:          { type: 'string' },
            status:         { type: 'string' },
            esgScore:       { type: 'number', nullable: true },
            complianceScore:{ type: 'number', nullable: true },
            totalCarbon:    { type: 'number', nullable: true }
          }
        },
        /* ── Certificate ── */
        Certificate: {
          type: 'object',
          properties: {
            id:                { type: 'string', format: 'uuid' },
            certificateNumber: { type: 'string', example: 'ECC-2025-00001' },
            certificateType:   { type: 'string' },
            issuedDate:        { type: 'string', format: 'date-time' },
            expiryDate:        { type: 'string', format: 'date-time' },
            status:            { type: 'string', enum: ['ACTIVE','EXPIRED','REVOKED'] },
            verificationUrl:   { type: 'string', format: 'uri' }
          }
        },
        /* ── Pagination ── */
        PaginatedResponse: {
          type: 'object',
          properties: {
            success:    { type: 'boolean' },
            data:       { type: 'array', items: {} },
            pagination: {
              type: 'object',
              properties: {
                page:        { type: 'integer' },
                limit:       { type: 'integer' },
                total:       { type: 'integer' },
                totalPages:  { type: 'integer' },
                hasNext:     { type: 'boolean' },
                hasPrevious: { type: 'boolean' }
              }
            }
          }
        },
        /* ── Error ── */
        ErrorResponse: {
          type: 'object',
          properties: {
            success:   { type: 'boolean', example: false },
            message:   { type: 'string' },
            code:      { type: 'string' },
            requestId: { type: 'string' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth',          description: 'Authentication & authorization' },
      { name: 'Monitoring',    description: 'Environmental monitoring stations & records' },
      { name: 'Reports',       description: 'Compliance report management' },
      { name: 'Laboratory',    description: 'Lab review & approval workflow' },
      { name: 'Regulatory',    description: 'Regulatory authority approvals & enforcement' },
      { name: 'Organizations', description: 'Organization management & onboarding' },
      { name: 'Certificates',  description: 'Environmental compliance certificates' },
      { name: 'Notifications', description: 'In-app & push notifications' },
      { name: 'EcoBot',        description: 'AI environmental compliance assistant' },
      { name: 'Billing',       description: 'Subscription & payment management' },
      { name: 'IoT',           description: 'IoT device integration' },
      { name: 'Admin',         description: 'Super Admin global governance' }
    ]
  },
  apis: ['./src/routes/**/*.js', './src/controllers/**/*.js']
};

module.exports = swaggerJsdoc(options);
