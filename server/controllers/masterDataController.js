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
