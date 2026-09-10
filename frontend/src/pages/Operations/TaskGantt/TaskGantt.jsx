import { useState } from 'react';
import { 
  RotateCw, 
  MoreHorizontal, 
  Plus, 
  X, 
  Menu
} from 'lucide-react';
import './TaskGantt.css';

const months = [
  'September', 'October', 'November', 'December', 
  'January', 'February', 'March', 'April', 'May'
];

const ganttTasks = [
  {
    id: 'TASK-2023-00043',
    name: 'Transfer employees',
    progress: 100,
    color: '#701a35',
    startMonthIndex: 4, // January
    durationMonths: 0.8,
    row: 0
  },
  {
    id: 'TASK-2023-00041',
    name: 'Purchase pantry equipment',
    progress: 60,
    color: '#d97706',
    startMonthIndex: 4.2, // January
    durationMonths: 0.9,
    row: 1
  },
  {
    id: 'TASK-2023-00046',
    name: 'Purchase furniture',
    progress: 40,
    color: '#f59e0b',
    startMonthIndex: 4.1,
    durationMonths: 0.8,
    row: 2
  },
  {
    id: 'TASK-2023-00044',
    name: 'Plant Preparation',
    progress: 80,
    color: '#2dd4bf',
    startMonthIndex: 3.6, // Late Dec - Jan
    durationMonths: 1.4,
    row: 3
  },
  {
    id: 'TASK-2023-00048',
    name: 'Transfer assets',
    progress: 50,
    color: '#ec4899',
    startMonthIndex: 4.8, // Feb
    durationMonths: 0.9,
    row: 4
  },
  {
    id: 'TASK-2023-00045',
    name: 'Purchase machinery',
    progress: 100,
    color: '#78350f',
    startMonthIndex: 4.6,
    durationMonths: 0.8,
    row: 5
  },
  {
    id: 'TASK-2023-00047',
    name: 'Plant Painting',
    progress: 100,
    color: '#065f46',
    startMonthIndex: 4.3,
    durationMonths: 0.6,
    row: 6
  },
  {
    id: 'TASK-2023-00050',
    name: 'Purchase assets',
    progress: 30,
    color: '#f59e0b',
    startMonthIndex: 4.9,
    durationMonths: 1.0,
    row: 7
  },
  {
    id: 'TASK-2023-00049',
    name: 'Plan launch event',
    progress: 20,
    color: '#ec4899',
    startMonthIndex: 6.8, // Late March - April
    durationMonths: 1.2,
    row: 8
  },
  {
    id: 'TASK-2023-00053',
    name: 'Map budget',
    progress: 100,
    color: '#1e3a8a',
    startMonthIndex: 1.8, // Nov - Dec
    durationMonths: 1.3,
    row: 9
  }
];

