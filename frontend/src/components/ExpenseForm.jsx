import { useState } from 'react';
import { CATEGORIES } from '../constants';
import { Plus } from 'lucide-react';

export default function ExpenseForm({ onAddExpense }) {
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }
    
    onAddExpense({
      id: crypto.randomUUID(),
      amount: Number(amount),
      categoryId,
      date,
      note,
      timestamp: Date.now()
    });
    
    setAmount('');
    setNote('');
    // keep date and category for easy bulk entry
  };

  return (
    <div className="card" style={{ marginBottom: '2rem' }}>
      <h2 className="card-title" style={{ marginBottom: '1.5rem', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
        Thêm chi tiêu mới
      </h2>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label htmlFor="amount">Số tiền (VNĐ)</label>
            <input
              type="number"
              id="amount"
              className="form-control"
              placeholder="VD: 50000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="category">Danh mục</label>
            <select
              id="category"
              className="form-control"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="date">Ngày</label>
            <input
              type="date"
              id="date"
              className="form-control"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="note">Ghi chú</label>
            <input
              type="text"
              id="note"
              className="form-control"
              placeholder="Chi tiết (Tùy chọn)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="submit" className="btn btn-primary">
            <Plus size={18} />
            Thêm khoản chi
          </button>
        </div>
      </form>
    </div>
  );
}
