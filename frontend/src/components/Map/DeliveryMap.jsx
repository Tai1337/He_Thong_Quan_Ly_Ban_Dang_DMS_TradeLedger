/**
 * DeliveryMap Component
 * Bản đồ giao hàng dùng Leaflet.js + OpenStreetMap (miễn phí, không cần API key)
 * Dùng chung cho: TripDispatchConsole, SalesOrderDetail, RetailerList
 *
 * Props:
 *  - stops: Array of { stopNumber, retailerName, retailerCode, address, phone,
 *                      orderCode, status, lat, lng, totalAmount }
 *  - height: string (default '420px')
 *  - showRoute: boolean - có vẽ đường tuyến không (default true)
 *  - mode: 'trip' | 'mini' | 'full'  (default 'trip')
 *  - center: [lat, lng] - tâm bản đồ mặc định (default trung tâm TP HCM)
 */
import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, ExternalLink } from 'lucide-react';
import './DeliveryMap.css';

// Fix icon leaflet bị vỡ với Vite
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const STATUS_CONFIG = {
  DELIVERED: {
    color: '#16a34a',
    bgColor: '#dcfce7',
    textColor: '#15803d',
    label: 'Đã giao',
    headerClass: 'status-delivered',
    badgeClass: 'delivered',
  },
  DELIVERY_FAILED: {
    color: '#dc2626',
    bgColor: '#fee2e2',
    textColor: '#b91c1c',
    label: 'Giao thất bại',
    headerClass: 'status-failed',
    badgeClass: 'failed',
  },
  SHIPPED: {
    color: '#d97706',
    bgColor: '#fef3c7',
    textColor: '#92400e',
    label: 'Đang giao',
    headerClass: 'status-shipping',
    badgeClass: 'shipping',
  },
  ALLOCATED: {
    color: '#2563eb',
    bgColor: '#eff6ff',
    textColor: '#1d4ed8',
    label: 'Chờ giao',
    headerClass: '',
    badgeClass: 'pending',
  },
  DEFAULT: {
    color: '#2563eb',
    bgColor: '#eff6ff',
    textColor: '#1d4ed8',
    label: 'Điểm giao',
    headerClass: '',
    badgeClass: 'pending',
  },
};

const formatCurrency = (val) => new Intl.NumberFormat('vi-VN').format(val || 0);

/**
 * Tạo custom marker SVG cho Leaflet
 */
const createStopMarker = (number, status = 'DEFAULT') => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.DEFAULT;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="46" viewBox="0 0 36 46">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="rgba(0,0,0,0.3)"/>
        </filter>
      </defs>
      <path d="M18 0 C8.06 0 0 8.06 0 18 C0 31.5 18 46 18 46 C18 46 36 31.5 36 18 C36 8.06 27.94 0 18 0 Z"
            fill="${cfg.color}" filter="url(#shadow)"/>
      <circle cx="18" cy="18" r="11" fill="white" opacity="0.9"/>
      <text x="18" y="23" text-anchor="middle" font-family="Inter,Arial,sans-serif"
            font-size="${number > 9 ? '11' : '13'}" font-weight="700" fill="${cfg.color}">${number}</text>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    iconSize: [36, 46],
    iconAnchor: [18, 46],
    popupAnchor: [0, -48],
    className: '',
  });
};

/**
 * Tạo warehouse marker (điểm xuất phát)
 */
const createWarehouseMarker = () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="18" fill="#0f172a" stroke="#fff" stroke-width="2"/>
      <text x="20" y="26" text-anchor="middle" font-family="Arial,sans-serif"
            font-size="16" fill="white">🏭</text>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -42],
    className: '',
  });
};

/**
 * Tạo popup HTML cho từng điểm dừng
 */
