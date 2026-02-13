import prismaPkg from '@prisma/client';

import type { PrismaClient as PrismaClientType } from '@prisma/client';

const { PrismaClient } = prismaPkg as unknown as { PrismaClient: typeof import('@prisma/client').PrismaClient };

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global as unknown as { prisma: PrismaClientType };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
