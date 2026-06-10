import { createApp, logger } from "./app";
import { prisma } from "./lib/prisma";
import { hashPassword } from "./lib/passwords";
import { env } from "./env";
import { THEME_TEMPLATES } from "./lib/themeTemplates";

/**
 * Idempotent bootstrap of required platform configuration (NOT demo data):
 *  - the super admin account, sourced from env vars
 *  - the 8 shipped theme templates
 *  - a starter plan so restaurants can be onboarded immediately
 */
async function bootstrap(): Promise<void> {
  const email = env.superAdminEmail().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email,
        name: "Super Admin",
        passwordHash: await hashPassword(env.superAdminPassword()),
        role: "SUPER_ADMIN",
      },
    });
    logger.info({ email }, "super admin account created from env");
  }

  for (const t of THEME_TEMPLATES) {
    await prisma.themeTemplate.upsert({
      where: { key: t.key },
      create: { key: t.key, name_en: t.name_en, name_ar: t.name_ar, document: t.document as object },
      update: {}, // never overwrite admin edits
    });
  }

  const planCount = await prisma.plan.count();
  if (planCount === 0) {
    await prisma.plan.createMany({
      data: [
        { name_en: "Starter", name_ar: "الأساسية", price: 99, interval: "MONTHLY", trialDays: 14, maxBranches: 1, maxProducts: 100, maxStaff: 3, sortOrder: 0 },
        { name_en: "Growth", name_ar: "النمو", price: 249, interval: "MONTHLY", trialDays: 14, maxBranches: 5, maxProducts: 500, maxStaff: 15, sortOrder: 1 },
        { name_en: "Enterprise", name_ar: "المؤسسات", price: 599, interval: "MONTHLY", trialDays: 14, maxBranches: 50, maxProducts: 5000, maxStaff: 100, sortOrder: 2 },
      ],
    });
    logger.info("default subscription plans created");
  }

  await prisma.platformSetting.upsert({ where: { id: 1 }, create: { id: 1, data: {} }, update: {} });
}

async function main(): Promise<void> {
  await bootstrap();
  const app = createApp();
  app.listen(env.port, "0.0.0.0", () => {
    logger.info({ port: env.port }, "Mat'ami platform server listening");
  });
}

main().catch((err) => {
  logger.error(err, "fatal startup error");
  process.exit(1);
});
