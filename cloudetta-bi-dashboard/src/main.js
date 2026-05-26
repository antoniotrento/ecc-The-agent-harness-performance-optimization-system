import './style.css';
import { executeMockSQL } from './data.js';
import { renderChart } from './charts.js';

// Application State
const state = {
  theme: localStorage.getItem('cloudetta-theme') || 'dark',
  activeView: 'dashboard', // dashboard, sql-editor, analytics
  sqlQuery: 'SELECT name, sent, conversions FROM mautic_campaigns ORDER BY conversions DESC',
  widgets: [
    { id: 'w1', title: 'Odoo Total Sales', value: '$9,700', trend: '+14.2%', trendDir: 'up', type: 'kpi', color: 'var(--primary)' },
    { id: 'w2', title: 'Mautic Sent Emails', sent: 29000, opened: 12200, type: 'chart', chartType: 'bar', xKey: 'name', yKey: 'sent', table: 'mautic_campaigns', color: 'var(--accent-cyan)' },
    { id: 'w3', title: 'Nextcloud Active Users', value: '113', trend: '+5.4%', trendDir: 'up', type: 'kpi', color: 'var(--accent-emerald)' },
    { id: 'w4', title: 'Django MRR Growth', type: 'chart', chartType: 'line', xKey: 'date', yKey: 'mrr', table: 'django_saas_metrics', color: 'var(--accent-purple)' }
  ]
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  setupTheme();
  setupNavigation();
  setupDragAndDrop();
  setupSqlWorkspace();
  renderWorkspace();
});

// Setup Light/Dark Theme
function setupTheme() {
  document.documentElement.setAttribute('data-theme', state.theme);
  const toggleBtn = document.getElementById('theme-toggle');
  if (toggleBtn) {
    toggleBtn.innerHTML = state.theme === 'dark' ? '☀️' : '🌙';
    toggleBtn.addEventListener('click', () => {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', state.theme);
      localStorage.setItem('cloudetta-theme', state.theme);
      toggleBtn.innerHTML = state.theme === 'dark' ? '☀️' : '🌙';
    });
  }
}

// Setup Nav Bar Clicks
function setupNavigation() {
  const items = document.querySelectorAll('.nav-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      items.forEach(i => i.classList.remove('active'));
      item.classList.add('active');
      state.activeView = item.getAttribute('data-view');
      renderWorkspace();
    });
  });
}

// Render dynamic workspace based on active menu
function renderWorkspace() {
  const container = document.getElementById('workspace-content');
  if (!container) return;

  if (state.activeView === 'dashboard') {
    container.innerHTML = `
      <div class="topbar">
        <div>
          <h2>Cloudetta Workspace</h2>
          <p style="color: var(--text-secondary)">Drag and drop widgets to organize your analytics view.</p>
        </div>
      </div>
      <div class="dashboard-grid" id="dashboard-grid"></div>
    `;
    renderDashboardGrid();
  } else if (state.activeView === 'sql-editor') {
    container.innerHTML = `
      <div class="topbar">
        <h2>SQL Analytics Sandbox</h2>
      </div>
      <div class="sql-editor-container">
        <div class="editor-header">
          <label style="font-weight:600; color:var(--text-secondary);">Write SQL Query (Odoo Sales, Mautic, Nextcloud, Django metrics):</label>
        </div>
        <textarea id="sql-query-input" class="sql-textarea">${state.sqlQuery}</textarea>
        <div>
          <button id="run-sql-btn" class="btn-primary">Execute Query</button>
        </div>
        <div id="sql-results-area" style="margin-top: 1rem;"></div>
      </div>
    `;
    setupSqlWorkspace();
  } else if (state.activeView === 'analytics') {
    container.innerHTML = `
      <div class="topbar">
        <h2>System Performance & Overview</h2>
      </div>
      <div class="dashboard-grid">
        <div class="chart-card" id="analytics-chart-1"></div>
        <div class="chart-card" id="analytics-chart-2"></div>
      </div>
    `;
    const mauticData = executeMockSQL('SELECT name, opened FROM mautic_campaigns');
    renderChart('analytics-chart-1', mauticData, {
      type: 'line',
      xKey: 'name',
      yKey: 'opened',
      title: 'Mautic Email Open Rates',
      color: 'var(--accent-cyan)'
    });

    const odooSales = executeMockSQL('SELECT product, amount FROM odoo_sales');
    renderChart('analytics-chart-2', odooSales, {
      type: 'bar',
      xKey: 'product',
      yKey: 'amount',
      title: 'Odoo Sales by Product Category',
      color: 'var(--accent-purple)'
    });
  }
}

