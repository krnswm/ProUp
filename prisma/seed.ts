import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default user
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      password: 'password', // In production, this should be hashed
    },
  });

  console.log(`✅ Created user: ${user.email} (ID: ${user.id})`);

  // Update existing projects to have the default user as owner
  const projects = await prisma.project.findMany();
  
  for (const project of projects) {
    await prisma.project.update({
      where: { id: project.id },
      data: { ownerId: user.id },
    });
  }

  console.log(`✅ Updated ${projects.length} existing projects with owner`);

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
