// src/utils/seed.js — Database Seed Script
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
require("dotenv").config({ path: path.join(__dirname, "../../../.env") });
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { startDbProxy } = require("./dbProxy");

const defaultPrisma = new PrismaClient();

const STATES = [
  { name: "FCT Abuja",    slug: "fct-abuja",    code: "FCT" },
  { name: "Abia",         slug: "abia",          code: "AB"  },
  { name: "Adamawa",      slug: "adamawa",       code: "AD"  },
  { name: "Akwa Ibom",    slug: "akwa-ibom",     code: "AK"  },
  { name: "Anambra",      slug: "anambra",       code: "AN"  },
  { name: "Bauchi",       slug: "bauchi",        code: "BA"  },
  { name: "Bayelsa",      slug: "bayelsa",       code: "BY"  },
  { name: "Benue",        slug: "benue",         code: "BE"  },
  { name: "Borno",        slug: "borno",         code: "BO"  },
  { name: "Cross River",  slug: "cross-river",   code: "CR"  },
  { name: "Delta",        slug: "delta",         code: "DE"  },
  { name: "Ebonyi",       slug: "ebonyi",        code: "EB"  },
  { name: "Edo",          slug: "edo",           code: "ED"  },
  { name: "Ekiti",        slug: "ekiti",         code: "EK"  },
  { name: "Enugu",        slug: "enugu",         code: "EN"  },
  { name: "Gombe",        slug: "gombe",         code: "GO"  },
  { name: "Imo",          slug: "imo",           code: "IM"  },
  { name: "Jigawa",       slug: "jigawa",        code: "JI"  },
  { name: "Kaduna",       slug: "kaduna",        code: "KD"  },
  { name: "Kano",         slug: "kano",          code: "KN"  },
  { name: "Katsina",      slug: "katsina",       code: "KT"  },
  { name: "Kebbi",        slug: "kebbi",         code: "KB"  },
  { name: "Kogi",         slug: "kogi",          code: "KO"  },
  { name: "Kwara",        slug: "kwara",         code: "KW"  },
  { name: "Lagos",        slug: "lagos",         code: "LA"  },
  { name: "Nasarawa",     slug: "nasarawa",      code: "NA"  },
  { name: "Niger",        slug: "niger",         code: "NI"  },
  { name: "Ogun",         slug: "ogun",          code: "OG"  },
  { name: "Ondo",         slug: "ondo",          code: "ON"  },
  { name: "Osun",         slug: "osun",          code: "OS"  },
  { name: "Oyo",          slug: "oyo",           code: "OY"  },
  { name: "Plateau",      slug: "plateau",       code: "PL"  },
  { name: "Rivers",       slug: "rivers",        code: "RI"  },
  { name: "Sokoto",       slug: "sokoto",        code: "SO"  },
  { name: "Taraba",       slug: "taraba",        code: "TA"  },
  { name: "Yobe",         slug: "yobe",          code: "YO"  },
  { name: "Zamfara",      slug: "zamfara",       code: "ZA"  },
];

const DEPARTMENTS = [
  { name: "Operations",              slug: "operations",            description: "Mail processing, logistics, and delivery" },
  { name: "Human Resources",         slug: "human-resources",       description: "Staff welfare, recruitment, and development" },
  { name: "Finance & Accounts",      slug: "finance-accounts",      description: "Budget, payroll, and financial reporting" },
  { name: "ICT",                     slug: "ict",                   description: "IT infrastructure, systems, and cybersecurity" },
  { name: "Legal Services",          slug: "legal-services",        description: "Legal advisory and compliance" },
  { name: "Corporate Communications",slug: "corporate-comms",       description: "Public relations and internal communications" },
  { name: "Internal Audit",          slug: "internal-audit",        description: "Compliance auditing and risk management" },
  { name: "Procurement",             slug: "procurement",           description: "Vendor management and supply chain" },
  { name: "Customer Service",        slug: "customer-service",      description: "Customer enquiries and complaint resolution" },
  { name: "Executive Office",        slug: "executive-office",      description: "PMG office and executive support" },
];