const TaskGantt = () => {
  const [filters, setFilters] = useState({
    id: '',
    subject: '',
    project: 'PROJ-0004',
    status: 'All Statuses',
    priority: 'Priority'
  });

  return (
    <div className="gantt-page-layout">
      {/* CỘT TRÁI: BỘ LỌC GANTT */}
      <aside className="gantt-left-filters">
        <div className="filter-group-block">
          <label className="filter-block-title">Filter By</label>
          <select className="filter-block-select">
            <option>Assigned To</option>
            <option>Nguyễn Văn An (NVBH001)</option>
            <option>Phạm Văn Tài (NVGH001)</option>
          </select>
          <select className="filter-block-select" style={{ marginTop: '8px' }}>
            <option>Created By</option>
            <option>Administrator</option>
          </select>
        </div>

        <div className="filter-group-block">
          <label className="filter-block-title">Edit Filters</label>
          <select className="filter-block-select">
            <option>Tags</option>
            <option>#Q1Delivery</option>
            <option>#MasanGT</option>
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

      {/* VÙNG CHÍNH: BẢNG GANTT */}
      <main className="gantt-main-canvas">
        {/* Top Header */}
        <div className="gantt-top-toolbar">
          <div className="gantt-title-wrap">
            <Menu size={18} className="gantt-menu-icon" />
            <h1 className="gantt-title">Task Gantt</h1>
          </div>

          <div className="gantt-actions-wrap">
            <select className="gantt-view-select">
              <option>Gantt View</option>
              <option>Kanban View</option>
              <option>List View</option>
            </select>

            <button type="button" className="gantt-icon-btn" title="Refresh">
              <RotateCw size={15} />
            </button>

            <button type="button" className="gantt-icon-btn" title="More">
              <MoreHorizontal size={15} />
            </button>

            <button type="button" className="gantt-primary-dark-btn">
              <Plus size={15} />
              <span>Add Task</span>
            </button>
          </div>
        </div>

        {/* Horizontal Filter Bar */}
        <div className="gantt-filter-bar">
          <input 
            type="text" 
            placeholder="ID" 
            className="gantt-filter-input"
            value={filters.id}
            onChange={(e) => setFilters({ ...filters, id: e.target.value })}
          />

          <input 
            type="text" 
            placeholder="Subject" 
            className="gantt-filter-input"
            value={filters.subject}
            onChange={(e) => setFilters({ ...filters, subject: e.target.value })}
          />

          <input 
            type="text" 
            placeholder="Project" 
            className="gantt-filter-input"
            value={filters.project}
            onChange={(e) => setFilters({ ...filters, project: e.target.value })}
          />

          <select 
            className="gantt-filter-input select"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option>Status</option>
            <option>Open</option>
            <option>Working</option>
            <option>Completed</option>
          </select>

          <select 
            className="gantt-filter-input select"
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
          >
            <option>Priority</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>

          <div className="filter-pill-active" style={{ marginLeft: 'auto' }}>
            <span>Filter</span>
            <X size={13} className="filter-pill-close" />
          </div>

          <button type="button" className="gantt-secondary-btn">
            <span>Last Updated On</span>
          </button>
        </div>

        {/* Gantt Chart Matrix */}
        <div className="gantt-chart-container">
          {/* Header Months */}
          <div className="gantt-timeline-header">
            {months.map(m => (
              <div key={m} className="gantt-month-cell">{m}</div>
            ))}
          </div>

          {/* Timeline Grid & Task Bars */}
          <div className="gantt-timeline-body">
            {/* Background Grid Columns */}
            <div className="gantt-grid-columns">
              {months.map(m => (
                <div key={m} className="gantt-grid-col"></div>
              ))}
            </div>

            {/* SVG Dependency Connectors (Arrows connecting dependent tasks) */}
            <svg className="gantt-dependencies-svg">
              {/* Curve from Plant Preparation to Purchase assets */}
              <path 
                d="M 450 160 C 430 160, 430 330, 442 330" 
                fill="none" 
                stroke="#6b7280" 
                strokeWidth="1.5" 
                markerEnd="url(#arrow)"
              />
              <defs>
                <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
                </marker>
              </defs>
            </svg>

            {/* Task Bars Overlay */}
            <div className="gantt-tasks-layer">
              {ganttTasks.map((t) => {
                const leftPercent = (t.startMonthIndex / months.length) * 100;
                const widthPercent = (t.durationMonths / months.length) * 100;
                const topPx = t.row * 42 + 10;

                return (
                  <div 
                    key={t.id} 
                    className="gantt-task-row"
                    style={{ top: `${topPx}px` }}
                  >
                    <div 
                      className="gantt-task-bar"
                      style={{ 
                        left: `${leftPercent}%`, 
                        width: `${widthPercent}%`,
                        backgroundColor: t.color
                      }}
                      title={`${t.name} (${t.id}) - ${t.progress}%`}
                    >
                      <div className="gantt-task-inner-fill" style={{ width: `${t.progress}%` }}></div>
                    </div>
                    {/* Label placed next to the bar */}
                    <span 
                      className="gantt-task-label"
                      style={{ left: `calc(${leftPercent + widthPercent}% + 10px)` }}
                    >
                      {t.name} ({t.id}) {t.progress === 100 ? '- 100%' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TaskGantt;
