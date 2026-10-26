import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Param,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@Controller(['auth', ''])
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const identifier = loginDto.username || loginDto.email || '';
    const password = loginDto.password;

    const result = await this.authService.login(identifier, password);

    // Gắn Access Token vào httpOnly cookie nhằm chống tấn công XSS
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 phút
      path: '/',
    });

    // Gắn Refresh Token vào httpOnly cookie
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 ngày
      path: '/',
    });

    return result;
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() body: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Ưu tiên đọc refresh token từ body hoặc từ httpOnly cookie
    const refreshToken =
      body?.refreshToken || req.cookies?.['refresh_token'];

    if (!refreshToken) {
      throw new UnauthorizedException('Không tìm thấy refresh token');
    }

    const tokens = await this.authService.refreshTokens(refreshToken);

    // Cập nhật lại cookie
    res.cookie('access_token', tokens.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });

    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (user?.id) {
      await this.authService.logout(user.id);
    }

    // Xóa httpOnly cookies
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });

    return { message: 'Đăng xuất thành công' };
  }

  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return user;
  }

  /**
   * Lấy danh sách tất cả các vai trò
   */
  @Get('roles')
  async getRoles() {
    return this.authService.getAllRoles();
  }

  /**
   * Lấy toàn bộ danh mục Permission
   */
  @Get('permissions')
  async getPermissions() {
    return this.authService.getAllPermissions();
  }

  /**
   * Lấy danh sách ID quyền của một vai trò
   */
  @Get('roles/:id/permissions')
  async getRolePermissions(@Param('id') roleId: string) {
    return this.authService.getRolePermissions(roleId);
  }

  /**
   * Cập nhật danh sách quyền cho vai trò (Yêu cầu ADMIN)
   */
  @Put('roles/:id/permissions')
  async updateRolePermissions(
    @Param('id') roleId: string,
    @Body('permissionIds') permissionIds: string[],
  ) {
    return this.authService.updateRolePermissions(roleId, permissionIds);
  }

  /**
   * Quản lý người dùng: Lấy danh sách users
   */
  @Get('users')
  async getUsers() {
    return this.authService.getAllUsers();
  }

  /**
   * Quản lý người dùng: Tạo tài khoản mới
   */
  @Post('users')
  async createUser(@Body() body: any) {
    return this.authService.createUser(body);
  }

  /**
   * Quản lý người dùng: Khóa / Kích hoạt
   */
  @Patch('users/:id/toggle-status')
  async toggleUserStatus(@Param('id') userId: string) {
    return this.authService.toggleUserStatus(userId);
  }

  /**
   * Đổi mật khẩu cá nhân
   */
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: any,
    @Body('oldPassword') oldPass: string,
    @Body('newPassword') newPass: string,
  ) {
    if (!user?.id) throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');
    return this.authService.changePassword(user.id, oldPass, newPass);
  }
}