async function seedDatabase(prisma = defaultPrisma) {
  console.log("🌱 Seeding NiPOST Connect database...\n");

  // ── States ─────────────────────────────────────────────────────────────────
  console.log("📍 Seeding 37 states...");
  const stateRecords = {};
  for (const s of STATES) {
    const state = await prisma.state.upsert({
      where: { slug: s.slug },
      update: {},
      create: s,
    });
    stateRecords[s.slug] = state;
  }
  console.log(`   ✅ ${STATES.length} states seeded`);

  // ── Departments ────────────────────────────────────────────────────────────
  console.log("🏢 Seeding departments...");
  const deptRecords = {};
  for (const d of DEPARTMENTS) {
    const dept = await prisma.department.upsert({
      where: { slug: d.slug },
      update: {},
      create: d,
    });
    deptRecords[d.slug] = dept;
  }
  console.log(`   ✅ ${DEPARTMENTS.length} departments seeded`);

  // ── Super Admin ────────────────────────────────────────────────────────────
  console.log("👤 Creating Super Admin...");
  const passwordHash = process.env.SEED_ADMIN_PASSWORD
    ? await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD, 12)
    : null;

  const superAdmin = await prisma.user.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL || "pmg@nipost.gov.ng" },
    update: {
      ...(passwordHash ? { passwordHash } : {}),
      name:         process.env.SEED_ADMIN_NAME    || "Postmaster General",
      staffId:      process.env.SEED_ADMIN_STAFF_ID || "NPS/HQ/2024/001",
    },
    create: {
      name:         process.env.SEED_ADMIN_NAME    || "Postmaster General",
      staffId:      process.env.SEED_ADMIN_STAFF_ID || "NPS/HQ/2024/001",
      email:        process.env.SEED_ADMIN_EMAIL   || "pmg@nipost.gov.ng",
      passwordHash: passwordHash || await bcrypt.hash("ChangeMeImmediately!", 12),
      role:         "SUPER_ADMIN",
      status:       "ACTIVE",
      departmentId: deptRecords["executive-office"].id,
      stateId:      stateRecords["fct-abuja"].id,
    },
  });
  console.log(`   ✅ Super Admin: ${superAdmin.email}`);

  // ── Core Channels ─────────────────────────────────────────────────────────
  console.log("📢 Creating core channels...");

  // 1. General Announcements (read-only, all staff)
  const announcementChannel = await prisma.channel.upsert({
    where: { slug: "general-announcements" },
    update: {},
    create: {
      name: "general-announcements",
      slug: "general-announcements",
      type: "ANNOUNCEMENT",
      description: "Official NiPOST announcements — visible to all staff nationwide",
      isLocked: false,
      isReadOnly: true,
      createdById: superAdmin.id,
    },
  });

  // 2. Suggestion Box
  await prisma.channel.upsert({
    where: { slug: "suggestion-box" },
    update: {},
    create: {
      name: "suggestion-box",
      slug: "suggestion-box",
      type: "SUGGESTION",
      description: "Submit suggestions anonymously or publicly",
      isLocked: false,
      isReadOnly: false,
      createdById: superAdmin.id,
    },
  });

  // 3. Polls & Decisions
  await prisma.channel.upsert({
    where: { slug: "polls-decisions" },
    update: {},
    create: {
      name: "polls-decisions",
      slug: "polls-decisions",
      type: "GENERAL",
      description: "Organisation-wide polls and decision votes",
      isLocked: false,
      isReadOnly: false,
      createdById: superAdmin.id,
    },
  });

  // 4. Emergency Broadcast
  await prisma.channel.upsert({
    where: { slug: "emergency-broadcast" },
    update: {},
    create: {
      name: "emergency-broadcast",
      slug: "emergency-broadcast",
      type: "EMERGENCY",
      description: "Emergency and critical broadcasts — Super Admin only",
      isLocked: false,
      isReadOnly: true,
      createdById: superAdmin.id,
    },
  });

  // 5. State Channels (37)
  console.log("📍 Creating state channels...");
  for (const [slug, state] of Object.entries(stateRecords)) {
    await prisma.channel.upsert({
      where: { slug: `state-${slug}` },
      update: {},
      create: {
        name: `${state.name.toLowerCase().replace(/ /g, "-")}-state`,
        slug: `state-${slug}`,
        type: "STATE",
        description: `${state.name} State — all post offices and regional staff`,
        isLocked: false,
        isReadOnly: false,
        stateId: state.id,
        createdById: superAdmin.id,
      },
    });
  }
  console.log(`   ✅ 37 state channels created`);

  // 6. Department Channels
  console.log("🏢 Creating department channels...");
  for (const [slug, dept] of Object.entries(deptRecords)) {
    await prisma.channel.upsert({
      where: { slug: `dept-${slug}` },
      update: {},
      create: {
        name: `${slug}-dept`,
        slug: `dept-${slug}`,
        type: "DEPARTMENT",
        description: dept.description,
        isLocked: false,
        isReadOnly: false,
        departmentId: dept.id,
        createdById: superAdmin.id,
      },
    });
  }
  console.log(`   ✅ ${DEPARTMENTS.length} department channels created`);

  // ── Add super admin to all channels ───────────────────────────────────────
  const allChannels = await prisma.channel.findMany();
  for (const ch of allChannels) {
    await prisma.channelMember.upsert({
      where: { userId_channelId: { userId: superAdmin.id, channelId: ch.id } },
      update: {},
      create: { userId: superAdmin.id, channelId: ch.id, isAdmin: true },
    });
  }

  // ── Welcome message ────────────────────────────────────────────────────────
  const existingWelcome = await prisma.message.findFirst({
    where: { channelId: announcementChannel.id, type: "ANNOUNCEMENT" },
  });

  if (!existingWelcome) {
    await prisma.message.create({
      data: {
        content: "Welcome to NiPOST Connect — the official internal communication platform for all Nigerian Postal Service staff nationwide.\n\nThis platform is your central hub for official announcements, memos, state updates, departmental communications, and staff collaboration across all 37 states and 774 post offices.\n\nAll staff are expected to maintain professional conduct in line with NiPOST's Code of Conduct at all times.",
        type: "ANNOUNCEMENT",
        channelId: announcementChannel.id,
        authorId: superAdmin.id,
      },
    });
  }

  console.log("\n🟡 Seed completed successfully!");
  console.log("─────────────────────────────────────");
  console.log(`   Super Admin email    : ${superAdmin.email}`);
  console.log(`   Super Admin password : (value of SEED_ADMIN_PASSWORD)`);
  console.log(`   States seeded        : ${STATES.length}`);
  console.log(`   Departments seeded   : ${DEPARTMENTS.length}`);
  console.log(`   Channels created     : ${allChannels.length}`);
  console.log("─────────────────────────────────────\n");
}

let seedPromise = null;
async function ensureSeeded(prisma = defaultPrisma) {
  if (seedPromise) return seedPromise;
  seedPromise = (async () => {
    try {
      const [stateCount, deptCount] = await Promise.all([
        prisma.state.count(),
        prisma.department.count(),
      ]);
      if (stateCount < STATES.length || deptCount < DEPARTMENTS.length) {
        await seedDatabase(prisma);
      }
    } catch (err) {
      console.error("[AutoSeed] Error checking/seeding database:", err.message);
    } finally {
      seedPromise = null;
    }
  })();
  return seedPromise;
}

if (require.main === module) {
  (async () => {
    try {
      if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes("127.0.0.1:5433")) {
        await startDbProxy();
      }
      await seedDatabase(defaultPrisma);
    } catch (e) {
      console.error("❌ Seed failed:", e);
      process.exit(1);
    } finally {
      await defaultPrisma.$disconnect();
      process.exit(0);
    }
  })();
}

module.exports = { seedDatabase, ensureSeeded, STATES, DEPARTMENTS };
