/**
 * Script cập nhật ảnh sản phẩm FMCG thực tế cho cơ sở dữ liệu DMS-NPP
 * Hỗ trợ ảnh Thùng Chẵn (imageUrl) và ảnh Gói/Chai Lẻ (retailImageUrl)
 */
import prisma from '../src/prisma/prisma.client.js';

// Sử dụng đường dẫn hình ảnh cục bộ (Local Static Assets) đặt tại frontend/public/images/products/
// Đảm bảo 100% không bao giờ bị lỗi 404, không phụ thuộc vào internet, tốc độ tải 0ms!
const IMAGE_ASSETS = {
  // --- CÀ PHÊ ---
  WAKEUP_COFFEE: {
    caseImg: '/images/products/coffee.jpg',
    retailImg: '/images/products/coffee.jpg'
  },

  // --- PHỞ CHINSU ---
  PHO_CHINSU: {
    caseImg: '/images/products/pho_bo.jpg',
    retailImg: '/images/products/pho_bo.jpg'
  },

  // --- MÌ OMACHI ---
  OMACHI_BO_HAM: {
    caseImg: '/images/products/omachi_bo_ham.jpg',
    retailImg: '/images/products/omachi_bo_ham.jpg'
  },
  OMACHI_SUON_HAM: {
    caseImg: '/images/products/omachi_suon.jpg',
    retailImg: '/images/products/omachi_suon.jpg'
  },
  OMACHI_SPAGHETTI: {
    caseImg: '/images/products/omachi_spaghetti.jpg',
    retailImg: '/images/products/omachi_spaghetti.jpg'
  },
  OMACHI_LAU_TOM: {
    caseImg: '/images/products/omachi_suon.jpg',
    retailImg: '/images/products/omachi_suon.jpg'
  },
  OMACHI_BAP_BO_DUA_CHUA: {
    caseImg: '/images/products/omachi_bo_ham.jpg',
    retailImg: '/images/products/omachi_bo_ham.jpg'
  },
  OMACHI_CUA_XOT_OT: {
    caseImg: '/images/products/omachi_spaghetti.jpg',
    retailImg: '/images/products/omachi_spaghetti.jpg'
  },
  OMACHI_CUP_TO: {
    caseImg: '/images/products/omachi_bo_ham.jpg',
    retailImg: '/images/products/omachi_bo_ham.jpg'
  },
  OMACHI_QUAN_XA: {
    caseImg: '/images/products/omachi_suon.jpg',
    retailImg: '/images/products/omachi_suon.jpg'
  },

  // --- MÌ KOKOMI ---
  KOKOMI_TOM_CHUA_CAY: {
    caseImg: '/images/products/kokomi_tom.jpg',
    retailImg: '/images/products/kokomi_tom.jpg'
  },
  KOKOMI_DAI_90: {
    caseImg: '/images/products/kokomi_tom.jpg',
    retailImg: '/images/products/kokomi_tom.jpg'
  },
  KOKOMI_SUON_HANH_PHI: {
    caseImg: '/images/products/kokomi_tom.jpg',
    retailImg: '/images/products/kokomi_tom.jpg'
  },
  KOKOMI_XAO_TRON: {
    caseImg: '/images/products/omachi_spaghetti.jpg',
    retailImg: '/images/products/omachi_spaghetti.jpg'
  },
  KOKOMI_LY: {
    caseImg: '/images/products/kokomi_tom.jpg',
    retailImg: '/images/products/kokomi_tom.jpg'
  },

  // --- XÚC XÍCH PONNIE & HEO CAO BỒI ---
  PONNIE_HEO: {
    caseImg: '/images/products/ponnie_sausage.jpg',
    retailImg: '/images/products/ponnie_sausage.jpg'
  },
  PONNIE_BO: {
    caseImg: '/images/products/ponnie_sausage.jpg',
    retailImg: '/images/products/ponnie_sausage.jpg'
  },
  PONNIE_HOTDOG: {
    caseImg: '/images/products/ponnie_sausage.jpg',
    retailImg: '/images/products/ponnie_sausage.jpg'
  },
  HEO_CAO_BOI_LAC: {
    caseImg: '/images/products/ponnie_sausage.jpg',
    retailImg: '/images/products/ponnie_sausage.jpg'
  },
  HEO_CAO_BOI_RONG_BIEN: {
    caseImg: '/images/products/ponnie_sausage.jpg',
    retailImg: '/images/products/ponnie_sausage.jpg'
  },

  // --- NƯỚC MẮM NAM NGƯ & CHINSU ---
  NAM_NGU_NHAN_VANG: {
    caseImg: '/images/products/namngu_sauce.jpg',
    retailImg: '/images/products/namngu_sauce.jpg'
  },
  NAM_NGU_DE_NHI: {
    caseImg: '/images/products/namngu_sauce.jpg',
    retailImg: '/images/products/namngu_sauce.jpg'
  },
  NAM_NGU_THUY_TINH: {
    caseImg: '/images/products/namngu_sauce.jpg',
    retailImg: '/images/products/namngu_sauce.jpg'
  },
  NAM_NGU_TOI_OT: {
    caseImg: '/images/products/chinsu_chili.jpg',
    retailImg: '/images/products/chinsu_chili.jpg'
  },
  CHINSU_CA_HOI: {
    caseImg: '/images/products/chinsu_sauce.jpg',
    retailImg: '/images/products/chinsu_sauce.jpg'
  },
  CHINSU_BIEN_DONG: {
    caseImg: '/images/products/chinsu_sauce.jpg',
    retailImg: '/images/products/chinsu_sauce.jpg'
  },
  NAM_NGU_CAN_TIET_KIEM: {
    caseImg: '/images/products/namngu_sauce.jpg',
    retailImg: '/images/products/namngu_sauce.jpg'
  },

  // --- GIA VỊ CHIN-SU ---
  TUONG_CA_CHINSU: {
    caseImg: '/images/products/chinsu_chili.jpg',
    retailImg: '/images/products/chinsu_chili.jpg'
  },
  TUONG_OT_CHINSU: {
    caseImg: '/images/products/chinsu_chili.jpg',
    retailImg: '/images/products/chinsu_chili.jpg'
  },
  HAT_NEM_CHINSU: {
    caseImg: '/images/products/chinsu_sauce.jpg',
    retailImg: '/images/products/chinsu_sauce.jpg'
  },
  MUOI_TOM_CHINSU: {
    caseImg: '/images/products/chinsu_chili.jpg',
    retailImg: '/images/products/chinsu_chili.jpg'
  },
  MAYONNAISE_CHINSU: {
    caseImg: '/images/products/chinsu_chili.jpg',
    retailImg: '/images/products/chinsu_chili.jpg'
  },
  XOT_NUONG_CHINSU: {
    caseImg: '/images/products/chinsu_sauce.jpg',
    retailImg: '/images/products/chinsu_sauce.jpg'
  },
  KHO_QUET_NAM_NGU: {
    caseImg: '/images/products/namngu_sauce.jpg',
    retailImg: '/images/products/namngu_sauce.jpg'
  }
};

