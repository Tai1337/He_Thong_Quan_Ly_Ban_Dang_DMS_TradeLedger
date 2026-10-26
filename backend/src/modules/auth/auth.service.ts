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
      include: {
        distributor: true,
        role: {
          include: {
            rolePermissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
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

    const permissions =
      user.role?.rolePermissions?.map(
        (rp) => `${rp.permission.resource}:${rp.permission.action}`,
      ) || [];

    const userToReturn = {
      id: user.id.toString(),
      username: user.username,
      fullName: user.fullName,
      phone: user.phone,
      email: user.email || user.username,
      status: user.status,
      roleId: user.roleId.toString(),
      roleCode: user.role?.code,
      roleName: user.role?.name,
      permissions,
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

  /**
   * Lấy danh sách tất cả vai trò (Roles) trong hệ thống
   */
  async getAllRoles() {
    const roles = await this.prisma.role.findMany({
      include: {
        _count: {
          select: { users: true, rolePermissions: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    return roles.map((r) => ({
      id: r.id.toString(),
      code: r.code,
      name: r.name,
      userCount: r._count.users,
      permissionCount: r._count.rolePermissions,
    }));
  }

  /**
   * Lấy toàn bộ danh mục Permission phân loại theo Resource
   */
  async getAllPermissions() {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ resource: 'asc' }, { id: 'asc' }],
    });

    return permissions.map((p) => ({
      id: p.id.toString(),
      resource: p.resource,
      action: p.action,
      name: p.name,
      description: p.description,
    }));
  }

  /**
   * Lấy danh sách ID quyền được cấp cho một Role cụ thể
   */
  async getRolePermissions(roleId: string) {
    const role = await this.prisma.role.findUnique({
      where: { id: BigInt(roleId) },
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
    });

    if (!role) {
      throw new UnauthorizedException('Không tìm thấy vai trò yêu cầu');
    }

    const permissionIds = role.rolePermissions.map((rp) =>
      rp.permissionId.toString(),
    );
    const permissionKeys = role.rolePermissions.map(
      (rp) => `${rp.permission.resource}:${rp.permission.action}`,
    );

    return {
      roleId: role.id.toString(),
      roleCode: role.code,
      roleName: role.name,
      permissionIds,
      permissionKeys,
    };
  }

  /**
   * Cập nhật danh sách quyền cho một Role (Admin quản trị)
   */
  async updateRolePermissions(roleId: string, permissionIds: string[]) {
    const parsedRoleId = BigInt(roleId);

    const role = await this.prisma.role.findUnique({
      where: { id: parsedRoleId },
    });

    if (!role) {
      throw new UnauthorizedException('Không tìm thấy vai trò cần cập nhật');
    }

    // Xóa toàn bộ liên kết quyền cũ của Role
    await this.prisma.rolePermission.deleteMany({
      where: { roleId: parsedRoleId },
    });

    // Tạo các liên kết mới
    if (permissionIds && permissionIds.length > 0) {
      const dataToInsert = permissionIds.map((pId) => ({
        roleId: parsedRoleId,
        permissionId: BigInt(pId),
      }));

      await this.prisma.rolePermission.createMany({
        data: dataToInsert,
      });
    }

    return {
      message: `Đã cập nhật thành công ${permissionIds?.length || 0} quyền cho vai trò ${role.name}`,
    };
  }

  /**
   * Lấy danh sách toàn bộ người dùng (Dành cho Admin)
   */
  async getAllUsers() {
    const users = await this.prisma.user.findMany({
      include: {
        role: true,
        distributor: true,
      },
      orderBy: { id: 'asc' },
    });

    return users.map((u) => ({
      id: u.id.toString(),
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      status: u.status,
      roleId: u.roleId.toString(),
      roleCode: u.role?.code,
      roleName: u.role?.name,
      distributorName: u.distributor?.name || 'Hệ thống chung',
      createdAt: u.createdAt,
    }));
  }

  /**
   * Tạo tài khoản người dùng mới (Dành cho Admin)
   */
  async createUser(dto: {
    username: string;
    fullName: string;
    email?: string;
    phone?: string;
    password?: string;
    roleId: string;
    distributorId?: string;
  }) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { username: dto.username },
          ...(dto.email ? [{ email: dto.email }] : []),
        ],
      },
    });

    if (existing) {
      throw new UnauthorizedException('Tên đăng nhập hoặc Email đã tồn tại');
    }

    const defaultPass = dto.password || '123456';
    const passwordHash = await bcrypt.hash(defaultPass, this.saltRounds);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        fullName: dto.fullName,
        email: dto.email || dto.username,
        phone: dto.phone,
        passwordHash,
        roleId: BigInt(dto.roleId),
        distributorId: dto.distributorId ? BigInt(dto.distributorId) : 1n,
        status: true,
      },
      include: { role: true },
    });

    return {
      id: user.id.toString(),
      username: user.username,
      fullName: user.fullName,
      roleName: user.role?.name,
      message: 'Tạo tài khoản thành công',
    };
  }

  /**
   * Khóa / Kích hoạt tài khoản
   */
  async toggleUserStatus(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new UnauthorizedException('Không tìm thấy người dùng');
    }

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: { status: !user.status },
    });

    return {
      id: updated.id.toString(),
      status: updated.status,
      message: `Đã ${updated.status ? 'kích hoạt' : 'khóa'} tài khoản thành công`,
    };
  }

  /**
   * Đổi mật khẩu cá nhân
   */
  async changePassword(userId: string, oldPass: string, newPass: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });

    if (!user) {
      throw new UnauthorizedException('Không tìm thấy tài khoản');
    }

    const isValid = await bcrypt.compare(oldPass, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Mật khẩu hiện tại không chính xác');
    }

    const newHash = await bcrypt.hash(newPass, this.saltRounds);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    });

    return { message: 'Đổi mật khẩu thành công' };
  }
}


