import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import { EventsGateway } from '../../events/events.gateway';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private eventsGateway: EventsGateway,
  ) {}

  async login(email: string, pass: string) {
    const user = await this.prisma.user.findUnique({
      where: { username: email },
      include: { distributor: true, role: true },
    });

    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }

    const isValid = await bcrypt.compare(pass, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Sai mật khẩu');
    }

    // Đẩy thiết bị cũ ra (nếu có kết nối socket)
    this.eventsGateway.forceLogout(email);

    const payload = {
      sub: user.id.toString(),
      username: user.username,
      roleId: user.roleId.toString(),
      distributorId: user.distributorId?.toString(),
    };

    const accessToken = this.jwtService.sign(payload);

    const userToReturn = {
      ...user,
      id: user.id.toString(),
      distributorId: user.distributorId?.toString(),
      roleId: user.roleId.toString(),
      email: user.username,
      roleName: user.role?.name,
      distributor: user.distributor
        ? {
            ...user.distributor,
            id: user.distributor.id.toString(),
          }
        : null,
    };

    return {
      message: 'Đăng nhập thành công',
      user: userToReturn,
      accessToken,
      token: accessToken,
    };
  }
}
