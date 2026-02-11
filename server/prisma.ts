import prismaPkg from '@prisma/client';

const { PrismaClient } = prismaPkg as unknown as { PrismaClient: typeof import('@prisma/client').PrismaClient };

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
