import prisma from './server/config/prisma.js';

async function main() {
  const users = await prisma.user.findMany();
  console.log(users);
}
main().finally(() => prisma.$disconnect());
