import prisma from './server/config/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  const hash = await bcrypt.hash('123456', 10);
  const user = await prisma.user.create({
    data: {
      username: 'TaiNP',
      passwordHash: hash,
      fullName: 'Tài Nguyễn Phước',
      distributorId: 1n,
      roleId: 1n,
      status: true
    }
  });
  console.log('Created user:', user);
}
main().finally(() => prisma.$disconnect());
