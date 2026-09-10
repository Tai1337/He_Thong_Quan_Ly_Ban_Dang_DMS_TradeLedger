import prisma from '../config/prisma.js';

export const getWarehouses = async (req, res) => {
  try {
    const { distributorId } = req.query;
    
    const where = { status: true };
    if (distributorId) {
      where.distributorId = BigInt(distributorId);
    }
    
    const warehouses = await prisma.warehouse.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        type: true,
        category: true
      },
      orderBy: { id: 'asc' }
    });

    const formatted = warehouses.map(w => ({
      id: w.id.toString(),
      code: w.code,
      name: w.name,
      type: w.type,
      category: w.category
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRetailers = async (req, res) => {
  try {
    const { distributorId, search } = req.query;
    const where = { status: true };
    if (distributorId) {
      where.distributorId = BigInt(distributorId);
    }
    if (search && search.trim()) {
      where.OR = [
        { code: { contains: search.trim() } },
        { name: { contains: search.trim() } }
      ];
    }

    const retailers = await prisma.retailer.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    res.json(retailers.map(r => ({
      id: r.id.toString(),
      code: r.code,
      name: r.name,
      address: r.address,
      phone: r.phone
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getDeliveryTrips = async (req, res) => {
  try {
    const { distributorId } = req.query;
    const where = {};
    if (distributorId) {
      where.distributorId = BigInt(distributorId);
    }

    const trips = await prisma.deliveryTrip.findMany({
      where,
      include: { driver: true },
      orderBy: { createdAt: 'desc' }
    });

    res.json(trips.map(t => ({
      id: t.id.toString(),
      tripCode: t.tripCode,
      status: t.status,
      driverName: t.driver?.fullName || 'Chưa gán tài xế',
      driverPhone: t.driver?.phone || ''
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSalesReps = async (req, res) => {
  try {
    const { distributorId } = req.query;
    const salesRole = await prisma.role.findUnique({ where: { code: 'SALES' } });
    if (!salesRole) return res.json([]);

    const where = { roleId: salesRole.id, status: true };
    if (distributorId) {
      where.distributorId = BigInt(distributorId);
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { fullName: 'asc' }
    });

    res.json(users.map(u => ({
      id: u.id.toString(),
      username: u.username,
      fullName: u.fullName,
      phone: u.phone,
      email: u.email
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getProducts = async (req, res) => {
  try {
    const { search } = req.query;
    const where = { status: true };
    if (search && search.trim()) {
      where.OR = [
        { sku: { contains: search.trim() } },
        { name: { contains: search.trim() } }
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: { name: 'asc' },
      take: 100
    });

    res.json(products.map(p => ({
      id: p.id.toString(),
      sku: p.sku,
      name: p.name,
      unit: p.unit,
      basePrice: Number(p.basePrice)
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getSuppliers = async (req, res) => {
  try {
    const { search } = req.query;
    const where = { status: true };
    if (search && search.trim()) {
      where.OR = [
        { code: { contains: search.trim() } },
        { name: { contains: search.trim() } }
      ];
    }

    const suppliers = await prisma.supplier.findMany({
      where,
      orderBy: { name: 'asc' }
    });

    res.json(suppliers.map(s => ({
      id: s.id.toString(),
      code: s.code,
      name: s.name,
      address: s.address,
      phone: s.phone
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


