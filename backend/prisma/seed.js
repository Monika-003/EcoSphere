'use strict';

/**
 * EcoSphere — Database Seed
 * Generic demo data — works for ANY industry type.
 * Run: npx prisma db seed   (from backend/)
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

/* ── Password hasher ── */
const h = (pw) => bcrypt.hash(pw, 12);

async function main() {
  console.log('\n🌱  EcoSphere — seeding database...\n');

  /* ════════════════════════════════════════════════════
     1. SUPER ADMIN
  ════════════════════════════════════════════════════ */
  await prisma.user.upsert({
    where:  { email: 'superadmin@ecosphere.app' },
    update: {},
    create: {
      email:           'superadmin@ecosphere.app',
      passwordHash:    await h('SuperAdmin@123'),
      firstName:       'Super',
      lastName:        'Admin',
      role:            'SUPER_ADMIN',
      isActive:        true,
      isEmailVerified: true
    }
  });

  /* ════════════════════════════════════════════════════
     2. GENERIC DEMO ORGANIZATION
     (represents ANY industry — plastics, pharma, textile, etc.)
  ════════════════════════════════════════════════════ */
  const org = await prisma.organization.upsert({
    where:  { registrationNumber: 'DEMO-IND-2024-00001' },
    update: {},
    create: {
      name:               'EcoSphere Demo Industry Pvt. Ltd.',
      industryType:       'MANUFACTURING',
      registrationNumber: 'DEMO-IND-2024-00001',
      gstNumber:          '27AADCE1234F1Z9',
      panNumber:          'AADCE1234F',
      address:            'MIDC Industrial Area, Plot No. 101',
      city:               'Pune',
      state:              'Maharashtra',
      pincode:            '411019',
      country:            'India',
      contactName:        'Demo Admin',
      contactEmail:       'org.admin@ecosphere.app',
      contactPhone:       '+91-9000000001',
      isVerified:         true,
      verifiedAt:         new Date()
    }
  });

  /* ── Organization Users (8 roles) ── */
  const orgUsers = [
    {
      email:     'org.admin@ecosphere.app',
      password:  'Admin@1234',
      firstName: 'Org',
      lastName:  'Admin',
      role:      'ORG_ADMIN',
      label:     'Organization Admin'
    },
    {
      email:     'env.officer@ecosphere.app',
      password:  'EnvOfficer@1234',
      firstName: 'Environmental',
      lastName:  'Officer',
      role:      'ORG_ANALYST',
      label:     'Environmental Officer'
    },
    {
      email:     'env.engineer@ecosphere.app',
      password:  'EnvEngineer@1234',
      firstName: 'Environmental',
      lastName:  'Engineer',
      role:      'ORG_ENGINEER',
      label:     'Environmental Engineer'
    },
    {
      email:     'production.head@ecosphere.app',
      password:  'ProdHead@1234',
      firstName: 'Production',
      lastName:  'Head',
      role:      'ORG_PRODUCTION_HEAD',
      label:     'Production Head'
    },
    {
      email:     'quality.head@ecosphere.app',
      password:  'QualityHead@1234',
      firstName: 'Quality',
      lastName:  'Head',
      role:      'ORG_QUALITY_HEAD',
      label:     'Quality Head'
    },
    {
      email:     'hr.head@ecosphere.app',
      password:  'HRHead@1234',
      firstName: 'HR',
      lastName:  'Head',
      role:      'ORG_HR_HEAD',
      label:     'HR Head'
    },
    {
      email:     'purchase.head@ecosphere.app',
      password:  'PurchaseHead@1234',
      firstName: 'Purchase',
      lastName:  'Head',
      role:      'ORG_PURCHASE_HEAD',
      label:     'Purchase Head'
    },
    {
      email:     'maintenance.head@ecosphere.app',
      password:  'MaintHead@1234',
      firstName: 'Maintenance',
      lastName:  'Head',
      role:      'ORG_MAINTENANCE_HEAD',
      label:     'Maintenance Head'
    }
  ];

  for (const u of orgUsers) {
    await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: {
        email:           u.email,
        passwordHash:    await h(u.password),
        firstName:       u.firstName,
        lastName:        u.lastName,
        role:            u.role,
        orgId:           org.id,
        isActive:        true,
        isEmailVerified: true
      }
    });
  }

  /* ── Subscription ── */
  await prisma.subscription.upsert({
    where:  { organizationId: org.id },
    update: {},
    create: {
      organizationId: org.id,
      plan:           'PROFESSIONAL',
      status:         'ACTIVE',
      startDate:      new Date(),
      endDate:        new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      amount:         14999
    }
  });

  /* ════════════════════════════════════════════════════
     3. GENERIC DEMO LABORATORY
  ════════════════════════════════════════════════════ */
  const lab = await prisma.laboratory.upsert({
    where:  { nablAccreditationNo: 'NABL-DEMO-0001' },
    update: {},
    create: {
      name:                'EcoSphere Demo Laboratory Pvt. Ltd.',
      nablAccreditationNo: 'NABL-DEMO-0001',
      accreditationExpiry: new Date('2027-12-31'),
      address:             'Lab Complex, Sector 10',
      city:                'Navi Mumbai',
      state:               'Maharashtra',
      pincode:             '400703',
      contactEmail:        'lab.admin@ecosphere.app',
      contactPhone:        '+91-9000000010',
      capabilities:        ['AIR','WATER','NOISE','SOIL','GROUNDWATER','ETP','STP','STACK_EMISSION'],
      isActive:            true,
      isNablAccredited:    true
    }
  });

  /* ── Laboratory Users (4 roles) ── */
  const labUsers = [
    {
      email:     'lab.admin@ecosphere.app',
      password:  'LabAdmin@1234',
      firstName: 'Lab',
      lastName:  'Admin',
      role:      'LAB_ADMIN',
      label:     'Lab Admin'
    },
    {
      email:     'lab.analyst@ecosphere.app',
      password:  'LabAnalyst@1234',
      firstName: 'Lab',
      lastName:  'Analyst',
      role:      'LAB_ANALYST',
      label:     'Lab Analyst'
    },
    {
      email:     'lab.reviewer@ecosphere.app',
      password:  'LabReviewer@1234',
      firstName: 'Senior',
      lastName:  'Reviewer',
      role:      'LAB_SENIOR_REVIEWER',
      label:     'Senior Reviewer'
    },
    {
      email:     'lab.quality@ecosphere.app',
      password:  'LabQuality@1234',
      firstName: 'Quality',
      lastName:  'Manager',
      role:      'LAB_QUALITY_MANAGER',
      label:     'Lab Quality Manager'
    }
  ];

  for (const u of labUsers) {
    await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: {
        email:           u.email,
        passwordHash:    await h(u.password),
        firstName:       u.firstName,
        lastName:        u.lastName,
        role:            u.role,
        labId:           lab.id,
        isActive:        true,
        isEmailVerified: true
      }
    });
  }

  /* ════════════════════════════════════════════════════
     4. GENERIC DEMO REGULATORY AUTHORITY
  ════════════════════════════════════════════════════ */
  const authority = await prisma.regulatoryAuthority.upsert({
    where:  { name: 'EcoSphere Demo Pollution Control Board' },
    update: {},
    create: {
      name:          'EcoSphere Demo Pollution Control Board',
      shortName:     'EDPCB',
      authorityType: 'STATE_PCB',
      jurisdiction:  'Maharashtra',
      address:       'Demo Authority Building, Sector 1',
      city:          'Mumbai',
      state:         'Maharashtra',
      pincode:       '400001',
      contactEmail:  'reg.officer@ecosphere.app',
      contactPhone:  '+91-9000000020',
      isActive:      true
    }
  });

  /* ── Regulatory Users (4 roles) ── */
  const regUsers = [
    {
      email:     'reg.officer@ecosphere.app',
      password:  'RegOfficer@1234',
      firstName: 'Regulatory',
      lastName:  'Officer',
      role:      'REG_OFFICER',
      label:     'Regulatory Officer'
    },
    {
      email:     'reg.inspector@ecosphere.app',
      password:  'RegInspector@1234',
      firstName: 'Field',
      lastName:  'Inspector',
      role:      'REG_INSPECTOR',
      label:     'Inspector'
    },
    {
      email:     'reg.regional@ecosphere.app',
      password:  'RegRegional@1234',
      firstName: 'Regional',
      lastName:  'Officer',
      role:      'REG_REGIONAL_OFFICER',
      label:     'Regional Officer'
    },
    {
      email:     'reg.govt@ecosphere.app',
      password:  'RegGovt@1234',
      firstName: 'Government',
      lastName:  'Authority',
      role:      'REG_GOVERNMENT_AUTHORITY',
      label:     'Government Authority'
    }
  ];

  for (const u of regUsers) {
    await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: {
        email:           u.email,
        passwordHash:    await h(u.password),
        firstName:       u.firstName,
        lastName:        u.lastName,
        role:            u.role,
        authorityId:     authority.id,
        isActive:        true,
        isEmailVerified: true
      }
    });
  }

  /* ════════════════════════════════════════════════════
     5. MONITORING STATIONS (attached to demo org)
  ════════════════════════════════════════════════════ */
  const stations = await Promise.all([
    prisma.monitoringStation.upsert({
      where:  { stationCode: 'DEMO-AIR-001' },
      update: {},
      create: {
        organizationId: org.id,
        name:           'Stack Emission Monitor — Unit 1',
        monitoringType: 'STACK_EMISSION',
        deviceType:     'CEMS',
        stationCode:    'DEMO-AIR-001',
        latitude:       18.5204,
        longitude:      73.8567,
        locationDesc:   'Main production floor, Unit 1',
        isActive:       true
      }
    }),
    prisma.monitoringStation.upsert({
      where:  { stationCode: 'DEMO-ETP-001' },
      update: {},
      create: {
        organizationId: org.id,
        name:           'ETP Outlet Effluent Monitor',
        monitoringType: 'ETP',
        deviceType:     'WQMS',
        stationCode:    'DEMO-ETP-001',
        latitude:       18.5196,
        longitude:      73.8572,
        locationDesc:   'ETP Plant outlet',
        isActive:       true
      }
    }),
    prisma.monitoringStation.upsert({
      where:  { stationCode: 'DEMO-NOISE-001' },
      update: {},
      create: {
        organizationId: org.id,
        name:           'Ambient Noise Monitor — Boundary',
        monitoringType: 'NOISE',
        stationCode:    'DEMO-NOISE-001',
        latitude:       18.5210,
        longitude:      73.8580,
        locationDesc:   'Northern boundary wall',
        isActive:       true
      }
    })
  ]);

  /* ── Sample monitoring records ── */
  const analyst = await prisma.user.findUnique({ where: { email: 'env.officer@ecosphere.app' } });
  await Promise.all([
    prisma.monitoringRecord.create({
      data: {
        organizationId: org.id,
        stationId:      stations[0].id,
        submittedById:  analyst.id,
        monitoringType: 'STACK_EMISSION',
        recordingDate:  new Date('2025-06-01T09:00:00Z'),
        shift:          'MORNING',
        location:       'Production Unit 1',
        samplingMethod: 'CEMS_CONTINUOUS',
        sourceType:     'IOT_SENSOR',
        parameters:     { SO2: 65, NOx: 120, PM10: 82, CO: 1800, temperature: 165 },
        complianceStatus: 'COMPLIANT',
        violationsCount:  0,
        isDraft: false
      }
    }),
    prisma.monitoringRecord.create({
      data: {
        organizationId: org.id,
        stationId:      stations[1].id,
        submittedById:  analyst.id,
        monitoringType: 'ETP',
        recordingDate:  new Date('2025-06-01T11:00:00Z'),
        shift:          'MORNING',
        location:       'ETP Outlet',
        samplingMethod: 'GRAB_SAMPLE',
        sourceType:     'MANUAL',
        parameters:     { pH: 7.2, BOD: 28, COD: 210, TSS: 85, TDS: 1800 },
        complianceStatus: 'COMPLIANT',
        violationsCount:  0,
        isDraft: false
      }
    })
  ]);

  /* ════════════════════════════════════════════════════
     6. SYSTEM CONFIG
  ════════════════════════════════════════════════════ */
  const configs = [
    { key: 'PLATFORM_NAME',               value: 'EcoSphere',  description: 'Platform display name' },
    { key: 'ENABLE_AI_ANALYSIS',          value: 'true',       description: 'Enable OpenAI-powered analysis' },
    { key: 'MAX_FILE_SIZE_MB',            value: '50',         description: 'Maximum file upload size in MB' },
    { key: 'SESSION_TIMEOUT_MINUTES',     value: '60',         description: 'User session timeout' },
    { key: 'CERT_VALIDITY_MONTHS',        value: '12',         description: 'Default certificate validity period' },
    { key: 'ALERT_THRESHOLD_VIOLATIONS',  value: '3',          description: 'Violations count to trigger critical alert' }
  ];
  for (const c of configs) {
    await prisma.systemConfig.upsert({ where: { key: c.key }, update: {}, create: c });
  }

  /* ════════════════════════════════════════════════════
     PRINT CREDENTIAL TABLE
  ════════════════════════════════════════════════════ */
  const pad = (s, n) => String(s).padEnd(n);

  console.log('\n🎉  Seed complete!\n');

  console.log('╔══════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                          ECOSPHERE  LOGIN  CREDENTIALS                          ║');
  console.log('╠══════════════════════════════════════════════════════════════════════════════════╣');

  console.log('║  🏢  ORGANIZATION PORTAL  (/org-portal.html)                                    ║');
  console.log('╠══════════════════╦══════════════════════════════════╦═══════════════════════════╣');
  console.log('║  Role            ║  Email                           ║  Password                 ║');
  console.log('╠══════════════════╬══════════════════════════════════╬═══════════════════════════╣');
  for (const u of orgUsers) {
    console.log(`║  ${pad(u.label,16)}║  ${pad(u.email,32)}║  ${pad(u.password,25)}║`);
  }

  console.log('╠══════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║  🔬  LABORATORY PORTAL  (/lab-portal.html)                                      ║');
  console.log('╠══════════════════╦══════════════════════════════════╦═══════════════════════════╣');
  console.log('║  Role            ║  Email                           ║  Password                 ║');
  console.log('╠══════════════════╬══════════════════════════════════╬═══════════════════════════╣');
  for (const u of labUsers) {
    console.log(`║  ${pad(u.label,16)}║  ${pad(u.email,32)}║  ${pad(u.password,25)}║`);
  }

  console.log('╠══════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║  🏛️   REGULATORY PORTAL  (/reg-portal.html)                                     ║');
  console.log('╠══════════════════╦══════════════════════════════════╦═══════════════════════════╣');
  console.log('║  Role            ║  Email                           ║  Password                 ║');
  console.log('╠══════════════════╬══════════════════════════════════╬═══════════════════════════╣');
  for (const u of regUsers) {
    console.log(`║  ${pad(u.label,16)}║  ${pad(u.email,32)}║  ${pad(u.password,25)}║`);
  }

  console.log('╠══════════════════════════════════════════════════════════════════════════════════╣');
  console.log('║  ⚙️   SUPER ADMIN                                                                ║');
  console.log('╠══════════════════╦══════════════════════════════════╦═══════════════════════════╣');
  console.log(`║  ${pad('Super Admin',16)}║  ${pad('superadmin@ecosphere.app',32)}║  ${pad('SuperAdmin@123',25)}║`);
  console.log('╚══════════════════╩══════════════════════════════════╩═══════════════════════════╝');
  console.log();
}

main()
  .catch(e => { console.error('❌ Seed error:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
