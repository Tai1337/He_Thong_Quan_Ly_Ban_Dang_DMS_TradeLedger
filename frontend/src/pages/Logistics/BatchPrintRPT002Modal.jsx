import { useState, useEffect } from 'react';
import { X, Printer, AlertTriangle, Layers, RotateCcw } from 'lucide-react';
import { getBatchDeliveryTrips } from '../../services/api';
import RPT002PrintView from './Reports/RPT002PrintView';
import './BatchPrintRPT002Modal.css';

export default function BatchPrintRPT002Modal({ isOpen, onClose, tripIds = [] }) {
  const [tripsData, setTripsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen || tripIds.length === 0) {
      setTripsData([]);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError('');

    getBatchDeliveryTrips(tripIds, 1)
      .then((data) => {
        if (isMounted) {
          setTripsData(data || []);
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) {
          setError(err.message || 'Không thể tải dữ liệu gộp chuyến xe');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, JSON.stringify(tripIds)]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="batch-modal-overlay">
      <div className="batch-modal-container">
        {/* Modal Header */}
        <div className="batch-modal-header no-print">
          <div className="batch-modal-title">
            <div className="batch-icon-wrapper">
              <Layers size={20} color="#2563eb" />
            </div>
            <div>
              <h3>In Tổng Hợp Phiếu Xuất Kho (RPT002)</h3>
              <p>
                Gộp hàng hóa từ <strong>{tripIds.length}</strong> chuyến xe được chọn để thủ kho gom hàng bốc xếp một lượt
              </p>
            </div>
          </div>

          <div className="batch-modal-actions">
            <button
              type="button"
              className="btn-batch-print"
              onClick={handlePrint}
              disabled={loading || tripsData.length === 0}
            >
              <Printer size={16} />
              <span>In Khổ A4 ({tripIds.length} chuyến)</span>
            </button>
            <button type="button" className="btn-batch-close" onClick={onClose} title="Đóng cửa sổ">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="batch-modal-body">
          {loading ? (
            <div className="batch-loading-state no-print">
              <div className="batch-spinner"></div>
              <p>Đang tải dữ liệu tổng hợp từ các chuyến xe...</p>
            </div>
          ) : error ? (
            <div className="batch-error-state no-print">
              <AlertTriangle size={32} color="#dc2626" />
              <p>{error}</p>
            </div>
          ) : tripsData.length === 0 ? (
            <div className="batch-empty-state no-print">
              <p>Không có dữ liệu chuyến xe nào.</p>
            </div>
          ) : (
            <div className="batch-print-content">
              <RPT002PrintView trips={tripsData} currentUserName="Thủ kho gom hàng" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
