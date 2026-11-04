import React from 'react';
import { 
  Coffee, 
  Utensils, 
  Wine, 
  Cookie, 
  Milk, 
  Sparkles, 
  Package, 
  Droplet,
  Layers
} from 'lucide-react';
import './CategoryGridSection.css';

const CATEGORY_ICONS = {
  'Mì': Utensils,
  'Phở': Utensils,
  'Xúc xích': Package,
  'Nước mắm': Droplet,
  'Nước chấm': Droplet,
  'Gia vị': Sparkles,
  'Cà phê': Coffee,
  'Thức uống': Wine,
  'Đồ uống': Wine,
  'Bánh kẹo': Cookie,
  'Sữa': Milk,
  'Dầu ăn': Droplet,
  'Hoá phẩm': Sparkles,
};

function getCategoryIcon(name = '') {
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) {
      return icon;
    }
  }
  return Package;
}

export default function CategoryGridSection({ 
  categories = [], 
  selectedCategory, 
  onSelectCategory 
}) {
  return (
    <section className="shop-category-bar-section">
      <div className="shop-container">
        <div className="category-pills-scroll">
          {/* All categories pill */}
          <button
            type="button"
            className={`category-pill-btn ${selectedCategory === null ? 'active' : ''}`}
            onClick={() => onSelectCategory(null)}
          >
            <Layers size={16} />
            <span>Tất Cả Ngành Hàng</span>
          </button>

          {/* List of categories */}
          {categories.map((cat) => {
            const IconComp = getCategoryIcon(cat.name);
            const isSelected = selectedCategory === cat.id;

            return (
              <button
                key={cat.id}
                type="button"
                className={`category-pill-btn ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectCategory(cat.id)}
              >
                <IconComp size={16} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
