import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const orgName = process.env.SEED_ORG_NAME ?? 'Demo Organization';
  const orgSlug = process.env.SEED_ORG_SLUG ?? 'demo-org';
  const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'changeme123';

  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const org = await prisma.organization.upsert({
    where: { slug: orgSlug },
    update: { name: orgName },
    create: { name: orgName, slug: orgSlug },
  });

  const user = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: 'org_admin', organizationId: org.id },
    create: {
      email: adminEmail,
      passwordHash,
      role: 'org_admin',
      name: 'Admin',
      organizationId: org.id,
    },
  });

  console.log('Seed complete:');
  console.log(`  Organization: ${org.name} (${org.slug})`);
  console.log(`  Admin user:   ${user.email}`);
  console.log(`  Password:     ${adminPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
