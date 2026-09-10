import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { activeSockets } from '../socket/index.js';

export const loginUser = async (req, res, io) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { username: email },
      include: { distributor: true }
    });

    if (!user) {
      return res.status(401).json({ error: 'Tài khoản không tồn tại' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Sai mật khẩu' });
    }

    // LOGIC 1 CHỖ: Đẩy thiết bị cũ ra (nếu có)
    const existingSocketId = activeSockets.get(email);
    if (existingSocketId) {
      console.log(`Kicking out existing session for ${email} on socket ${existingSocketId}`);
      io.to(existingSocketId).emit('FORCE_LOGOUT', { reason: 'Tài khoản của bạn vừa đăng nhập ở một nơi khác!' });
      // Xoá socket cũ khỏi danh sách
      activeSockets.delete(email);
    }

    // Xử lý Prisma BigInt không tự serialize thành JSON được
    const userToReturn = {
      ...user,
      id: user.id.toString(),
      distributorId: user.distributorId?.toString(),
      roleId: user.roleId.toString(),
      email: user.username, // Map lại hiển thị
      distributor: user.distributor ? {
        ...user.distributor,
        id: user.distributor.id.toString()
      } : null
    };

    res.json({ message: 'Đăng nhập thành công', user: userToReturn });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Lỗi server nội bộ' });
  }
};
