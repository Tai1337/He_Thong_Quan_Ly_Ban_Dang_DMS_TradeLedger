import { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  MoreHorizontal, 
  Plus, 
  X, 
  Menu,
  Sun
} from 'lucide-react';
import './JobCardCalendar.css';

const JobCardCalendar = () => {
  const [viewMode, setViewMode] = useState('Month'); // Month, Week, Day
  const [currentMonth, setCurrentMonth] = useState('Tháng 9, 2026');

  return (
    <div className="calendar-page-layout">
      {/* CỘT TRÁI: BỘ LỌC LỊCH (LEFT FILTER SIDEBAR) */}
      <aside className="calendar-left-filters">
        <div className="filter-group-block">
          <label className="filter-block-title">Lịch Vận hành</label>
          <select className="filter-block-select">
            <option>Chọn loại lịch</option>
            <option>Lịch Điều Phối Xe Giao Hàng D+3</option>
            <option>Lịch Nhận Hàng Container từ NCC (Masan/THP)</option>
          </select>
        </div>

        <div className="filter-group-block">
          <label className="filter-block-title">Lọc Theo Nhân sự</label>
          <select className="filter-block-select">
            <option>Tài xế / Nhân viên giao nhận</option>
            <option>Nguyễn Văn An (NVBH001)</option>
            <option>Phạm Văn Tài (NVGH001 - Xe tải 2.5T)</option>
            <option>Lê Hoàng Nam (NVGH002 - Xe tải 1.5T)</option>
          </select>
          <select className="filter-block-select" style={{ marginTop: '8px' }}>
            <option>Người tạo chuyến</option>
            <option>Điều phối viên kho (Dispatcher)</option>
            <option>Quản trị viên NPP</option>
          </select>
        </div>

        <div className="filter-group-block">
          <label className="filter-block-title">Edit Filters</label>
          <select className="filter-block-select">
            <option>Tags</option>
            <option>#ƯuTiênD+3</option>
            <option>#HàngMasan</option>
          </select>
          <div className="filter-link-label">Show Tags</div>
        </div>

        <div className="filter-group-block">
          <label className="filter-block-title">Save Filter</label>
          <input 
            type="text" 
            placeholder="Filter Name" 
            className="filter-block-input"
          />
        </div>
      </aside>

      {/* VÙNG CHÍNH: LỊCH CHỨNG TỪ (MAIN CALENDAR CANVAS) */}
      <main className="calendar-main-canvas">
        {/* Header Toolbar */}
        <div className="calendar-top-toolbar">
          <div className="calendar-title-wrap">
            <Menu size={18} className="calendar-menu-icon" />
            <h1 className="calendar-title">Job Card Calendar</h1>
          </div>

          <div className="calendar-actions-wrap">
            <div className="filter-pill-active">
              <span>Filter</span>
              <X size={13} className="filter-pill-close" />
            </div>

            <button type="button" className="calendar-secondary-btn">
              <span>Last Updated On</span>
            </button>

            <select className="calendar-view-select">
              <option>Calendar View</option>
              <option>List View</option>
              <option>Gantt View</option>
            </select>

            <button type="button" className="calendar-icon-btn" title="Refresh">
              <RotateCw size={15} />
            </button>

            <button type="button" className="calendar-icon-btn" title="More">
              <MoreHorizontal size={15} />
            </button>

            <button type="button" className="calendar-primary-dark-btn">
              <Plus size={15} />
              <span>Add Job Card</span>
            </button>
          </div>
        </div>

        {/* Calendar Nav & Mode Switcher */}
        <div className="calendar-nav-bar">
          <div className="calendar-nav-controls">
            <button type="button" className="calendar-nav-arrow-btn">
              <ChevronLeft size={16} />
            </button>
            <span className="calendar-current-period">{currentMonth}</span>
            <button type="button" className="calendar-nav-arrow-btn">
              <ChevronRight size={16} />
            </button>
          </div>

          <div className="calendar-view-switcher">
            <button type="button" className="calendar-today-btn">
              <Sun size={13} style={{ marginRight: 4 }} />
              <span>Today</span>
            </button>
            <div className="calendar-mode-pill-group">
              <button 
                type="button" 
                className={`calendar-mode-btn ${viewMode === 'Month' ? 'active' : ''}`}
                onClick={() => setViewMode('Month')}
              >
                Month
              </button>
              <button 
                type="button" 
                className={`calendar-mode-btn ${viewMode === 'Week' ? 'active' : ''}`}
                onClick={() => setViewMode('Week')}
              >
                Week
              </button>
              <button 
                type="button" 
                className={`calendar-mode-btn ${viewMode === 'Day' ? 'active' : ''}`}
                onClick={() => setViewMode('Day')}
              >
                Day
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Grid (Sun - Sat) */}
        <div className="calendar-grid-card">
          {/* Day Names Header */}
          <div className="calendar-day-headers">
            <div className="day-header-cell">SUN</div>
            <div className="day-header-cell">MON</div>
            <div className="day-header-cell">TUE</div>
            <div className="day-header-cell">WED</div>
            <div className="day-header-cell">THU</div>
            <div className="day-header-cell">FRI</div>
            <div className="day-header-cell">SAT</div>
          </div>

          {/* Week 1 Row */}
          <div className="calendar-week-row">
            <div className="calendar-day-grid-lines">
              <div className="day-grid-column"><span className="date-number">5</span></div>
              <div className="day-grid-column"><span className="date-number">6</span></div>
              <div className="day-grid-column"><span className="date-number">7</span></div>
              <div className="day-grid-column"><span className="date-number">8</span></div>
              <div className="day-grid-column"><span className="date-number">9</span></div>
              <div className="day-grid-column"><span className="date-number">10</span></div>
              <div className="day-grid-column"><span className="date-number">11</span></div>
            </div>

            {/* Overlaid Event Cards */}
            <div className="calendar-events-overlay">
              {/* Event 1: Spanning Gray Card */}
              <div className="event-pill gray-pill span-all">
                <strong>PO-JOB00009</strong>
                <span>MFG-WO-2023-00002</span>
              </div>

              {/* Event 2: Spanning Green Card */}
              <div className="event-pill green-pill span-all">
                <strong>PO-JOB00017</strong>
                <span>MFG-WO-2023-00003</span>
              </div>

              {/* Event 3: Spanning Green Card */}
              <div className="event-pill green-pill span-all">
                <strong>PO-JOB00018</strong>
                <span>MFG-WO-2023-00003</span>
              </div>

              {/* Grouped Day Events (Wed/Thu) */}
              <div className="event-pill-column-container" style={{ left: '43%', width: '28%' }}>
                <div className="event-pill green-pill small-card">
                  <strong>PO-JOB00004</strong>
                  <span>MFG-WO-2023-00001</span>
                </div>
                <div className="event-two-col-grid">
                  <div className="event-pill green-pill mini">PO-JOB00001</div>
                  <div className="event-pill green-pill mini">PO-JOB00005</div>
                  <div className="event-pill green-pill mini">PO-JOB00002</div>
                  <div className="event-pill green-pill mini">PO-JOB00006</div>
                  <div className="event-pill green-pill mini">PO-JOB00003</div>
                  <div className="event-pill green-pill mini">PO-JOB00007</div>
                  <div className="event-pill green-pill mini span-2">PO-JOB00008</div>
                </div>
              </div>
            </div>
          </div>

          {/* Week 2 Row */}
          <div className="calendar-week-row" style={{ marginTop: '12px' }}>
            <div className="calendar-day-grid-lines">
              <div className="day-grid-column"><span className="date-number">12</span></div>
              <div className="day-grid-column"><span className="date-number">13</span></div>
              <div className="day-grid-column"><span className="date-number">14</span></div>
              <div className="day-grid-column"><span className="date-number">15</span></div>
              <div className="day-grid-column"><span className="date-number">16</span></div>
              <div className="day-grid-column"><span className="date-number">17</span></div>
              <div className="day-grid-column"><span className="date-number">18</span></div>
            </div>

            <div className="calendar-events-overlay">
              <div className="event-pill gray-pill span-all">
                <strong>PO-JOB00009</strong>
                <span>MFG-WO-2023-00002</span>
              </div>
              <div className="event-pill green-pill span-all">
                <strong>PO-JOB00017</strong>
                <span>MFG-WO-2023-00003</span>
              </div>
              <div className="event-pill green-pill span-all">
                <strong>PO-JOB00018</strong>
                <span>MFG-WO-2023-00003</span>
              </div>
              <div className="event-pill gray-pill" style={{ left: '85.5%', width: '14%' }}>
                <strong>PO-JOB00017-1</strong>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default JobCardCalendar;
