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

// Preset icon mappings for FMCG categories
const CATEGORY_ICONS = {
  'Gia vị': { icon: Utensils, color: '#f97316', bg: '#fff7ed' },
  'Nước giải khát': { icon: Wine, color: '#0284c7', bg: '#f0f9ff' },
  'Đồ uống': { icon: Wine, color: '#0284c7', bg: '#f0f9ff' },
  'Mì': { icon: Utensils, color: '#eab308', bg: '#fefce8' },
  'Bánh kẹo': { icon: Cookie, color: '#ec4899', bg: '#fdf2f8' },
  'Sữa': { icon: Milk, color: '#3b82f6', bg: '#eff6ff' },
  'Cà phê': { icon: Coffee, color: '#78350f', bg: '#fef3c7' },
  'Dầu ăn': { icon: Droplet, color: '#ca8a04', bg: '#fef9c3' },
  'Hoá phẩm': { icon: Sparkles, color: '#10b981', bg: '#ecfdf5' },
};

function getCategoryTheme(name = '') {
  for (const [key, theme] of Object.entries(CATEGORY_ICONS)) {
    if (name.toLowerCase().includes(key.toLowerCase())) {
      return theme;
    }
  }
  return { icon: Package, color: '#059669', bg: '#ecfdf5' };
}

export default function CategoryGridSection({ 
  categories = [], 
  selectedCategory, 
  onSelectCategory 
}) {
  return (
    <section className="category-grid-section">
      <div className="shop-container">
        <div className="category-box-card">
          <div className="category-box-header">
            <div className="category-header-title">
              <Layers size={18} color="#059669" />
              <h3>DANH MỤC NGÀNH HÀNG FMCG</h3>
            </div>
            {selectedCategory && (
              <button 
                type="button" 
                className="category-clear-filter-btn"
                onClick={() => onSelectCategory(null)}
              >
                Xem tất cả ngành hàng
              </button>
            )}
          </div>

          <div className="category-two-rows-grid">
            {/* "All categories" card */}
            <div
              className={`category-item-card ${selectedCategory === null ? 'active' : ''}`}
              onClick={() => onSelectCategory(null)}
            >
              <div className="cat-icon-frame" style={{ backgroundColor: '#ecfdf5', color: '#059669' }}>
                <Layers size={24} />
              </div>
              <span className="cat-name">Tất Cả Sản Phẩm</span>
            </div>

            {/* List of categories */}
            {categories.map((cat) => {
              const theme = getCategoryTheme(cat.name);
              const IconComp = theme.icon;
              const isSelected = selectedCategory === cat.id;

              return (
                <div
                  key={cat.id}
                  className={`category-item-card ${isSelected ? 'active' : ''}`}
                  onClick={() => onSelectCategory(cat.id)}
                >
                  <div 
                    className="cat-icon-frame" 
                    style={{ backgroundColor: theme.bg, color: theme.color }}
                  >
                    <IconComp size={24} />
                  </div>
                  <span className="cat-name">{cat.name}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
