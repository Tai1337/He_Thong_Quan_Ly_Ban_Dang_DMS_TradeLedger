/**
 * Script dọn dẹp sản phẩm tên tiếng Khmer (Campuchia)
 * và sinh thêm dữ liệu sản phẩm FMCG đa dạng, chuẩn chỉ cho DMS-NPP
 */
import prisma from '../server/config/prisma.js';

const NEW_PRODUCTS = [
  // --- DANH MỤC 1: Mì Ăn Liền & Phở (categoryId: 1) ---
  {
    sku: '02OM01001',
    name: 'Mì khoai tây Omachi Xốt Bò Hầm cao cấp 30gói x 80gr',
    categoryId: 1n,
    unit: 'THÙNG',
    retailUnit: 'Gói',
    productType: 'FG',
    stdSku: 'OM_BOHAM_80G',
    stdSkuName: 'Mì Omachi Xốt Bò Hầm',
    groupStdSku: 'Mì Omachi Thượng Hạng',
    conversionRate: 30,
    basePrice: 225000,
    imageUrl: '/images/products/omachi_bo_ham.jpg',
    retailImageUrl: '/images/products/omachi_bo_ham.jpg',
    initialQty: 150
  },
  {
    sku: '02OM01002',
    name: 'Mì khoai tây Omachi Sườn Hầm Ngũ Quả 30gói x 80gr',
    categoryId: 1n,
    unit: 'THÙNG',
    retailUnit: 'Gói',
    productType: 'FG',
    stdSku: 'OM_SUON_80G',
    stdSkuName: 'Mì Omachi Sườn Hầm Ngũ Quả',
    groupStdSku: 'Mì Omachi Thượng Hạng',
    conversionRate: 30,
    basePrice: 225000,
    imageUrl: '/images/products/omachi_suon.jpg',
    retailImageUrl: '/images/products/omachi_suon.jpg',
    initialQty: 120
  },
  {
    sku: '02OM01003',
    name: 'Mì trộn Omachi Xốt Spaghetti Bò Bằm 30gói x 90gr',
    categoryId: 1n,
    unit: 'THÙNG',
    retailUnit: 'Gói',
    productType: 'FG',
    stdSku: 'OM_SPAGHETTI_90G',
    stdSkuName: 'Mì Trộn Omachi Spaghetti',
    groupStdSku: 'Mì Omachi Thượng Hạng',
    conversionRate: 30,
    basePrice: 240000,
    imageUrl: '/images/products/omachi_spaghetti.jpg',
    retailImageUrl: '/images/products/omachi_spaghetti.jpg',
    initialQty: 90
  },
  {
    sku: '02KK00501',
    name: 'Mì Kokomi 90 Tôm Chua Cay Siêu To Đậm Đà 30gói x 90gr',
    categoryId: 1n,
    unit: 'THÙNG',
    retailUnit: 'Gói',
    productType: 'FG',
    stdSku: 'KK_TOM_90G',
    stdSkuName: 'Mì Kokomi 90 Tôm Chua Cay',
    groupStdSku: 'Mì Kokomi Đại Gia Đình',
    conversionRate: 30,
    basePrice: 155000,
    imageUrl: '/images/products/kokomi_tom.jpg',
    retailImageUrl: '/images/products/kokomi_tom.jpg',
    initialQty: 200
  },
  {
    sku: '02KK00502',
    name: 'Mì Kokomi Đại Vị Bò Hầm Rau Thơm 30gói x 90gr',
    categoryId: 1n,
    unit: 'THÙNG',
    retailUnit: 'Gói',
    productType: 'FG',
    stdSku: 'KK_BO_90G',
    stdSkuName: 'Mì Kokomi Đại Bò Hầm',
    groupStdSku: 'Mì Kokomi Đại Gia Đình',
    conversionRate: 30,
    basePrice: 155000,
    imageUrl: '/images/products/kokomi_tom.jpg',
    retailImageUrl: '/images/products/kokomi_tom.jpg',
    initialQty: 180
  },
  {
    sku: '01PH00101',
    name: 'Phở Bò CHIN-SU Phố Cổ Hà Nội đậm vị truyền thống 30gói x 72gr',
    categoryId: 1n,
    unit: 'THÙNG',
    retailUnit: 'Gói',
    productType: 'FG',
    stdSku: 'PH_BO_72G',
    stdSkuName: 'Phở Bò CHIN-SU Phố Cổ',
    groupStdSku: 'Phở Chinsu Thượng Hạng',
    conversionRate: 30,
    basePrice: 270000,
    imageUrl: '/images/products/pho_bo.jpg',
    retailImageUrl: '/images/products/pho_bo.jpg',
    initialQty: 110
  },
  {
    sku: '01PH00102',
    name: 'Phở Gà CHIN-SU Thượng Hạng Lá Chanh 30gói x 72gr',
    categoryId: 1n,
    unit: 'THÙNG',
    retailUnit: 'Gói',
    productType: 'FG',
    stdSku: 'PH_GA_72G',
    stdSkuName: 'Phở Gà CHIN-SU Lá Chanh',
    groupStdSku: 'Phở Chinsu Thượng Hạng',
    conversionRate: 30,
    basePrice: 270000,
    imageUrl: '/images/products/pho_bo.jpg',
    retailImageUrl: '/images/products/pho_bo.jpg',
    initialQty: 95
  },

  // --- DANH MỤC 2: Xúc Xích & Đồ Ăn Tiện Lợi (categoryId: 2) ---
  {
    sku: '02XX00350',
    name: 'Xúc xích tiệt trùng Ponnie Thịt Heo Thơm Ngon 20gói x 5cây x 35gr',
    categoryId: 2n,
    unit: 'THÙNG',
    retailUnit: 'Gói',
    productType: 'FG',
    stdSku: 'PN_HEO_5C_35G',
    stdSkuName: 'Xúc xích Ponnie Thịt Heo',
    groupStdSku: 'Xúc xích Ponnie Đậm Đà',
    conversionRate: 20,
    basePrice: 360000,
    imageUrl: '/images/products/ponnie_sausage.jpg',
    retailImageUrl: '/images/products/ponnie_sausage.jpg',
    initialQty: 130
  },
  {
    sku: '02XX00351',
    name: 'Xúc xích tiệt trùng Ponnie Thịt Bò Hảo Hạng 20gói x 5cây x 35gr',
    categoryId: 2n,
    unit: 'THÙNG',
    retailUnit: 'Gói',
    productType: 'FG',
    stdSku: 'PN_BO_5C_35G',
    stdSkuName: 'Xúc xích Ponnie Thịt Bò',
    groupStdSku: 'Xúc xích Ponnie Đậm Đà',
    conversionRate: 20,
    basePrice: 375000,
    imageUrl: '/images/products/ponnie_sausage.jpg',
    retailImageUrl: '/images/products/ponnie_sausage.jpg',
    initialQty: 115
  },
  {
    sku: '02XX00360',
    name: 'Xúc xích Heo Cao Bồi Lắc Phô Mai Bắp Bơ 48ly x (3cây x 13gr + gia vị)',
    categoryId: 2n,
    unit: 'THÙNG',
    retailUnit: 'Ly',
    productType: 'FG',
    stdSku: 'HCB_LAC_PHOMAI',
    stdSkuName: 'Heo Cao Bồi Lắc Phô Mai',
    groupStdSku: 'Ăn Vặt Heo Cao Bồi',
    conversionRate: 48,
    basePrice: 480000,
    imageUrl: '/images/products/ponnie_sausage.jpg',
    retailImageUrl: '/images/products/ponnie_sausage.jpg',
    initialQty: 140
  },
  {
    sku: '02XX00370',
    name: 'Xúc xích tiệt trùng Ponnie Dinh Dưỡng Cao Cấp 16gói x 4cây x 70gr',
    categoryId: 2n,
    unit: 'THÙNG',
    retailUnit: 'Gói',
    productType: 'FG',
    stdSku: 'PN_DINHDUONG_70G',
    stdSkuName: 'Ponnie Dinh Dưỡng Cây Lớn',
    groupStdSku: 'Xúc xích Ponnie Đậm Đà',
    conversionRate: 16,
    basePrice: 384000,
    imageUrl: '/images/products/ponnie_sausage.jpg',
    retailImageUrl: '/images/products/ponnie_sausage.jpg',
    initialQty: 85
  },
  {
    sku: '02XX00380',
    name: 'Hotdog Ponnie Giòn Ăn Liền Lắc Muối Ớt Xanh 24gói x 35gr',
    categoryId: 2n,
    unit: 'THÙNG',
    retailUnit: 'Gói',
    productType: 'FG',
    stdSku: 'PN_HOTDOG_GION',
    stdSkuName: 'Hotdog Ponnie Giòn Muối Ớt',
    groupStdSku: 'Ăn Vặt Tiện Lợi',
    conversionRate: 24,
    basePrice: 288000,
    imageUrl: '/images/products/ponnie_sausage.jpg',
    retailImageUrl: '/images/products/ponnie_sausage.jpg',
    initialQty: 100
  },

  // --- DANH MỤC 3: Nước Mắm & Nước Chấm (categoryId: 3) ---
  {
    sku: '03NM00950',
    name: 'Nước mắm CHIN-SU Cá Cơm Than Đậm Đặc 12chai x 500ml',
    categoryId: 3n,
    unit: 'THÙNG',
    retailUnit: 'Chai',
    productType: 'FG',
    stdSku: 'CS_CA_COM_500ML',
    stdSkuName: 'Nước mắm CHIN-SU Cá Cơm Than',
    groupStdSku: 'Nước Mắm Thượng Hạng',
    conversionRate: 12,
    basePrice: 468000,
    imageUrl: '/images/products/chinsu_sauce.jpg',
    retailImageUrl: '/images/products/chinsu_sauce.jpg',
    initialQty: 160
  },
  {
    sku: '03NM00960',
    name: 'Nước mắm Nam Ngư Đệ Nhị Thượng Hạng 15chai x 900ml',
    categoryId: 3n,
    unit: 'THÙNG',
    retailUnit: 'Chai',
    productType: 'FG',
    stdSku: 'NN_DENHI_900ML',
    stdSkuName: 'Nước mắm Nam Ngư Đệ Nhị',
    groupStdSku: 'Nước Mắm Nam Ngư',
    conversionRate: 15,
    basePrice: 360000,
    imageUrl: '/images/products/namngu_sauce.jpg',
    retailImageUrl: '/images/products/namngu_sauce.jpg',
    initialQty: 220
  },
  {
    sku: '03NM00970',
    name: 'Nước chấm Nam Ngư Siêu Tiết Kiệm Can Lớn 6can x 2lít',
    categoryId: 3n,
    unit: 'THÙNG',
    retailUnit: 'Can',
    productType: 'FG',
    stdSku: 'NN_TK_2L',
    stdSkuName: 'Nam Ngư Tiết Kiệm Can 2L',
    groupStdSku: 'Nước Mắm Nam Ngư',
    conversionRate: 6,
    basePrice: 252000,
    imageUrl: '/images/products/namngu_sauce.jpg',
    retailImageUrl: '/images/products/namngu_sauce.jpg',
    initialQty: 90
  },
  {
    sku: '03NM00980',
    name: 'Nước mắm Nam Ngư Ớt Tỏi Lý Sơn Chua Ngọt 12chai x 300ml',
    categoryId: 3n,
    unit: 'THÙNG',
    retailUnit: 'Chai',
    productType: 'FG',
    stdSku: 'NN_OT_TOI_300ML',
    stdSkuName: 'Nam Ngư Ớt Tỏi Lý Sơn',
    groupStdSku: 'Nước Mắm Nam Ngư',
    conversionRate: 12,
    basePrice: 276000,
    imageUrl: '/images/products/namngu_sauce.jpg',
    retailImageUrl: '/images/products/namngu_sauce.jpg',
    initialQty: 110
  },
  {
    sku: '03NM00990',
    name: 'Nước mắm CHIN-SU Hương Cá Hồi Thượng Hạng 15chai x 500ml',
    categoryId: 3n,
    unit: 'THÙNG',
    retailUnit: 'Chai',
    productType: 'FG',
    stdSku: 'CS_CA_HOI_500ML',
    stdSkuName: 'Nước mắm CHIN-SU Cá Hồi',
    groupStdSku: 'Nước Mắm Thượng Hạng',
    conversionRate: 15,
    basePrice: 585000,
    imageUrl: '/images/products/chinsu_sauce.jpg',
    retailImageUrl: '/images/products/chinsu_sauce.jpg',
    initialQty: 105
  },

  // --- DANH MỤC 4: Gia Vị & Nước Xốt (categoryId: 4) ---
  {
    sku: '03TO00010',
    name: 'Tương ớt CHIN-SU Cay Thượng Hạng Chai Đỏ 24chai x 250gr',
    categoryId: 4n,
    unit: 'THÙNG',
    retailUnit: 'Chai',
    productType: 'FG',
    stdSku: 'CS_CHILI_250G',
    stdSkuName: 'Tương ớt CHIN-SU Cay Thượng Hạng',
    groupStdSku: 'Tương Ớt & Tương Cà CHIN-SU',
    conversionRate: 24,
    basePrice: 288000,
    imageUrl: '/images/products/chinsu_chili.jpg',
    retailImageUrl: '/images/products/chinsu_chili.jpg',
    initialQty: 250
  },
  {
    sku: '03TO00020',
    name: 'Tương ớt CHIN-SU Wasabi Vị Nhật Bản Độc Lạ 24chai x 250gr',
    categoryId: 4n,
    unit: 'THÙNG',
    retailUnit: 'Chai',
    productType: 'FG',
    stdSku: 'CS_CHILI_WASABI',
    stdSkuName: 'Tương ớt CHIN-SU Wasabi',
    groupStdSku: 'Tương Ớt & Tương Cà CHIN-SU',
    conversionRate: 24,
    basePrice: 360000,
    imageUrl: '/images/products/chinsu_chili.jpg',
    retailImageUrl: '/images/products/chinsu_chili.jpg',
    initialQty: 100
  },
  {
    sku: '03TO00030',
    name: 'Tương ớt CHIN-SU Siêu Cay Vạn Người Mê 24chai x 250gr',
    categoryId: 4n,
    unit: 'THÙNG',
    retailUnit: 'Chai',
    productType: 'FG',
    stdSku: 'CS_CHILI_SIEUCAY',
    stdSkuName: 'Tương ớt CHIN-SU Siêu Cay',
    groupStdSku: 'Tương Ớt & Tương Cà CHIN-SU',
    conversionRate: 24,
    basePrice: 312000,
    imageUrl: '/images/products/chinsu_chili.jpg',
    retailImageUrl: '/images/products/chinsu_chili.jpg',
    initialQty: 140
  },
  {
    sku: '03TO00040',
    name: 'Tương cà CHIN-SU Cà Chua Tươi Tự Nhiên 24chai x 250gr',
    categoryId: 4n,
    unit: 'THÙNG',
    retailUnit: 'Chai',
    productType: 'FG',
    stdSku: 'CS_CATOMATO_250G',
    stdSkuName: 'Tương cà CHIN-SU Cà Chua',
    groupStdSku: 'Tương Ớt & Tương Cà CHIN-SU',
    conversionRate: 24,
    basePrice: 288000,
    imageUrl: '/images/products/chinsu_chili.jpg',
    retailImageUrl: '/images/products/chinsu_chili.jpg',
    initialQty: 120
  },
  {
    sku: '03TT00010',
    name: 'Nước tương Tam Thái Tử Nhất Ca Đậm Đặc 15chai x 500ml',
    categoryId: 4n,
    unit: 'THÙNG',
    retailUnit: 'Chai',
    productType: 'FG',
    stdSku: 'TTT_NHAT_CA_500ML',
    stdSkuName: 'Nước tương Tam Thái Tử Nhất Ca',
    groupStdSku: 'Nước Tương Tam Thái Tử',
    conversionRate: 15,
    basePrice: 255000,
    imageUrl: '/images/products/chinsu_sauce.jpg',
    retailImageUrl: '/images/products/chinsu_sauce.jpg',
    initialQty: 150
  },
  {
    sku: '03TT00020',
    name: 'Nước tương Tam Thái Tử Nhị Ca Tiết Kiệm 15chai x 500ml',
    categoryId: 4n,
    unit: 'THÙNG',
    retailUnit: 'Chai',
    productType: 'FG',
    stdSku: 'TTT_NHI_CA_500ML',
    stdSkuName: 'Nước tương Tam Thái Tử Nhị Ca',
    groupStdSku: 'Nước Tương Tam Thái Tử',
    conversionRate: 15,
    basePrice: 195000,
    imageUrl: '/images/products/chinsu_sauce.jpg',
    retailImageUrl: '/images/products/chinsu_sauce.jpg',
    initialQty: 180
  },
  {
    sku: '03HN00010',
    name: 'Hạt nêm CHIN-SU Ngọt Tôm Thơm Thịt 12gói x 800gr',
    categoryId: 4n,
    unit: 'THÙNG',
    retailUnit: 'Gói',
    productType: 'FG',
    stdSku: 'CS_HATNEM_TOM_800G',
    stdSkuName: 'Hạt nêm CHIN-SU Tôm Thịt',
    groupStdSku: 'Gia Vị & Hạt Nêm CHIN-SU',
    conversionRate: 12,
    basePrice: 420000,
    imageUrl: '/images/products/chinsu_sauce.jpg',
    retailImageUrl: '/images/products/chinsu_sauce.jpg',
    initialQty: 110
  },
  {
    sku: '03HN00020',
    name: 'Hạt nêm CHIN-SU Thịt Heo Xương Hầm Cô Đặc 12gói x 900gr',
    categoryId: 4n,
    unit: 'THÙNG',
    retailUnit: 'Gói',
    productType: 'FG',
    stdSku: 'CS_HATNEM_XUONG_900G',
    stdSkuName: 'Hạt nêm CHIN-SU Xương Hầm',
    groupStdSku: 'Gia Vị & Hạt Nêm CHIN-SU',
    conversionRate: 12,
    basePrice: 444000,
    imageUrl: '/images/products/chinsu_sauce.jpg',
    retailImageUrl: '/images/products/chinsu_sauce.jpg',
    initialQty: 115
  },
  {
    sku: '03MR00050',
    name: 'Xốt Ướp Nướng BBQ CHIN-SU Ngũ Vị Gia Vị Hoàn Chỉnh 24gói x 70gr',
    categoryId: 4n,
    unit: 'THÙNG',
    retailUnit: 'Gói',
    productType: 'FG',
    stdSku: 'CS_XOT_BBQ_70G',
    stdSkuName: 'Xốt BBQ CHIN-SU',
    groupStdSku: 'Xốt Gia Vị Hoàn Chỉnh',
    conversionRate: 24,
    basePrice: 264000,
    imageUrl: '/images/products/chinsu_sauce.jpg',
    retailImageUrl: '/images/products/chinsu_sauce.jpg',
    initialQty: 95
  },

  // --- DANH MỤC 5: Cà Phê & Thức Uống (categoryId: 5) ---
  {
    sku: '00CF00095',
    name: 'Cà phê hòa tan Vinacafé CHẤT 3in1 Sài Gòn Đậm Vị 24bịch x 290gr',
    categoryId: 5n,
    unit: 'THÙNG',
    retailUnit: 'Bịch',
    productType: 'FG',
    stdSku: 'VCF_CHAT_290G',
    stdSkuName: 'Vinacafé CHẤT Sài Gòn',
    groupStdSku: 'Cà Phê Hòa Tan Vinacafé',
    conversionRate: 24,
    basePrice: 552000,
    imageUrl: '/images/products/coffee.jpg',
    retailImageUrl: '/images/products/coffee.jpg',
    initialQty: 120
  },
  {
    sku: '00CF00102',
    name: 'Nước tăng lực vị cà phê Wake-up 247 chai 24chai x 330ml',
    categoryId: 5n,
    unit: 'THÙNG',
    retailUnit: 'Chai',
    productType: 'FG',
    stdSku: 'WU_247_CHAI_330ML',
    stdSkuName: 'Wake-up 247 Chai',
    groupStdSku: 'Nước Tăng Lực Wake-up 247',
    conversionRate: 24,
    basePrice: 216000,
    imageUrl: '/images/products/coffee.jpg',
    retailImageUrl: '/images/products/coffee.jpg',
    initialQty: 250
  },
  {
    sku: '00CF00105',
    name: 'Nước tăng lực vị cà phê Wake-up 247 lon tiện lợi 24lon x 245ml',
    categoryId: 5n,
    unit: 'THÙNG',
    retailUnit: 'Lon',
    productType: 'FG',
    stdSku: 'WU_247_LON_245ML',
    stdSkuName: 'Wake-up 247 Lon',
    groupStdSku: 'Nước Tăng Lực Wake-up 247',
    conversionRate: 24,
    basePrice: 228000,
    imageUrl: '/images/products/coffee.jpg',
    retailImageUrl: '/images/products/coffee.jpg',
    initialQty: 200
  },
  {
    sku: '00CF00120',
    name: 'Cà phê sữa hòa tan Wake-up Café Sữa Đá 20hộp x 10gói x 20gr',
    categoryId: 5n,
    unit: 'THÙNG',
    retailUnit: 'Hộp',
    productType: 'FG',
    stdSku: 'WU_SUA_DA_200G',
    stdSkuName: 'Wake-up Café Sữa Đá',
    groupStdSku: 'Cà Phê Wake-up',
    conversionRate: 20,
    basePrice: 480000,
    imageUrl: '/images/products/coffee.jpg',
    retailImageUrl: '/images/products/coffee.jpg',
    initialQty: 100
  },
  {
    sku: '00CF00135',
    name: 'Cà phê sữa Vinacafé Biên Hòa Gold 3in1 Hảo Hạng 24bịch x 20gói x 20gr',
    categoryId: 5n,
    unit: 'THÙNG',
    retailUnit: 'Bịch',
    productType: 'FG',
    stdSku: 'VCF_GOLD_400G',
    stdSkuName: 'Vinacafé Gold 3in1',
    groupStdSku: 'Cà Phê Hòa Tan Vinacafé',
    conversionRate: 24,
    basePrice: 624000,
    imageUrl: '/images/products/coffee.jpg',
    retailImageUrl: '/images/products/coffee.jpg',
    initialQty: 90
  },
  {
    sku: '00TU00010',
    name: 'Nước khoáng thiên nhiên Vĩnh Hảo có ga bổ sung khoáng 24chai x 500ml',
    categoryId: 5n,
    unit: 'THÙNG',
    retailUnit: 'Chai',
    productType: 'FG',
    stdSku: 'VH_GA_500ML',
    stdSkuName: 'Nước khoáng có ga Vĩnh Hảo',
    groupStdSku: 'Nước Khoáng Vĩnh Hảo',
    conversionRate: 24,
    basePrice: 192000,
    imageUrl: '/images/products/coffee.jpg',
    retailImageUrl: '/images/products/coffee.jpg',
    initialQty: 140
  },
  {
    sku: '00TU00020',
    name: 'Nước khoáng thiên nhiên không ga cao cấp Vivant 24chai x 500ml',
    categoryId: 5n,
    unit: 'THÙNG',
    retailUnit: 'Chai',
    productType: 'FG',
    stdSku: 'VIVANT_500ML',
    stdSkuName: 'Nước khoáng Vivant',
    groupStdSku: 'Nước Khoáng Vĩnh Hảo',
    conversionRate: 24,
    basePrice: 180000,
    imageUrl: '/images/products/coffee.jpg',
    retailImageUrl: '/images/products/coffee.jpg',
    initialQty: 160
  }
];