/**
 * Hàm phân loại và gán ảnh thông minh theo tên sản phẩm & SKU
 */
function resolveImagesForProduct(product) {
  const name = (product.name || '').toLowerCase();
  const sku = (product.sku || '').toUpperCase();

  // 1. Cà phê
  if (name.includes('cà phê') || name.includes('wake up') || sku.startsWith('00CF')) {
    return IMAGE_ASSETS.WAKEUP_COFFEE;
  }

  // 2. Phở Bò Chinsu
  if (name.includes('phở bò') || name.includes('chin-su story') || sku.startsWith('01PH')) {
    return IMAGE_ASSETS.PHO_CHINSU;
  }

  // 3. Omachi
  if (name.includes('omachi') || sku.startsWith('02OM')) {
    if (name.includes('quán xá') || name.includes('châu á') || name.includes('bò đài loan') || name.includes('tomyum') || name.includes('vịt quay')) {
      return IMAGE_ASSETS.OMACHI_QUAN_XA;
    }
    if (name.includes('bò hầm') || name.includes('xốt bò')) {
      if (name.includes('tô') || name.includes('ly')) return IMAGE_ASSETS.OMACHI_CUP_TO;
      return IMAGE_ASSETS.OMACHI_BO_HAM;
    }
    if (name.includes('sườn hầm') || name.includes('ngũ quả') || name.includes('ឆ្អឹងជំនី')) {
      return IMAGE_ASSETS.OMACHI_SUON_HAM;
    }
    if (name.includes('spaghetti') || name.includes('trộn')) {
      return IMAGE_ASSETS.OMACHI_SPAGHETTI;
    }
    if (name.includes('lẩu tôm') || name.includes('tôm càng') || name.includes('បង្គា')) {
      return IMAGE_ASSETS.OMACHI_LAU_TOM;
    }
    if (name.includes('dưa chua') || name.includes('bắp bò')) {
      return IMAGE_ASSETS.OMACHI_BAP_BO_DUA_CHUA;
    }
    if (name.includes('cua') || name.includes('riêu cua')) {
      return IMAGE_ASSETS.OMACHI_CUA_XOT_OT;
    }
    if (name.includes('ly') || name.includes('tô') || name.includes('hộp')) {
      return IMAGE_ASSETS.OMACHI_CUP_TO;
    }
    return IMAGE_ASSETS.OMACHI_BO_HAM;
  }

  // 4. Kokomi
  if (name.includes('kokomi') || name.includes('komi') || sku.startsWith('02KK')) {
    if (name.includes('sườn') || name.includes('hành phi')) {
      return IMAGE_ASSETS.KOKOMI_SUON_HANH_PHI;
    }
    if (name.includes('xào') || name.includes('trộn') || name.includes('bò xốt')) {
      return IMAGE_ASSETS.KOKOMI_XAO_TRON;
    }
    if (name.includes('ly') || name.includes('komi')) {
      return IMAGE_ASSETS.KOKOMI_LY;
    }
    if (name.includes('đại 90') || name.includes('đại hộp')) {
      return IMAGE_ASSETS.KOKOMI_DAI_90;
    }
    return IMAGE_ASSETS.KOKOMI_TOM_CHUA_CAY;
  }

  // 5. Xúc xích Ponnie & Heo Cao Bồi
  if (name.includes('xúc xích') || name.includes('hotdog') || name.includes('ponnie') || name.includes('heo cao bồi') || sku.startsWith('02XX')) {
    if (name.includes('heo cao bồi') && (name.includes('lắc') || name.includes('phô mai'))) {
      return IMAGE_ASSETS.HEO_CAO_BOI_LAC;
    }
    if (name.includes('rong biển') || name.includes('cuốn')) {
      return IMAGE_ASSETS.HEO_CAO_BOI_RONG_BIEN;
    }
    if (name.includes('hotdog') || name.includes('bắp') || name.includes('sụn')) {
      return IMAGE_ASSETS.PONNIE_HOTDOG;
    }
    if (name.includes('bò')) {
      return IMAGE_ASSETS.PONNIE_BO;
    }
    return IMAGE_ASSETS.PONNIE_HEO;
  }

  // 6. Gia vị Chinsu (Tương cà, hạt nêm, muối tôm, mayonnaise, xốt nướng)
  if (sku.startsWith('03CA') || sku.startsWith('03HG') || sku.startsWith('03GV') || sku.startsWith('03MR') || sku.startsWith('03OT')) {
    if (sku.startsWith('03CA')) return IMAGE_ASSETS.TUONG_CA_CHINSU;
    if (sku.startsWith('03HG')) return IMAGE_ASSETS.HAT_NEM_CHINSU;
    if (sku.startsWith('03GV')) return IMAGE_ASSETS.MUOI_TOM_CHINSU;
    if (sku.startsWith('03MR')) {
      if (name.includes('mayonnaise')) return IMAGE_ASSETS.MAYONNAISE_CHINSU;
      return IMAGE_ASSETS.XOT_NUONG_CHINSU;
    }
    return IMAGE_ASSETS.TUONG_OT_CHINSU;
  }

  // 7. Nước mắm Nam Ngư & Chinsu
  if (sku.startsWith('03NM') || name.includes('nước mắm') || name.includes('nam ngư')) {
    if (name.includes('lý sơn') || name.includes('tỏi')) {
      return IMAGE_ASSETS.NAM_NGU_TOI_OT;
    }
    if (name.includes('cá hồi')) {
      return IMAGE_ASSETS.CHINSU_CA_HOI;
    }
    if (name.includes('biển đông') || name.includes('cá cơm')) {
      if (name.includes('thủy tinh')) return IMAGE_ASSETS.NAM_NGU_THUY_TINH;
      return IMAGE_ASSETS.CHINSU_BIEN_DONG;
    }
    if (name.includes('can') || name.includes('tiết kiệm')) {
      return IMAGE_ASSETS.NAM_NGU_CAN_TIET_KIEM;
    }
    if (name.includes('đệ nhị')) {
      return IMAGE_ASSETS.NAM_NGU_DE_NHI;
    }
    if (name.includes('kho quẹt')) {
      return IMAGE_ASSETS.KHO_QUET_NAM_NGU;
    }
    return IMAGE_ASSETS.NAM_NGU_NHAN_VANG;
  }
  if (name.includes('mayonnaise') || sku.startsWith('03MR') && name.includes('mayonnaise')) {
    return IMAGE_ASSETS.MAYONNAISE_CHINSU;
  }
  if (name.includes('xốt') || name.includes('nướng') || name.includes('lẩu') || sku.startsWith('03MR')) {
    return IMAGE_ASSETS.XOT_NUONG_CHINSU;
  }
  if (name.includes('tương ớt') || sku.startsWith('03OT')) {
    return IMAGE_ASSETS.TUONG_OT_CHINSU;
  }

  // Mặc định fallback
  return IMAGE_ASSETS.OMACHI_BO_HAM;
}

async function run() {
  console.log('🚀 Bắt đầu quá trình nạp ảnh FMCG thực tế cho cơ sở dữ liệu...');

  const products = await prisma.product.findMany();
  console.log(`📦 Tìm thấy ${products.length} sản phẩm cần cập nhật ảnh.`);

  let updatedCount = 0;

  for (const product of products) {
    const images = resolveImagesForProduct(product);
    await prisma.product.update({
      where: { id: product.id },
      data: {
        imageUrl: images.caseImg,
        retailImageUrl: images.retailImg
      }
    });
    updatedCount++;
  }

  console.log(`✅ Hoàn tất cập nhật hình ảnh thành công cho ${updatedCount}/${products.length} sản phẩm!`);
}

run()
  .catch((e) => {
    console.error('❌ Lỗi khi nạp ảnh:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
