import { useParams, Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const SalesOrderDetail = () => {
  const { id } = useParams();

  return (
    <div style={{ padding: '24px', backgroundColor: 'white', borderRadius: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <Link to="/sales/sales-orders" style={{ color: '#64748b' }}>
          <ArrowLeft size={20} />
        </Link>
        <h2 style={{ margin: 0, fontSize: '20px' }}>Chi tiết Đơn hàng: {id}</h2>
      </div>
      
      <p>Trang chi tiết đang được phát triển...</p>
    </div>
  );
};

export default SalesOrderDetail;