async function main() {
  console.log('=== BẮT ĐẦU DỌN DẸP VÀ SINH DỮ LIỆU SẢN PHẨM FMCG ===');

  // 1. XÓA CÁC SẢN PHẨM TIẾNG CAMPUCHIA (KHMER)
  const allProducts = await prisma.product.findMany();
  const khmerProducts = allProducts.filter(p => /[\u1780-\u17FF]/.test(p.name));
  console.log(`\n🔍 Tìm thấy ${khmerProducts.length} sản phẩm tiếng Khmer cần xóa.`);

  if (khmerProducts.length > 0) {
    const khmerIds = khmerProducts.map(p => p.id);
    const khmerLots = await prisma.stockLot.findMany({ where: { productId: { in: khmerIds } } });
    const lotIds = khmerLots.map(l => l.id);

    console.log(`-> Xóa ${lotIds.length} bản ghi tồn kho StockBalance liên quan...`);
    if (lotIds.length > 0) {
      await prisma.stockBalance.deleteMany({ where: { lotId: { in: lotIds } } });
    }

    console.log(`-> Xóa ${khmerLots.length} lô StockLot liên quan...`);
    await prisma.stockLot.deleteMany({ where: { productId: { in: khmerIds } } });

    console.log(`-> Xóa ${khmerProducts.length} sản phẩm tiếng Khmer khỏi bảng Product...`);
    const deleteResult = await prisma.product.deleteMany({ where: { id: { in: khmerIds } } });
    console.log(`✓ Đã xóa thành công ${deleteResult.count} sản phẩm tiếng Khmer!`);
  }

  // 2. CẬP NHẬT GIÁ CÁC SẢN PHẨM CÀ PHÊ BAN ĐẦU CÓ GIÁ 0 ĐỒNG
  await prisma.product.updateMany({
    where: {
      sku: { in: ['00CF00080', '00CF00080Z'] },
      basePrice: 0
    },
    data: {
      basePrice: 265000,
      unit: 'THÙNG',
      retailUnit: 'Bịch',
      conversionRate: 12,
      groupStdSku: 'Cà Phê Wake-up'
    }
  });
  console.log('✓ Đã cập nhật giá chuẩn cho sản phẩm Cà phê Wake-up Mekong cũ.');

  // 3. TÌM KHO HÀNG TEST HIỆN TẠI ĐỂ TẠO TỒN KHO CHO SẢN PHẨM MỚI
  const warehouse = await prisma.warehouse.findFirst({
    where: { status: true }
  });

  if (!warehouse) {
    throw new Error('Không tìm thấy kho hàng hợp lệ trong hệ thống!');
  }
  console.log(`\n📦 Sử dụng kho hàng: [${warehouse.code}] ${warehouse.name} (ID: ${warehouse.id})`);

  // 4. TẠO HOẶC CẬP NHẬT TỪNG SẢN PHẨM MỚI
  console.log(`\n🚀 Đang thêm ${NEW_PRODUCTS.length} sản phẩm FMCG mới...`);
  let addedCount = 0;
  let updatedCount = 0;

  for (const item of NEW_PRODUCTS) {
    const existing = await prisma.product.findUnique({
      where: { sku: item.sku }
    });

    let product;
    if (existing) {
      product = await prisma.product.update({
        where: { id: existing.id },
        data: {
          name: item.name,
          categoryId: item.categoryId,
          unit: item.unit,
          retailUnit: item.retailUnit,
          productType: item.productType,
          stdSku: item.stdSku,
          stdSkuName: item.stdSkuName,
          groupStdSku: item.groupStdSku,
          conversionRate: item.conversionRate,
          basePrice: item.basePrice,
          imageUrl: item.imageUrl,
          retailImageUrl: item.retailImageUrl,
          status: true
        }
      });
      updatedCount++;
    } else {
      product = await prisma.product.create({
        data: {
          sku: item.sku,
          name: item.name,
          categoryId: item.categoryId,
          unit: item.unit,
          retailUnit: item.retailUnit,
          productType: item.productType,
          stdSku: item.stdSku,
          stdSkuName: item.stdSkuName,
          groupStdSku: item.groupStdSku,
          conversionRate: item.conversionRate,
          basePrice: item.basePrice,
          imageUrl: item.imageUrl,
          retailImageUrl: item.retailImageUrl,
          status: true
        }
      });
      addedCount++;
    }

    // Tạo Lô hàng (StockLot) và Tồn kho (StockBalance) để sản phẩm sẵn sàng giao dịch
    const lotNumber = `LOT${new Date().getFullYear()}${(item.sku.slice(-4))}`;
    const mfgDate = new Date('2026-08-01T00:00:00Z');
    const expDate = new Date('2027-08-01T00:00:00Z');

    let lot = await prisma.stockLot.findUnique({
      where: {
        productId_warehouseId_lotNumber: {
          productId: product.id,
          warehouseId: warehouse.id,
          lotNumber: lotNumber
        }
      }
    });

    if (!lot) {
      lot = await prisma.stockLot.create({
        data: {
          productId: product.id,
          warehouseId: warehouse.id,
          lotNumber: lotNumber,
          manufactureDate: mfgDate,
          expiryDate: expDate,
          status: 'GOOD',
          locationCode: 'KHO-TEST-A1',
          locationName: 'Dãy A Kệ 01'
        }
      });
    }

    // Upsert tồn kho (StockBalance)
    const totalSmallQty = item.initialQty * item.conversionRate;
    await prisma.stockBalance.upsert({
      where: { lotId: lot.id },
      update: {
        quantityOnHand: totalSmallQty,
        quantityReserved: 0
      },
      create: {
        lotId: lot.id,
        quantityOnHand: totalSmallQty,
        quantityReserved: 0
      }
    });
  }

  console.log(`\n🎉 Hoàn thành!`);
  console.log(`- Đã thêm mới: ${addedCount} sản phẩm`);
  console.log(`- Đã cập nhật: ${updatedCount} sản phẩm`);

  // Thống kê lại số lượng sản phẩm theo từng danh mục
  const categories = await prisma.productCategory.findMany({
    include: {
      _count: {
        select: {
          products: {
            where: { status: true }
          }
        }
      }
    },
    orderBy: { id: 'asc' }
  });

  console.log('\n📊 Thống kê sản phẩm theo Danh mục:');
  categories.forEach(c => {
    console.log(`- [${c.id}] ${c.name}: ${c._count.products} sản phẩm đang kinh doanh`);
  });

  const totalActive = await prisma.product.count({ where: { status: true } });
  console.log(`\nTổng số sản phẩm đang hoạt động: ${totalActive} sản phẩm.`);
}

main()
  .catch(err => {
    console.error('Lỗi khi thực thi:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
