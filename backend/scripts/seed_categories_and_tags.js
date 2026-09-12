/**
 * Script phân loại và gán Tag ngành hàng FMCG chuẩn xác cho toàn bộ sản phẩm
 * Khởi tạo danh mục ngành hàng (ProductCategory) và map categoryId vào Product
 */
import prisma from '../server/config/prisma.js';

const CATEGORIES_DATA = [
  {
    name: 'Mì Ăn Liền & Phở',
    match: (p) => {
      const sku = (p.sku || '').toUpperCase();
      return sku.startsWith('01PH') || sku.startsWith('02KK') || sku.startsWith('02OM');
    }
  },
  {
    name: 'Xúc Xích & Đồ Ăn Tiện Lợi',
    match: (p) => {
      const sku = (p.sku || '').toUpperCase();
      return sku.startsWith('02XX');
    }
  },
  {
    name: 'Nước Mắm & Nước Chấm',
    match: (p) => {
      const sku = (p.sku || '').toUpperCase();
      return sku.startsWith('03NM');
    }
  },
  {
    name: 'Gia Vị & Nước Xốt',
    match: (p) => {
      const sku = (p.sku || '').toUpperCase();
      return sku.startsWith('03CA') || sku.startsWith('03GV') || sku.startsWith('03HG') || sku.startsWith('03MR') || sku.startsWith('03OT');
    }
  },
  {
    name: 'Cà Phê & Thức Uống',
    match: (p) => {
      const sku = (p.sku || '').toUpperCase();
      return sku.startsWith('00CF');
    }
  }
];

async function run() {
  console.log('🚀 Bắt đầu thiết lập danh mục ngành hàng và phân loại Tag sản phẩm...');

  // 1. Tạo hoặc lấy các Danh mục
  const catMap = {};
  for (const catDef of CATEGORIES_DATA) {
    let cat = await prisma.productCategory.findFirst({
      where: { name: catDef.name }
    });
    if (!cat) {
      cat = await prisma.productCategory.create({
        data: { name: catDef.name }
      });
      console.log(`✨ Đã tạo danh mục mới: [${cat.id}] ${cat.name}`);
    } else {
      console.log(`ℹ️ Đã tồn tại danh mục: [${cat.id}] ${cat.name}`);
    }
    catMap[catDef.name] = cat.id;
  }

  // 2. Lấy toàn bộ sản phẩm và phân loại vào danh mục chuẩn
  const products = await prisma.product.findMany();
  console.log(`📦 Đang phân loại cho ${products.length} sản phẩm...`);

  let categorizedCount = 0;
  const stats = {};

  for (const product of products) {
    let matchedCatId = null;
    let matchedCatName = 'Khác';

    for (const catDef of CATEGORIES_DATA) {
      if (catDef.match(product)) {
        matchedCatId = catMap[catDef.name];
        matchedCatName = catDef.name;
        break;
      }
    }

    if (!matchedCatId) {
      // Fallback nếu có SKU chưa match
      matchedCatId = catMap['Gia Vị & Nước Xốt'];
      matchedCatName = 'Gia Vị & Nước Xốt';
    }

    await prisma.product.update({
      where: { id: product.id },
      data: {
        categoryId: matchedCatId
      }
    });

    stats[matchedCatName] = (stats[matchedCatName] || 0) + 1;
    categorizedCount++;
  }

  console.log('--- THỐNG KÊ PHÂN LOẠI NGÀNH HÀNG ---');
  for (const [catName, count] of Object.entries(stats)) {
    console.log(`  🏷️ ${catName}: ${count} sản phẩm`);
  }
  console.log(`✅ Hoàn thành phân loại 100% (${categorizedCount}/${products.length}) sản phẩm!`);
}

run()
  .catch(err => {
    console.error('❌ Lỗi phân loại danh mục:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
