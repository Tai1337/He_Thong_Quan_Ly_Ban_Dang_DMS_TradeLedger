import pkg from '@prisma/client';
const { PrismaClient } = pkg;
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log("Đang tạo dữ liệu mẫu...");

  // Tạo role Admin
  let role = await prisma.role.findUnique({ where: { code: 'ADMIN' } });
  if (!role) {
    role = await prisma.role.create({
      data: {
        code: 'ADMIN',
        name: 'Quản trị viên hệ thống'
      }
    });
    console.log("Đã tạo quyền ADMIN");
  }

  // Tạo user mặc định
  const email = 'admin@example.com';
  let user = await prisma.user.findUnique({ where: { username: email } });
  
  if (!user) {
    const passwordHash = await bcrypt.hash('123456', 10);
    user = await prisma.user.create({
      data: {
        username: email,
        passwordHash,
        fullName: 'Nguyễn Phước Admin',
        roleId: role.id
      }
    });
    console.log(`Đã tạo tài khoản mẫu: ${email} - Mật khẩu: 123456`);
  } else {
    console.log(`Tài khoản ${email} đã tồn tại`);
  }

  console.log("Tạo dữ liệu hoàn tất!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
