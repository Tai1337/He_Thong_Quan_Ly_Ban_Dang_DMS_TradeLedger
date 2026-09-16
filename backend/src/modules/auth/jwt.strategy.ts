import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'dms-npp-super-secret-key-2026',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(payload.sub) },
      include: { distributor: true, role: true },
    });
    if (!user) {
      throw new UnauthorizedException('Người dùng không tồn tại hoặc phiên hết hạn');
    }
    return {
      ...user,
      id: user.id.toString(),
      distributorId: user.distributorId?.toString(),
      roleId: user.roleId.toString(),
      email: user.username,
      roleName: user.role?.name,
    };
  }
}
