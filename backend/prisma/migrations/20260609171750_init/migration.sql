-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'ORG_ADMIN', 'ORG_ANALYST', 'ORG_ENGINEER', 'ORG_PRODUCTION_HEAD', 'ORG_QUALITY_HEAD', 'ORG_HR_HEAD', 'ORG_PURCHASE_HEAD', 'ORG_MAINTENANCE_HEAD', 'LAB_ADMIN', 'LAB_ANALYST', 'LAB_SENIOR_REVIEWER', 'LAB_QUALITY_MANAGER', 'REG_OFFICER', 'REG_INSPECTOR', 'REG_REGIONAL_OFFICER', 'REG_GOVERNMENT_AUTHORITY', 'CONSULTANT', 'AUDITOR');

-- CreateEnum
CREATE TYPE "EntityStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('ENVIRONMENTAL_MONITORING', 'ESG_REPORT', 'CARBON_EMISSION', 'SUSTAINABILITY', 'ISO14001_COMPLIANCE', 'EIA_REPORT', 'WATER_AUDIT', 'ENERGY_AUDIT', 'WASTE_AUDIT', 'ANNUAL_ENVIRONMENTAL');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'SUBMITTED_TO_LAB', 'LAB_UNDER_REVIEW', 'LAB_CORRECTION_REQUESTED', 'LAB_APPROVED', 'LAB_REJECTED', 'SUBMITTED_TO_REGULATORY', 'REG_UNDER_REVIEW', 'REG_CORRECTION_REQUESTED', 'REG_APPROVED', 'REG_REJECTED', 'CERTIFIED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkflowStage" AS ENUM ('ORGANIZATION', 'LABORATORY', 'REGULATORY', 'COMPLETED');

-- CreateEnum
CREATE TYPE "CertificateType" AS ENUM ('ENVIRONMENTAL_COMPLIANCE', 'ESG_CERTIFICATION', 'SUSTAINABILITY', 'CARBON_VERIFICATION', 'ISO14001', 'WATER_QUALITY', 'AIR_QUALITY', 'NOISE_COMPLIANCE');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('EMAIL', 'SMS', 'WHATSAPP', 'PUSH', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'READ');

-- CreateEnum
CREATE TYPE "MonitoringType" AS ENUM ('AIR', 'WATER', 'NOISE', 'SOIL', 'TEMPERATURE', 'HUMIDITY', 'WASTE', 'STACK_EMISSION', 'GROUNDWATER', 'METEOROLOGICAL', 'ETP', 'STP');