// Render widgets on dashboard grid
function renderDashboardGrid() {
  const grid = document.getElementById('dashboard-grid');
  if (!grid) return;

  grid.innerHTML = '';

  state.widgets.forEach(widget => {
    const card = document.createElement('div');
    card.id = widget.id;
    card.setAttribute('draggable', 'true');
    card.style.setProperty('--accent-color', widget.color);

    if (widget.type === 'kpi') {
      card.className = 'kpi-card';
      card.innerHTML = `
        <div class="kpi-header">${widget.title}</div>
        <div class="kpi-value">${widget.value}</div>
        <div class="kpi-trend ${widget.trendDir}">${widget.trend} vs last month</div>
      `;
    } else {
      card.className = 'chart-card';
      card.innerHTML = `
        <div class="builder-overlay">
          <button class="builder-btn line-btn">Line</button>
          <button class="builder-btn bar-btn">Bar</button>
          <button class="builder-btn pie-btn">Pie</button>
        </div>
        <div id="chart-render-${widget.id}" style="width:100%; height:100%;"></div>
      `;
      grid.appendChild(card);

      const chartData = executeMockSQL(`SELECT ${widget.xKey}, ${widget.yKey} FROM ${widget.table}`);
      renderChart(`chart-render-${widget.id}`, chartData, {
        type: widget.chartType,
        xKey: widget.xKey,
        yKey: widget.yKey,
        title: widget.title,
        color: widget.color
      });

      // Bind button events for changing chart type inline
      card.querySelector('.line-btn').addEventListener('click', () => {
        widget.chartType = 'line';
        renderDashboardGrid();
      });
      card.querySelector('.bar-btn').addEventListener('click', () => {
        widget.chartType = 'bar';
        renderDashboardGrid();
      });
      card.querySelector('.pie-btn').addEventListener('click', () => {
        widget.chartType = 'pie';
        renderDashboardGrid();
      });
      return;
    }

    grid.appendChild(card);
  });

  // Re-bind drag listeners
  bindDragEvents();
}

// Drag & Drop Layout Builder Logic
let draggedElement = null;

function setupDragAndDrop() {
  // Global dragover behavior
  const workspace = document.getElementById('workspace-content');
  if (workspace) {
    workspace.addEventListener('dragover', (e) => {
      e.preventDefault();
    });
  }
}

function bindDragEvents() {
  const cards = document.querySelectorAll('.kpi-card, .chart-card');
  cards.forEach(card => {
    card.addEventListener('dragstart', (e) => {
      draggedElement = card;
      card.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });

    card.addEventListener('dragend', () => {
      card.classList.remove('dragging');
      draggedElement = null;
    });

    card.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    card.addEventListener('drop', (e) => {
      e.preventDefault();
      if (draggedElement && draggedElement !== card) {
        // Swap positions in the DOM
        const grid = document.getElementById('dashboard-grid');
        const children = Array.from(grid.children);
        const fromIndex = children.indexOf(draggedElement);
        const toIndex = children.indexOf(card);

        // Swap state array positions
        const temp = state.widgets[fromIndex];
        state.widgets[fromIndex] = state.widgets[toIndex];
        state.widgets[toIndex] = temp;

        renderDashboardGrid();
      }
    });
  });
}

// SQL editor execution setup
function setupSqlWorkspace() {
  const runBtn = document.getElementById('run-sql-btn');
  const queryInput = document.getElementById('sql-query-input');
  const resultsArea = document.getElementById('sql-results-area');

  if (!runBtn || !queryInput || !resultsArea) return;

  runBtn.addEventListener('click', () => {
    const query = queryInput.value;
    state.sqlQuery = query;

    try {
      const data = executeMockSQL(query);
      if (data.length === 0) {
        resultsArea.innerHTML = `<div style="color:var(--text-secondary); font-family:var(--font-mono);">0 rows returned.</div>`;
        return;
      }

      // Generate HTML Table from JSON rows
      const headers = Object.keys(data[0]);
      const tableHtml = `
        <div class="results-table-container">
          <table class="results-table">
            <thead>
              <tr>
                ${headers.map(h => `<th>${h}</th>`).join('')}
              </tr>
            </thead>
            <tbody>
              ${data.map(row => `
                <tr>
                  ${headers.map(h => `<td>${row[h]}</td>`).join('')}
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      resultsArea.innerHTML = tableHtml;
    } catch (err) {
      resultsArea.innerHTML = `
        <div style="background:var(--accent-rose); color:white; padding:1rem; border-radius:var(--border-radius-sm); font-family:var(--font-mono); font-size:0.9rem;">
          ⚠️ Error: ${err.message}
        </div>
      `;
    }
  });
}
