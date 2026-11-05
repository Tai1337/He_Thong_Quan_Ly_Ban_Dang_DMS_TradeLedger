import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const ROUTE_INCLUDE = {
  salesRep: { select: { id: true, username: true, fullName: true, phone: true } },
  stops: {
    include: {
      retailer: { select: { id: true, code: true, name: true, address: true, phone: true } },
    },
    orderBy: [{ weekday: 'asc' }, { visitOrder: 'asc' }],
  },
} as const;

@Injectable()
export class SalesRouteService {
  constructor(private readonly prisma: PrismaService) {}

  async getRoutes(distributorId?: string, salesRepId?: string, includeInactive?: string) {
    const where: any = {};
    if (distributorId) where.distributorId = BigInt(distributorId);
    if (salesRepId) where.salesRepId = BigInt(salesRepId);
    if (includeInactive !== 'true') where.status = true;

    return this.prisma.salesRoute.findMany({
      where,
      include: ROUTE_INCLUDE,
      orderBy: { code: 'asc' },
    });
  }

  // Gom lịch theo tuần cho calendar: { [weekday]: [{ route, salesRep, stops }] }
  async getWeekly(distributorId?: string, salesRepId?: string) {
    const where: any = { status: true };
    if (distributorId) where.distributorId = BigInt(distributorId);
    if (salesRepId) where.salesRepId = BigInt(salesRepId);

    const routes = await this.prisma.salesRoute.findMany({
      where,
      include: {
        salesRep: { select: { id: true, username: true, fullName: true } },
        stops: {
          where: { weekday: { gte: 1, lte: 7 } },
          include: {
            retailer: { select: { id: true, code: true, name: true, address: true, phone: true } },
          },
          orderBy: { visitOrder: 'asc' },
        },
      },
    });

    const weekly: Record<number, any[]> = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [] };
    for (const route of routes) {
      const byDay: Record<number, any[]> = {};
      for (const stop of route.stops) {
        (byDay[stop.weekday] ||= []).push(stop);
      }
      for (const [weekday, stops] of Object.entries(byDay)) {
        weekly[Number(weekday)].push({
          routeId: route.id,
          routeCode: route.code,
          routeName: route.name,
          salesRep: route.salesRep,
          stops: stops.map((s) => ({
            id: s.id,
            visitOrder: s.visitOrder,
            retailer: s.retailer,
          })),
        });
      }
    }
    return weekly;
  }

  async createRoute(data: {
    distributorId?: string;
    name: string;
    salesRepId: string;
    notes?: string;
    stops?: Array<{ retailerId: string; weekday: number; visitOrder?: number }>;
  }) {
    if (!data.name || !data.salesRepId) {
      throw new Error('Cần nhập tên tuyến và nhân viên bán hàng');
    }

    const count = await this.prisma.salesRoute.count();
    const code = `RT-${String(count + 1).padStart(3, '0')}`;

    return this.prisma.salesRoute.create({
      data: {
        code,
        name: data.name,
        notes: data.notes || null,
        distributorId: BigInt(data.distributorId || '1'),
        salesRepId: BigInt(data.salesRepId),
        stops: {
          create: (data.stops || []).map((s) => ({
            retailerId: BigInt(s.retailerId),
            weekday: s.weekday,
            visitOrder: s.visitOrder || 1,
          })),
        },
      },
      include: ROUTE_INCLUDE,
    });
  }

  async updateRoute(
    id: string,
    data: {
      name?: string;
      salesRepId?: string;
      notes?: string;
      status?: boolean;
      stops?: Array<{ retailerId: string; weekday: number; visitOrder?: number }>;
    },
  ) {
    const existing = await this.prisma.salesRoute.findUnique({ where: { id: BigInt(id) } });
    if (!existing) throw new Error('Không tìm thấy tuyến bán hàng');

    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.salesRepId !== undefined) updateData.salesRepId = BigInt(data.salesRepId);

    await this.prisma.salesRoute.update({ where: { id: BigInt(id) }, data: updateData });

    if (data.stops !== undefined) {
      await this.prisma.salesRouteStop.deleteMany({ where: { routeId: BigInt(id) } });
      if (data.stops.length > 0) {
        await this.prisma.salesRouteStop.createMany({
          data: data.stops.map((s) => ({
            routeId: BigInt(id),
            retailerId: BigInt(s.retailerId),
            weekday: s.weekday,
            visitOrder: s.visitOrder || 1,
          })),
        });
      }
    }

    return this.prisma.salesRoute.findUnique({
      where: { id: BigInt(id) },
      include: ROUTE_INCLUDE,
    });
  }

  async deleteRoute(id: string) {
    const existing = await this.prisma.salesRoute.findUnique({ where: { id: BigInt(id) } });
    if (!existing) throw new Error('Không tìm thấy tuyến bán hàng');
    await this.prisma.salesRoute.delete({ where: { id: BigInt(id) } });
    return { success: true };
  }
}
