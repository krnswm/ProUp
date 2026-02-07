import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Adding test data...');

  // Get or create the demo user
  let user = await prisma.user.findUnique({
    where: { email: 'demo@example.com' },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'demo@example.com',
        name: 'Demo User',
        password: 'password',
      },
    });
  }

  console.log(`✅ Using user: ${user.email} (ID: ${user.id})`);

  // Create sample projects
  const project1 = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Complete overhaul of company website',
      color: '#3b82f6',
      status: 'active',
      ownerId: user.id,
    },
  });

  const project2 = await prisma.project.create({
    data: {
      name: 'Mobile App Development',
      description: 'Build native mobile app for iOS and Android',
      color: '#8b5cf6',
      status: 'active',
      ownerId: user.id,
    },
  });

  const project3 = await prisma.project.create({
    data: {
      name: 'Marketing Campaign',
      description: 'Q1 2026 marketing initiatives',
      color: '#ec4899',
      status: 'active',
      ownerId: user.id,
    },
  });

  console.log(`✅ Created 3 projects`);

  // Create sample tasks for project 1
  await prisma.task.createMany({
    data: [
      {
        title: 'Design homepage mockup',
        description: 'Create initial design for new homepage',
        assignedUser: 'Demo User',
        status: 'done',
        priority: 'high',
        projectId: project1.id,
        dueDate: '2026-02-15',
      },
      {
        title: 'Implement responsive navigation',
        description: 'Build mobile-friendly navigation menu',
        assignedUser: 'Demo User',
        status: 'inprogress',
        priority: 'high',
        projectId: project1.id,
        dueDate: '2026-02-20',
      },
      {
        title: 'Optimize images',
        description: 'Compress and optimize all website images',
        assignedUser: 'Demo User',
        status: 'todo',
        priority: 'medium',
        projectId: project1.id,
        dueDate: '2026-02-25',
      },
    ],
  });

  // Create sample tasks for project 2
  await prisma.task.createMany({
    data: [
      {
        title: 'Setup development environment',
        description: 'Configure React Native development tools',
        assignedUser: 'Demo User',
        status: 'done',
        priority: 'high',
        projectId: project2.id,
        dueDate: '2026-02-10',
      },
      {
        title: 'Design app UI components',
        description: 'Create reusable UI component library',
        assignedUser: 'Demo User',
        status: 'done',
        priority: 'high',
        projectId: project2.id,
        dueDate: '2026-02-18',
      },
      {
        title: 'Implement authentication flow',
        description: 'Build login and registration screens',
        assignedUser: 'Demo User',
        status: 'inprogress',
        priority: 'high',
        projectId: project2.id,
        dueDate: '2026-02-28',
      },
      {
        title: 'Add push notifications',
        description: 'Integrate Firebase Cloud Messaging',
        assignedUser: 'Demo User',
        status: 'todo',
        priority: 'medium',
        projectId: project2.id,
        dueDate: '2026-03-05',
      },
    ],
  });

  // Create sample tasks for project 3
  await prisma.task.createMany({
    data: [
      {
        title: 'Research target audience',
        description: 'Conduct market research and analysis',
        assignedUser: 'Demo User',
        status: 'done',
        priority: 'high',
        projectId: project3.id,
        dueDate: '2026-02-05',
      },
      {
        title: 'Create content calendar',
        description: 'Plan content schedule for Q1',
        assignedUser: 'Demo User',
        status: 'inprogress',
        priority: 'medium',
        projectId: project3.id,
        dueDate: '2026-02-12',
      },
      {
        title: 'Launch social media campaign',
        description: 'Start posting on all social platforms',
        assignedUser: 'Demo User',
        status: 'todo',
        priority: 'high',
        projectId: project3.id,
        dueDate: '2026-02-20',
      },
    ],
  });

  console.log(`✅ Created 10 tasks across 3 projects`);
  console.log('✅ Test data added successfully!');
  console.log('\n📊 Summary:');
  console.log('- Total Projects: 3');
  console.log('- Total Tasks: 10');
  console.log('- Completed Tasks: 4');
  console.log('- In Progress Tasks: 3');
  console.log('- Pending Tasks: 3');
}

main()
  .catch((e) => {
    console.error('❌ Error adding test data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
