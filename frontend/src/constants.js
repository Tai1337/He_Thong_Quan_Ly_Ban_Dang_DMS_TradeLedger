import { 
  Coffee, 
  Utensils, 
  Car, 
  ShoppingBag, 
  Home, 
  Zap, 
  HeartPulse, 
  GraduationCap, 
  Smartphone,
  MoreHorizontal
} from 'lucide-react';

export const CATEGORIES = [
  { id: 'food', name: 'Ăn uống', icon: Utensils, color: '#f59e0b' },
  { id: 'coffee', name: 'Cà phê', icon: Coffee, color: '#d97706' },
  { id: 'transport', name: 'Đi lại', icon: Car, color: '#3b82f6' },
  { id: 'shopping', name: 'Mua sắm', icon: ShoppingBag, color: '#ec4899' },
  { id: 'home', name: 'Nhà cửa', icon: Home, color: '#10b981' },
  { id: 'bills', name: 'Hóa đơn', icon: Zap, color: '#eab308' },
  { id: 'health', name: 'Sức khỏe', icon: HeartPulse, color: '#ef4444' },
  { id: 'education', name: 'Học tập', icon: GraduationCap, color: '#8b5cf6' },
  { id: 'phone', name: 'Điện thoại', icon: Smartphone, color: '#06b6d4' },
  { id: 'other', name: 'Khác', icon: MoreHorizontal, color: '#9ca3af' },
];

export const getCategory = (id) => {
  return CATEGORIES.find(c => c.id === id) || CATEGORIES[CATEGORIES.length - 1];
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
};
