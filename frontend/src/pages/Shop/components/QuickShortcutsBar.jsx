import React from 'react';
import { 
  Zap, 
  Flame, 
  Truck, 
  BadgePercent, 
  Gift, 
  ClipboardList, 
  CalendarCheck, 
  PhoneCall 
} from 'lucide-react';
import './QuickShortcutsBar.css';

const SHORTCUTS = [
  {
    id: 'flash_deal',
    label: 'Flash Deal Sỉ',
    badge: 'HOT',
    icon: Zap,
    color: '#dc2626',
    bg: '#fef2f2'
  },
  {
    id: 'top_seller',
    label: 'Top Bán Chạy',
    icon: Flame,
    color: '#ea580c',
    bg: '#fff7ed'
  },
  {
    id: 'dms_truck',
    label: 'Tuyến Xe 24h',
    badge: 'Freeship',
    icon: Truck,
    color: '#0284c7',
    bg: '#f0f9ff'
  },
  {
    id: 'b2b_price',
    label: 'Báo Giá Sỉ B2B',
    badge: '-12%',
    icon: BadgePercent,
    color: '#059669',
    bg: '#ecfdf5'
  },
  {
    id: 'case_promo',
    label: 'Khuyến Mãi Thùng',
    icon: Gift,
    color: '#7c3aed',
    bg: '#f5f3ff'
  },
  {
    id: 'track_order',
    label: 'Tra Cứu Đơn R-',
    icon: ClipboardList,
    color: '#0d9488',
    bg: '#f0fdfa'
  },
  {
    id: 'date_guarantee',
    label: 'Cam Kết Date Mới',
    icon: CalendarCheck,
    color: '#16a34a',
    bg: '#f0fdf4'
  },
  {
    id: 'hotline',
    label: 'Tổng Đài Hỗ Trợ',
    sub: '1900 6868',
    icon: PhoneCall,
    color: '#e11d48',
    bg: '#fff1f2'
  }
];

export default function QuickShortcutsBar({ onSelectShortcut, onOpenLookup, onOpenAuth }) {
  const handleClick = (item) => {
    if (item.id === 'track_order') {
      onOpenLookup?.();
    } else if (item.id === 'b2b_price') {
      onOpenAuth?.();
    } else {
      onSelectShortcut?.(item.id);
    }
  };

  return (
    <section className="quick-shortcuts-section">
      <div className="shop-container">
        <div className="shortcuts-track">
          {SHORTCUTS.map((item) => {
            const IconComponent = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className="shortcut-btn"
                onClick={() => handleClick(item)}
              >
                <div className="shortcut-icon-circle" style={{ backgroundColor: item.bg, color: item.color }}>
                  <IconComponent size={22} strokeWidth={2.2} />
                  {item.badge && (
                    <span className="shortcut-pill-badge">{item.badge}</span>
                  )}
                </div>
                <span className="shortcut-title">{item.label}</span>
                {item.sub && <span className="shortcut-sub">{item.sub}</span>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
