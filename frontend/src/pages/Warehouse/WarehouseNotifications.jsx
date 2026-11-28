import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCheck, Circle } from 'lucide-react';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../../services/api';
import { useNotification } from '../../components/Common/NotificationProvider';
import { Button } from '../../components/ui/button';
import { PageHeader, FilterToolbar, StatusBadge, DataTable } from '../../components/shared';
import '../Inventory/InventoryCount/InventoryCountList.css';

const WarehouseNotifications = () => {
  const navigate = useNavigate();
  const { notify } = useNotification();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [syncTime, setSyncTime] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await getNotifications({
        unread: activeTab === 'unread' ? 'true' : undefined,
        limit: 50,
      });
      setNotifications(res?.data || []);
      setUnreadCount(res?.unreadCount ?? 0);
      const now = new Date();
      setSyncTime(
        `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')} ${now.getHours() >= 12 ? 'CH' : 'SA'}`,
      );
    } catch (err) {
      notify.error(err.message || 'Không thể tải thông báo');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [activeTab]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      notify.success('Đã đánh dấu tất cả thông báo là đã đọc');
    } catch (err) {
      notify.error(err.message || 'Lỗi khi cập nhật thông báo');
    }
  };

  const handleClickItem = async (item) => {
    try {
      if (!item.isRead) {
        await markNotificationRead(item.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // ignore
    }
    if (item.navigateTo) {
      navigate(item.navigateTo);
    }
  };

  const filtered = notifications.filter((n) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (n.title && n.title.toLowerCase().includes(q)) ||
      (n.body && n.body.toLowerCase().includes(q))
    );
  });

  const columns = [
    {
      title: 'TRẠNG THÁI',
      key: 'isRead',
      render: (_, row) =>
        row.isRead ? (
          <StatusBadge variant="neutral" dot={false} label="Đã đọc" />
        ) : (
          <StatusBadge variant="primary" dot label="Chưa đọc" />
        ),
    },
    {
      title: 'TIÊU ĐỀ',
      key: 'title',
      render: (_, row) => (
        <span
          className="erp-count-code"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
          onClick={() => handleClickItem(row)}
        >
          {!row.isRead && <Circle size={8} fill="#2563eb" color="#2563eb" />}
          {row.title}
        </span>
      ),
    },
    {
      title: 'NỘI DUNG',
      key: 'body',
      render: (_, row) => <span className="erp-author-text">{row.body}</span>,
    },
    {
      title: 'THỜI GIAN',
      key: 'createdAt',
      render: (_, row) => new Date(row.createdAt).toLocaleString('vi-VN'),
    },
    {
      title: 'THAO TÁC',
      key: 'actions',
      align: 'right',
      render: (_, row) => (
        <button
          type="button"
          className="erp-action-link"
          onClick={() => handleClickItem(row)}
        >
          Mở liên kết
        </button>
      ),
    },
  ];

  return (
    <div className="inventory-count-erp-page">
      <PageHeader
        breadcrumb="DMS-NPP TradeLedger / Thủ kho / Thông báo"
        title="Trung Tâm Thông Báo"
        badge="Realtime"
        description="Theo dõi thông báo phiếu kiểm kê được giao, phản hồi duyệt/từ chối và yêu cầu xuất kho."
        actions={
          <Button
            variant="outline"
            onClick={handleMarkAllRead}
            className="btn-erp-header-action"
          >
            <CheckCheck size={16} />
            <span>Đánh dấu tất cả đã đọc</span>
          </Button>
        }
      />

      <FilterToolbar
        tabs={[
          { id: 'all', label: 'Tất cả thông báo', count: notifications.length },
          { id: 'unread', label: 'Chưa đọc', count: unreadCount, variant: 'primary' },
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        syncTime={syncTime}
        onRefresh={fetchNotifications}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Tìm theo tiêu đề hoặc nội dung thông báo..."
        onReset={() => {
          setActiveTab('all');
          setSearch('');
        }}
      />

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        emptyText="Không có thông báo nào"
      />
    </div>
  );
};

export default WarehouseNotifications;