-- CreateEnum
CREATE TYPE "ComplianceStatus" AS ENUM ('COMPLIANT', 'NON_COMPLIANT', 'MARGINAL', 'BORDERLINE', 'UNDER_REVIEW');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('BASIC', 'PROFESSIONAL', 'ENTERPRISE', 'GOVERNMENT');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'TRIAL', 'EXPIRED', 'CANCELLED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'SUCCESS', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DeviceType" AS ENUM ('IOT_SENSOR', 'AUTOMATED_ANALYSER', 'CEMS', 'WQMS', 'NEMS', 'MANUAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'SUBMIT', 'APPROVE', 'REJECT', 'REVOKE', 'VERIFY', 'DOWNLOAD', 'UPLOAD', 'DEACTIVATE', 'BROADCAST', 'PAYMENT', 'CERTIFICATE_ISSUED', 'NOTICE_ISSUED', 'WORKFLOW_ADVANCE', 'AI_QUERY', 'PASSWORD_CHANGE', 'PERMISSION_CHANGE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "avatar" TEXT,
    "role" "UserRole" NOT NULL,
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "isPhoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "isMfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecret" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "passwordChangedAt" TIMESTAMP(3),
    "failedLoginCount" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orgId" TEXT,
    "labId" TEXT,
    "authorityId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registrationNumber" TEXT NOT NULL,
    "gstNumber" TEXT,
    "industryType" TEXT NOT NULL,
    "establishmentYear" INTEGER,
    "employeeCount" INTEGER,
    "annualRevenue" DECIMAL(15,2),
    "website" TEXT,
    "sustainabilityGoals" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "state" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "postalCode" TEXT,
    "facilityType" TEXT,
    "gpsLatitude" DECIMAL(10,8),
    "gpsLongitude" DECIMAL(11,8),
    "airEmissionSources" TEXT[],
    "waterSources" TEXT[],
    "annualCarbonTonne" DECIMAL(15,2),
    "solidWasteTonne" DECIMAL(15,2),
    "hazardousWasteKg" DECIMAL(15,2),
    "waterConsumptionKl" DECIMAL(15,2),
    "existingCerts" TEXT[],
    "headName" TEXT,
    "headDesignation" TEXT,
    "headEmail" TEXT,
    "headPhone" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "panNumber" TEXT,
    "pincode" TEXT,
    "regCertificateKey" TEXT,
    "gstCertificateKey" TEXT,
    "envClearanceKey" TEXT,
    "ctoDocumentKey" TEXT,
    "documents" JSONB,
    "certifications" TEXT[],
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "laboratories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accreditationNumber" TEXT,
    "nablAccreditationNo" TEXT,
    "accreditationExpiry" TIMESTAMP(3),
    "isNablAccredited" BOOLEAN NOT NULL DEFAULT false,
    "nablStatus" TEXT NOT NULL DEFAULT 'Pending',
    "capabilities" TEXT[],
    "iso17025Certified" BOOLEAN NOT NULL DEFAULT false,
    "laboratoryType" TEXT NOT NULL DEFAULT 'ENVIRONMENTAL',
    "foundedYear" INTEGER,
    "servicesOffered" TEXT[],
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "analystCount" INTEGER,
    "testingCapacity" INTEGER,
    "avgTurnaroundDays" INTEGER NOT NULL DEFAULT 3,
    "serviceArea" TEXT,
    "keyEquipment" TEXT,
    "labHeadName" TEXT,
    "labHeadEmail" TEXT,
    "labHeadPhone" TEXT,
    "pricingPerSample" DECIMAL(10,2),
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'India',
    "gpsLatitude" DECIMAL(10,8),
    "gpsLongitude" DECIMAL(11,8),
    "nablCertKey" TEXT,
    "iso17025CertKey" TEXT,
    "labLicenseKey" TEXT,
    "calibrationRecordsKey" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "laboratories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "regulatory_authorities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "authorityType" TEXT NOT NULL,
    "governmentLevel" TEXT NOT NULL DEFAULT 'STATE',
    "department" TEXT,
    "officialEmail" TEXT,
    "officialPhone" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "regionCovered" TEXT,
    "jurisdiction" TEXT,
    "industriesRegulated" TEXT,
    "permissions" TEXT[],
    "website" TEXT,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "officerName" TEXT,
    "officialIdNumber" TEXT,
    "authLetterKey" TEXT,
    "govIdKey" TEXT,
    "status" "EntityStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "regulatory_authorities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_stations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stationCode" TEXT NOT NULL,
    "monitoringType" "MonitoringType" NOT NULL,
    "deviceType" "DeviceType" NOT NULL DEFAULT 'MANUAL',
    "deviceId" TEXT,
    "latitude" DECIMAL(10,8),
    "longitude" DECIMAL(11,8),
    "locationDesc" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncAt" TIMESTAMP(3),
    "calibratedAt" TIMESTAMP(3),
    "calibratedBy" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_stations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monitoring_records" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "stationId" TEXT,
    "submittedById" TEXT NOT NULL,
    "monitoringType" "MonitoringType" NOT NULL,
    "recordingDate" TIMESTAMP(3) NOT NULL,
    "shift" TEXT,
    "location" TEXT,
    "samplingMethod" TEXT,
    "parameters" JSONB NOT NULL,
    "rawData" JSONB,
    "complianceStatus" "ComplianceStatus" NOT NULL DEFAULT 'UNDER_REVIEW',
    "violationsCount" INTEGER NOT NULL DEFAULT 0,
    "violations" JSONB,
    "aiAnalysis" TEXT,
    "aiRecommendations" JSONB,
    "aiScore" DECIMAL(5,2),
    "remarks" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "deviceId" TEXT,
    "deviceName" TEXT,
    "sourceType" TEXT NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monitoring_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "reportNumber" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "submittedById" TEXT NOT NULL,
    "reportType" "ReportType" NOT NULL,
    "title" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "periodStartDate" TIMESTAMP(3),
    "periodEndDate" TIMESTAMP(3),
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "currentStage" "WorkflowStage" NOT NULL DEFAULT 'ORGANIZATION',
    "esgScore" DECIMAL(5,2),
    "envScore" DECIMAL(5,2),
    "socialScore" DECIMAL(5,2),
    "govScore" DECIMAL(5,2),
    "scope1" DECIMAL(15,4),
    "scope2" DECIMAL(15,4),
    "scope3" DECIMAL(15,4),
    "totalCarbon" DECIMAL(15,4),
    "complianceScore" DECIMAL(5,2),
    "violations" JSONB,
    "documentKey" TEXT,
    "pdfKey" TEXT,
    "excelKey" TEXT,
    "attachments" JSONB,
    "aiSummary" TEXT,
    "aiRecommendations" JSONB,
    "aiRiskScore" DECIMAL(5,2),
    "notes" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "submittedToLabAt" TIMESTAMP(3),
    "labReviewStartedAt" TIMESTAMP(3),
    "labApprovedAt" TIMESTAMP(3),
    "submittedToRegAt" TIMESTAMP(3),
    "regReviewStartedAt" TIMESTAMP(3),
    "regApprovedAt" TIMESTAMP(3),
    "certifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_monitoring_records" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "monitoringRecordId" TEXT NOT NULL,

    CONSTRAINT "report_monitoring_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_reviews" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "reviewedById" TEXT NOT NULL,
    "reviewStage" "WorkflowStage" NOT NULL,
    "laboratoryId" TEXT,
    "authorityId" TEXT,
    "status" TEXT NOT NULL,
    "findings" TEXT,
    "comments" TEXT,
    "correctionNotes" TEXT,
    "technicalScore" DECIMAL(5,2),
    "complianceScore" DECIMAL(5,2),
    "samplesAnalysed" INTEGER,
    "testMethodsUsed" TEXT[],
    "labFindings" JSONB,
    "enforcementActions" JSONB,
    "noticesIssued" BOOLEAN NOT NULL DEFAULT false,
    "documentKeys" TEXT[],
    "reviewedAt" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_samples" (
    "id" TEXT NOT NULL,
    "sampleId" TEXT NOT NULL,
    "barcodeId" TEXT NOT NULL,
    "qrCode" TEXT,
    "laboratoryId" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "reportId" TEXT,
    "sampleType" TEXT NOT NULL,
    "collectionDate" TIMESTAMP(3) NOT NULL,
    "receivedDate" TIMESTAMP(3),
    "analystAssigned" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "testParameters" JSONB NOT NULL,
    "testResults" JSONB,
    "qaValidated" BOOLEAN NOT NULL DEFAULT false,
    "qaValidatedBy" TEXT,
    "qaValidatedAt" TIMESTAMP(3),
    "custody" JSONB,
    "turnaroundDays" INTEGER,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificates" (
    "id" TEXT NOT NULL,
    "certificateNumber" TEXT NOT NULL,
    "qrCode" TEXT,
    "qrCodeKey" TEXT,
    "organizationId" TEXT NOT NULL,
    "reportId" TEXT,
    "issuedById" TEXT NOT NULL,
    "issuingLabId" TEXT,
    "issuingAuthId" TEXT,
    "certificateType" "CertificateType" NOT NULL DEFAULT 'ENVIRONMENTAL_COMPLIANCE',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "issuedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3) NOT NULL,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validUntil" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "standards" TEXT[],
    "scope" TEXT,
    "complianceScore" DECIMAL(5,2),
    "esgScore" DECIMAL(5,2),
    "carbonScore" DECIMAL(5,2),
    "documentKey" TEXT,
    "pdfKey" TEXT,
    "qrCodeUrl" TEXT,
    "verificationUrl" TEXT,
    "digitalSignature" TEXT,
    "verificationHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "verificationCount" INTEGER NOT NULL DEFAULT 0,
    "lastVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_notices" (
    "id" TEXT NOT NULL,
    "noticeNumber" TEXT NOT NULL,
    "authorityId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "organizationName" TEXT NOT NULL,
    "reportId" TEXT,
    "noticeType" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "violations" JSONB,
    "penaltyAmount" DECIMAL(15,2),
    "penalty" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ISSUED',
    "issuedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responseDeadline" TIMESTAMP(3) NOT NULL,
    "responseReceived" BOOLEAN NOT NULL DEFAULT false,
    "responseDate" TIMESTAMP(3),
    "response" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "documentKey" TEXT,
    "acknowledgementKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_notices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspections" (
    "id" TEXT NOT NULL,
    "inspectionNumber" TEXT NOT NULL,
    "authorityId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "organizationName" TEXT,
    "inspectorName" TEXT,
    "inspectorId" TEXT,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "conductedDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "inspectionType" TEXT NOT NULL,
    "checklist" JSONB,
    "findings" JSONB,
    "score" DECIMAL(5,2),
    "remarks" TEXT,
    "followUpRequired" BOOLEAN NOT NULL DEFAULT false,
    "followUpDate" TIMESTAMP(3),
    "reportKey" TEXT,
    "photos" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inspections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_history" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "stage" "WorkflowStage" NOT NULL,
    "fromStatus" "ReportStatus" NOT NULL,
    "toStatus" "ReportStatus" NOT NULL,
    "action" TEXT NOT NULL,
    "comments" TEXT,
    "attachments" TEXT[],
    "metadata" JSONB,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "laboratoryId" TEXT,
    "authorityId" TEXT,
    "reportId" TEXT,
    "type" "NotificationType" NOT NULL DEFAULT 'IN_APP',
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "actionUrl" TEXT,
    "link" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "externalId" TEXT,
    "templateId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT,
    "title" TEXT,
    "sessionId" TEXT NOT NULL DEFAULT '',
    "context" TEXT,
    "tokensUsed" INTEGER NOT NULL DEFAULT 0,
    "model" TEXT NOT NULL DEFAULT 'gpt-3.5-turbo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "tokensUsed" INTEGER,
    "model" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_recommendations" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "reportId" TEXT,
    "monitoringId" TEXT,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "potentialImpact" TEXT,
    "estimatedSaving" DECIMAL(15,2),
    "carbonReduction" DECIMAL(15,4),
    "isImplemented" BOOLEAN NOT NULL DEFAULT false,
    "implementedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "laboratoryId" TEXT,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'BASIC',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "trialEndsAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "cancelledReason" TEXT,
    "amount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "monthlyAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "annualAmount" DECIMAL(10,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "gstPercentage" DECIMAL(5,2) NOT NULL DEFAULT 18.00,
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "maxMonitoringStations" INTEGER NOT NULL DEFAULT 3,
    "maxReportsPerMonth" INTEGER NOT NULL DEFAULT 10,
    "maxStorageGb" INTEGER NOT NULL DEFAULT 5,
    "razorpaySubscriptionId" TEXT,
    "razorpayCustomerId" TEXT,
    "nextBillingDate" TIMESTAMP(3),
    "lastBilledAt" TIMESTAMP(3),
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "features" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_transactions" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "organizationId" TEXT,
    "laboratoryId" TEXT,
    "userId" TEXT,
    "plan" TEXT,
    "orderId" TEXT,
    "paymentId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "gstAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "razorpayOrderId" TEXT,
    "razorpayPaymentId" TEXT,
    "razorpaySignature" TEXT,
    "invoiceNumber" TEXT,
    "invoiceKey" TEXT,
    "description" TEXT,
    "paidAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "failedReason" TEXT,
    "refundedAt" TIMESTAMP(3),
    "refundAmount" DECIMAL(10,2),
    "refundReason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "description" TEXT NOT NULL,
    "oldData" JSONB,
    "newData" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "duration" INTEGER,
    "statusCode" INTEGER,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "updatedById" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "industry_configs" (
    "id" TEXT NOT NULL,
    "industryType" TEXT NOT NULL,
    "monitoringTypes" TEXT[],
    "mandatoryParams" JSONB NOT NULL,
    "cpcbLimits" JSONB NOT NULL,
    "reportingFrequency" TEXT NOT NULL,
    "certificationTypes" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "industry_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "channel" "NotificationType" NOT NULL,
    "subject" TEXT,
    "body" TEXT NOT NULL,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_orgId_idx" ON "users"("orgId");

-- CreateIndex
CREATE INDEX "users_labId_idx" ON "users"("labId");

-- CreateIndex
CREATE INDEX "users_authorityId_idx" ON "users"("authorityId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_email_idx" ON "password_reset_tokens"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_registrationNumber_key" ON "organizations"("registrationNumber");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- CreateIndex
CREATE INDEX "organizations_industryType_idx" ON "organizations"("industryType");

-- CreateIndex
CREATE INDEX "organizations_state_idx" ON "organizations"("state");

-- CreateIndex
CREATE UNIQUE INDEX "laboratories_accreditationNumber_key" ON "laboratories"("accreditationNumber");

-- CreateIndex
CREATE UNIQUE INDEX "laboratories_nablAccreditationNo_key" ON "laboratories"("nablAccreditationNo");

-- CreateIndex
CREATE INDEX "laboratories_status_idx" ON "laboratories"("status");

-- CreateIndex
CREATE INDEX "laboratories_state_idx" ON "laboratories"("state");

-- CreateIndex
CREATE UNIQUE INDEX "regulatory_authorities_name_key" ON "regulatory_authorities"("name");

-- CreateIndex
CREATE UNIQUE INDEX "regulatory_authorities_officialEmail_key" ON "regulatory_authorities"("officialEmail");

-- CreateIndex
CREATE INDEX "regulatory_authorities_status_idx" ON "regulatory_authorities"("status");

-- CreateIndex
CREATE UNIQUE INDEX "monitoring_stations_stationCode_key" ON "monitoring_stations"("stationCode");

-- CreateIndex
CREATE INDEX "monitoring_stations_organizationId_idx" ON "monitoring_stations"("organizationId");

-- CreateIndex
CREATE INDEX "monitoring_stations_monitoringType_idx" ON "monitoring_stations"("monitoringType");

-- CreateIndex
CREATE INDEX "monitoring_stations_stationCode_idx" ON "monitoring_stations"("stationCode");

-- CreateIndex
CREATE INDEX "monitoring_records_organizationId_idx" ON "monitoring_records"("organizationId");

-- CreateIndex
CREATE INDEX "monitoring_records_monitoringType_idx" ON "monitoring_records"("monitoringType");

-- CreateIndex
CREATE INDEX "monitoring_records_recordingDate_idx" ON "monitoring_records"("recordingDate");

-- CreateIndex
CREATE INDEX "monitoring_records_complianceStatus_idx" ON "monitoring_records"("complianceStatus");

-- CreateIndex
CREATE UNIQUE INDEX "reports_reportNumber_key" ON "reports"("reportNumber");

-- CreateIndex
CREATE INDEX "reports_organizationId_idx" ON "reports"("organizationId");

-- CreateIndex
CREATE INDEX "reports_status_idx" ON "reports"("status");

-- CreateIndex
CREATE INDEX "reports_reportType_idx" ON "reports"("reportType");

-- CreateIndex
CREATE INDEX "reports_reportNumber_idx" ON "reports"("reportNumber");

-- CreateIndex
CREATE UNIQUE INDEX "report_monitoring_records_reportId_monitoringRecordId_key" ON "report_monitoring_records"("reportId", "monitoringRecordId");

-- CreateIndex
CREATE INDEX "report_reviews_reportId_idx" ON "report_reviews"("reportId");

-- CreateIndex
CREATE INDEX "report_reviews_reviewStage_idx" ON "report_reviews"("reviewStage");

-- CreateIndex
CREATE UNIQUE INDEX "lab_samples_sampleId_key" ON "lab_samples"("sampleId");

-- CreateIndex
CREATE UNIQUE INDEX "lab_samples_barcodeId_key" ON "lab_samples"("barcodeId");

-- CreateIndex
CREATE INDEX "lab_samples_laboratoryId_idx" ON "lab_samples"("laboratoryId");

-- CreateIndex
CREATE INDEX "lab_samples_status_idx" ON "lab_samples"("status");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_certificateNumber_key" ON "certificates"("certificateNumber");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_reportId_key" ON "certificates"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "certificates_verificationHash_key" ON "certificates"("verificationHash");

-- CreateIndex
CREATE INDEX "certificates_organizationId_idx" ON "certificates"("organizationId");

-- CreateIndex
CREATE INDEX "certificates_certificateType_idx" ON "certificates"("certificateType");

-- CreateIndex
CREATE INDEX "certificates_verificationHash_idx" ON "certificates"("verificationHash");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_notices_noticeNumber_key" ON "compliance_notices"("noticeNumber");

-- CreateIndex
CREATE INDEX "compliance_notices_authorityId_idx" ON "compliance_notices"("authorityId");

-- CreateIndex
CREATE INDEX "compliance_notices_organizationId_idx" ON "compliance_notices"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "inspections_inspectionNumber_key" ON "inspections"("inspectionNumber");

-- CreateIndex
CREATE INDEX "inspections_authorityId_idx" ON "inspections"("authorityId");

-- CreateIndex
CREATE INDEX "inspections_organizationId_idx" ON "inspections"("organizationId");

-- CreateIndex
CREATE INDEX "workflow_history_reportId_idx" ON "workflow_history"("reportId");

-- CreateIndex
CREATE INDEX "workflow_history_organizationId_idx" ON "workflow_history"("organizationId");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "notifications_type_idx" ON "notifications"("type");

-- CreateIndex
CREATE INDEX "notifications_status_idx" ON "notifications"("status");

-- CreateIndex
CREATE INDEX "notifications_isRead_idx" ON "notifications"("isRead");

-- CreateIndex
CREATE INDEX "ai_conversations_userId_idx" ON "ai_conversations"("userId");

-- CreateIndex
CREATE INDEX "ai_conversations_sessionId_idx" ON "ai_conversations"("sessionId");

-- CreateIndex
CREATE INDEX "ai_messages_conversationId_idx" ON "ai_messages"("conversationId");

-- CreateIndex
CREATE INDEX "ai_recommendations_organizationId_idx" ON "ai_recommendations"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_organizationId_key" ON "subscriptions"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_laboratoryId_key" ON "subscriptions"("laboratoryId");

-- CreateIndex
CREATE INDEX "subscriptions_status_idx" ON "subscriptions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "payment_transactions_invoiceNumber_key" ON "payment_transactions"("invoiceNumber");

-- CreateIndex
CREATE INDEX "payment_transactions_organizationId_idx" ON "payment_transactions"("organizationId");

-- CreateIndex
CREATE INDEX "payment_transactions_status_idx" ON "payment_transactions"("status");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_idx" ON "audit_logs"("entityType");

-- CreateIndex
CREATE INDEX "audit_logs_performedAt_idx" ON "audit_logs"("performedAt");

-- CreateIndex
CREATE UNIQUE INDEX "system_configs_key_key" ON "system_configs"("key");

-- CreateIndex
CREATE UNIQUE INDEX "industry_configs_industryType_key" ON "industry_configs"("industryType");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_templateId_key" ON "notification_templates"("templateId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_org_fkey" FOREIGN KEY ("orgId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_lab_fkey" FOREIGN KEY ("labId") REFERENCES "laboratories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_authority_fkey" FOREIGN KEY ("authorityId") REFERENCES "regulatory_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_stations" ADD CONSTRAINT "monitoring_stations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_records" ADD CONSTRAINT "monitoring_records_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_records" ADD CONSTRAINT "monitoring_records_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "monitoring_stations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monitoring_records" ADD CONSTRAINT "monitoring_records_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_monitoring_records" ADD CONSTRAINT "report_monitoring_records_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_monitoring_records" ADD CONSTRAINT "report_monitoring_records_monitoringRecordId_fkey" FOREIGN KEY ("monitoringRecordId") REFERENCES "monitoring_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_reviews" ADD CONSTRAINT "report_reviews_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_reviews" ADD CONSTRAINT "report_reviews_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_reviews" ADD CONSTRAINT "report_reviews_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_reviews" ADD CONSTRAINT "report_reviews_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "regulatory_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_samples" ADD CONSTRAINT "lab_samples_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issuingLabId_fkey" FOREIGN KEY ("issuingLabId") REFERENCES "laboratories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificates" ADD CONSTRAINT "certificates_issuingAuthId_fkey" FOREIGN KEY ("issuingAuthId") REFERENCES "regulatory_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_notices" ADD CONSTRAINT "compliance_notices_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "regulatory_authorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspections" ADD CONSTRAINT "inspections_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "regulatory_authorities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_history" ADD CONSTRAINT "workflow_history_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_authorityId_fkey" FOREIGN KEY ("authorityId") REFERENCES "regulatory_authorities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "reports"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_conversations" ADD CONSTRAINT "ai_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_messages" ADD CONSTRAINT "ai_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ai_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_laboratoryId_fkey" FOREIGN KEY ("laboratoryId") REFERENCES "laboratories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
