import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly prisma: PrismaService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          if (req && req.cookies) {
            return req.cookies['access_token'] || req.cookies['accessToken'] || null;
          }
          return null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'dms-npp-super-secret-key-2026',
    });
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(payload.sub) },
      include: { distributor: true, role: true },
    });

    if (!user || !user.status) {
      throw new UnauthorizedException('Tài khoản không tồn tại, đã bị vô hiệu hóa hoặc phiên hết hạn');
    }

    return {
      ...user,
      id: user.id.toString(),
      distributorId: user.distributorId?.toString(),
      roleId: user.roleId.toString(),
      email: user.username,
      username: user.username,
      roleName: user.role?.name,
    };
  }
}