const createPopupHtml = (stop) => {
  const cfg = STATUS_CONFIG[stop.status] || STATUS_CONFIG.DEFAULT;
  const phone = stop.phone ? `<div class="map-popup-row">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.22 2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/>
    </svg>
    ${stop.phone}
  </div>` : '';

  const amount = stop.totalAmount ? `<div class="map-popup-row">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
    </svg>
    ${formatCurrency(stop.totalAmount)} đ
  </div>` : '';

  return `
    <div class="map-popup">
      <div class="map-popup-header ${cfg.headerClass}">
        <span class="map-popup-stop-number">${stop.stopNumber || '?'}</span>
        <span class="map-popup-retailer-name">${stop.retailerName}</span>
        <span class="map-popup-order-code">${stop.orderCode ? `Đơn: ${stop.orderCode}` : stop.retailerCode || ''}</span>
      </div>
      <div class="map-popup-body">
        <div class="map-popup-row">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
          ${stop.address || 'Chưa cập nhật địa chỉ'}
        </div>
        ${phone}
        ${amount}
        <span class="map-popup-status-badge ${cfg.badgeClass}">${cfg.label}</span>
      </div>
    </div>
  `;
};

// ============================================================
//  MAIN COMPONENT
// ============================================================
export default function DeliveryMap({
  stops = [],
  height = '420px',
  showRoute = true,
  mode = 'trip',
  center = [10.762622, 106.660172], // TP HCM mặc định
  warehouseName = '',
  warehouseCoords = null,
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayerRef = useRef(null);

  const [routeInfo, setRouteInfo] = useState({ distanceKm: 0, durationMin: 0, loading: false });

  useEffect(() => {
    // Khởi tạo map
    if (!mapInstanceRef.current && mapRef.current) {
      const map = L.map(mapRef.current, {
        center,
        zoom: 13,
        zoomControl: true,
      });

      // Tile layer OpenStreetMap (miễn phí)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      // Cleanup khi unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Xóa markers cũ
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
      routeLayerRef.current = null;
    }

    const validStops = stops.filter(
      (s) => s.lat != null && s.lng != null &&
             !isNaN(parseFloat(s.lat)) && !isNaN(parseFloat(s.lng))
    );

    if (validStops.length === 0) return;

    const latLngs = [];
    const routingCoords = [];

    // Thêm marker kho (điểm xuất phát) nếu có tọa độ
    if (warehouseCoords && warehouseCoords.lat != null && warehouseCoords.lng != null) {
      const wLatLng = [parseFloat(warehouseCoords.lat), parseFloat(warehouseCoords.lng)];
      const wMarker = L.marker(wLatLng, { icon: createWarehouseMarker() })
        .addTo(map)
        .bindPopup(`<div style="padding:8px 12px;font-weight:700;font-size:13px">🏭 ${warehouseName || 'Kho xuất hàng'}</div>`);
      markersRef.current.push(wMarker);
      latLngs.push(wLatLng);
      routingCoords.push([parseFloat(warehouseCoords.lng), parseFloat(warehouseCoords.lat)]);
    }

    // Thêm markers cho từng điểm dừng
    validStops.forEach((stop) => {
      const latLng = [parseFloat(stop.lat), parseFloat(stop.lng)];
      const marker = L.marker(latLng, {
        icon: createStopMarker(stop.stopNumber, stop.status),
      })
        .addTo(map)
        .bindPopup(createPopupHtml(stop), {
          maxWidth: 260,
          className: 'custom-map-popup',
        });
      markersRef.current.push(marker);
      latLngs.push(latLng);
      routingCoords.push([parseFloat(stop.lng), parseFloat(stop.lat)]);
    });

    // Vẽ đường tuyến đường phố thực tế (OSRM Routing Machine)
    if (showRoute && routingCoords.length > 1) {
      setRouteInfo((prev) => ({ ...prev, loading: true }));
      // Định dạng OSRM: lng,lat;lng,lat...
      const coordsString = routingCoords.map((c) => `${c[0]},${c[1]}`).join(';');
      const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=full&geometries=geojson`;

      fetch(osrmUrl)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.code === 'Ok' && data.routes && data.routes[0]) {
            const primaryRoute = data.routes[0];
            const coordinates = primaryRoute.geometry.coordinates.map((c) => [c[1], c[0]]);

            if (routeLayerRef.current) {
              routeLayerRef.current.remove();
            }

            routeLayerRef.current = L.polyline(coordinates, {
              color: '#2563eb',
              weight: 5,
              opacity: 0.85,
              lineJoin: 'round',
            }).addTo(map);

            setRouteInfo({
              distanceKm: Math.round((primaryRoute.distance / 1000) * 10) / 10,
              durationMin: Math.round(primaryRoute.duration / 60),
              loading: false,
            });
          } else {
            // Fallback nếu OSRM lỗi hoặc offline: vẽ polyline thẳng
            fallbackPolyline();
          }
        })
        .catch(() => {
          fallbackPolyline();
        });
    } else {
      setRouteInfo({ distanceKm: 0, durationMin: 0, loading: false });
    }

    function fallbackPolyline() {
      if (routeLayerRef.current) routeLayerRef.current.remove();
      routeLayerRef.current = L.polyline(latLngs, {
        color: '#2563eb',
        weight: 3,
        opacity: 0.7,
        dashArray: '8, 5',
        lineJoin: 'round',
      }).addTo(map);
      setRouteInfo({ distanceKm: 0, durationMin: 0, loading: false });
    }

    // Fit map vừa với tất cả markers
    if (latLngs.length > 0) {
      const bounds = L.latLngBounds(latLngs);
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [stops, showRoute, warehouseCoords, warehouseName]);

  // Tạo Google Maps multi-stop URL cho tài xế dẫn đường
  const getGoogleMapsDirectionsUrl = () => {
    const validStops = stops.filter((s) => s.lat != null && s.lng != null);
    if (validStops.length === 0) return '#';

    let origin = '';
    if (warehouseCoords && warehouseCoords.lat && warehouseCoords.lng) {
      origin = `${warehouseCoords.lat},${warehouseCoords.lng}`;
    } else {
      origin = `${validStops[0].lat},${validStops[0].lng}`;
    }

    const destination = `${validStops[validStops.length - 1].lat},${validStops[validStops.length - 1].lng}`;
    const waypoints = validStops
      .slice(0, validStops.length - 1)
      .map((s) => `${s.lat},${s.lng}`)
      .join('|');

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=driving`;
  };

  return (
    <div
      className={mode === 'mini' ? 'mini-map-wrapper' : 'delivery-map-wrapper'}
      style={{ height }}
    >
      {/* Widget thống kê lộ trình thực tế cho chuyến xe */}
      {mode === 'trip' && showRoute && (
        <div className="trip-route-stat-bar">
          <div className="stat-item">
            <span className="stat-label">Khoảng cách thực tế:</span>
            <span className="stat-value">
              {routeInfo.loading ? '...' : routeInfo.distanceKm > 0 ? `${routeInfo.distanceKm} km` : 'Tuyến thẳng'}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Thời gian dự kiến:</span>
            <span className="stat-value">
              {routeInfo.loading ? '...' : routeInfo.durationMin > 0 ? `~${routeInfo.durationMin} phút` : 'N/A'}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Số điểm dừng:</span>
            <span className="stat-value">{stops.length} điểm</span>
          </div>
          <a
            href={getGoogleMapsDirectionsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-open-gmaps"
            title="Mở Google Maps dẫn đường theo lượt cho tài xế"
          >
            <ExternalLink size={14} /> Mở dẫn đường Google Maps
          </a>
        </div>
      )}

      <div
        ref={mapRef}
        className={mode === 'mini' ? 'mini-map-container' : 'delivery-map-container'}
        style={{ height }}
      />
    </div>
  );
}

// ============================================================
//  MINI MAP COMPONENT (wrapper gọn cho SalesOrderDetail)
// ============================================================
export function MiniDeliveryMap({ lat, lng, retailerName, address, phone }) {
  const hasCoords = lat != null && lng != null &&
                    !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));

  if (!hasCoords) {
    return (
      <div className="map-no-coords">
        <MapPin size={32} />
        <p>Chưa có tọa độ cửa hàng</p>
        <small>Cập nhật latitude/longitude trong hồ sơ đại lý</small>
      </div>
    );
  }

  const stop = {
    stopNumber: 1,
    retailerName,
    address,
    phone,
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    status: 'DEFAULT',
  };

  const googleMapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

  return (
    <div className="mini-map-wrapper">
      <DeliveryMap
        stops={[stop]}
        height="220px"
        showRoute={false}
        mode="mini"
        center={[parseFloat(lat), parseFloat(lng)]}
      />
      <div className="mini-map-footer">
        <span>
          <MapPin size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
          {address || 'Chưa có địa chỉ'}
        </span>
        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={13} /> Google Maps
        </a>
      </div>
    </div>
  );
}
