import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../events/events.gateway';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly saltRounds = 10;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly eventsGateway: EventsGateway,
  ) {
    this.jwtSecret =
      this.configService.get<string>('JWT_SECRET') || 'dms-npp-super-secret-key-2026';
  }

  /**
   * Đăng nhập người dùng bằng username (hoặc email) và password
   * Áp dụng Single-Device Login: forceLogout phiên cũ qua Socket.IO
   */
  async login(identifier: string, pass: string) {
    if (!identifier || !pass) {
      throw new UnauthorizedException('Vui lòng nhập đầy đủ thông tin đăng nhập');
    }

    const trimmedIdentifier = identifier.trim();

    // Tìm kiếm theo username hoặc email
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: trimmedIdentifier },
          { email: trimmedIdentifier },
        ],
      },
      include: { distributor: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác');
    }

    if (!user.status) {
      throw new UnauthorizedException('Tài khoản của bạn đã bị vô hiệu hóa');
    }

    // Kiểm tra mật khẩu (đã hash bằng bcrypt)
    const isPasswordValid = await bcrypt.compare(pass, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Tài khoản hoặc mật khẩu không chính xác');
    }

    // --- Single-Device Login ---
    // Gửi sự kiện forceLogout tới thiết bị/client đang giữ phiên cũ của user này
    this.eventsGateway.forceLogout(
      user.username,
      'Tài khoản của bạn vừa đăng nhập trên một thiết bị khác. Phiên hiện tại đã kết thúc.',
    );

    // Sinh cặp Access Token (15 phút) và Refresh Token (7 ngày)
    const { accessToken, refreshToken } = await this.generateTokens({
      id: user.id.toString(),
      username: user.username,
      roleId: user.roleId.toString(),
      distributorId: user.distributorId?.toString(),
    });

    // Hash refresh token bằng bcrypt (salt rounds = 10) trước khi lưu vào CSDL
    const hashedRefreshToken = await bcrypt.hash(refreshToken, this.saltRounds);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: hashedRefreshToken },
    });

    const userToReturn = {
      id: user.id.toString(),
      username: user.username,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email || user.username,
      status: user.status,
      roleId: user.roleId.toString(),
      roleName: user.role?.name,
      distributorId: user.distributorId?.toString() || null,
      distributor: user.distributor
        ? {
            id: user.distributor.id.toString(),
            name: user.distributor.name,
            code: user.distributor.code,
          }
        : null,
    };

    return {
      message: 'Đăng nhập thành công',
      user: userToReturn,
      accessToken,
      refreshToken,
      token: accessToken, // Tương thích ngược với client cũ
      expiresIn: 900,     // 15 phút (tính bằng giây)
    };
  }

  /**
   * Cấp lại Access Token mới từ Refresh Token
   */
  async refreshTokens(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token không được để trống');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret: this.jwtSecret,
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const userId = payload.sub;
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
      include: { distributor: true, role: true },
    });

    if (!user || !user.status || !user.refreshTokenHash) {
      throw new UnauthorizedException('Phiên đăng nhập không tồn tại hoặc đã bị thu hồi');
    }

    // So sánh refresh token gửi lên với hash lưu trong CSDL
    const isRefreshTokenValid = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );

    if (!isRefreshTokenValid) {
      // Phát hiện token không khớp (có thể đã bị tái sử dụng) -> Xóa ngay token hash để đảm bảo an toàn
      await this.prisma.user.update({
        where: { id: user.id },
        data: { refreshTokenHash: null },
      });
      throw new UnauthorizedException('Refresh token không hợp lệ. Vui lòng đăng nhập lại.');
    }

    // Sinh cặp token mới (Token Rotation)
    const tokens = await this.generateTokens({
      id: user.id.toString(),
      username: user.username,
      roleId: user.roleId.toString(),
      distributorId: user.distributorId?.toString(),
    });

    // Hash refresh token mới và cập nhật CSDL
    const newHashedRefreshToken = await bcrypt.hash(
      tokens.refreshToken,
      this.saltRounds,
    );

    await this.prisma.user.update({
      where: { id: user.id },
      data: { refreshTokenHash: newHashedRefreshToken },
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: 900,
    };
  }

  /**
   * Đăng xuất: Vô hiệu hóa refresh token trong CSDL
   */
  async logout(userId: string) {
    if (!userId) return;
    try {
      await this.prisma.user.update({
        where: { id: BigInt(userId) },
        data: { refreshTokenHash: null },
      });
    } catch {
      // Bỏ qua nếu user không tồn tại
    }
  }

  /**
   * Hàm hash mật khẩu chuẩn với salt rounds = 10
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Sinh cặp Access Token (15m) & Refresh Token (7d)
   */
  private async generateTokens(user: {
    id: string;
    username: string;
    roleId?: string;
    distributorId?: string;
  }) {
    const accessPayload = {
      sub: user.id,
      username: user.username,
      roleId: user.roleId,
      distributorId: user.distributorId,
    };

    const refreshPayload = {
      sub: user.id,
      username: user.username,
    };

    const [accessToken, refreshToken] = await Promise.all([
      // Access token: 15 phút (900 giây)
      this.jwtService.signAsync(accessPayload, {
        secret: this.jwtSecret,
        expiresIn: '15m',
      }),
      // Refresh token: 7 ngày
      this.jwtService.signAsync(refreshPayload, {
        secret: this.jwtSecret,
        expiresIn: '7d',
      }),
    ]);

    return { accessToken, refreshToken };
  }
}
