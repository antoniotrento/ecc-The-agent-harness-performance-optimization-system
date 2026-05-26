/**
 * Custom SVG Interactive Chart Renderer for Cloudetta BI Dashboard
 */

export function renderChart(containerId, data, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  const {
    type = 'line', // line, bar, pie
    xKey = '',
    yKey = '',
    title = 'Metric Chart',
    color = 'var(--primary)'
  } = options;

  if (!data || data.length === 0) {
    container.innerHTML = `<div style="display:grid;place-items:center;height:100%;color:var(--text-muted)">No data to display</div>`;
    return;
  }

  // Create chart wrapper
  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.style.gap = '1rem';
  wrapper.style.width = '100%';
  wrapper.style.height = '100%';

  const header = document.createElement('h3');
  header.textContent = title;
  header.style.fontSize = '1.1rem';
  header.style.fontWeight = '600';
  wrapper.appendChild(header);

  const chartArea = document.createElement('div');
  chartArea.style.flex = '1';
  chartArea.style.position = 'relative';
  chartArea.style.minHeight = '240px';
  wrapper.appendChild(chartArea);

  container.appendChild(wrapper);

  if (type === 'pie') {
    renderSvgPie(chartArea, data, xKey, yKey);
  } else if (type === 'bar') {
    renderSvgBar(chartArea, data, xKey, yKey, color);
  } else {
    renderSvgLine(chartArea, data, xKey, yKey, color);
  }
}

function renderSvgLine(container, data, xKey, yKey, color) {
  const width = container.clientWidth || 500;
  const height = container.clientHeight || 240;
  const padding = 40;

  const yValues = data.map(d => parseFloat(d[yKey]) || 0);
  const maxY = Math.max(...yValues, 1) * 1.1;
  const minY = Math.min(...yValues, 0);

  const points = data.map((d, i) => {
    const x = padding + ((width - padding * 2) / (data.length - 1 || 1)) * i;
    const y = height - padding - ((height - padding * 2) / (maxY - minY)) * (yValues[i] - minY);
    return { x, y, value: yValues[i], label: d[xKey] };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  const svg = `
    <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}" style="overflow: visible;">
      <!-- Gridlines -->
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="var(--glass-border)" stroke-width="1" />
      <line x1="${padding}" y1="${padding}" x2="${width - padding}" y2="${padding}" stroke="var(--glass-border)" stroke-width="1" stroke-dasharray="4" />
      
      <!-- Gradient Fill -->
      <defs>
        <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="${color}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${color}" stop-opacity="0.0"/>
        </linearGradient>
      </defs>

      <!-- Area Path -->
      <path d="${areaD}" fill="url(#lineGrad)" />

      <!-- Line Path -->
      <path d="${pathD}" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="stroke-dasharray: 1000; stroke-dashoffset: 1000; animation: drawLine 2s forwards ease-out;" />

      <!-- Interactive Circles -->
      ${points.map((p, i) => `
        <circle cx="${p.x}" cy="${p.y}" r="5" fill="var(--bg-primary)" stroke="${color}" stroke-width="3" class="chart-point" data-value="${p.value}" data-label="${p.label}" style="cursor: pointer; transition: r 0.2s;" />
      `).join('')}
    </svg>
    <style>
      @keyframes drawLine {
        to { stroke-dashoffset: 0; }
      }
      .chart-point:hover {
        r: 8 !important;
      }
    </style>
  `;

  container.innerHTML = svg;
  addTooltipListeners(container);
}

function renderSvgBar(container, data, xKey, yKey, color) {
  const width = container.clientWidth || 500;
  const height = container.clientHeight || 240;
  const padding = 40;

  const yValues = data.map(d => parseFloat(d[yKey]) || 0);
  const maxY = Math.max(...yValues, 1) * 1.1;

  const barCount = data.length;
  const availableWidth = width - padding * 2;
  const barWidth = (availableWidth / barCount) * 0.6;
  const barSpacing = (availableWidth / barCount) * 0.4;

  const bars = data.map((d, i) => {
    const x = padding + i * (barWidth + barSpacing) + barSpacing / 2;
    const h = ((height - padding * 2) / maxY) * yValues[i];
    const y = height - padding - h;
    return { x, y, w: barWidth, h, value: yValues[i], label: d[xKey] };
  });

  const svg = `
    <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}">
      <!-- X Axis -->
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="var(--glass-border)" stroke-width="1" />
      
      <!-- Bars -->
      ${bars.map(b => `
        <rect x="${b.x}" y="${b.y}" width="${b.w}" height="${b.h}" fill="${color}" rx="4" class="chart-bar" data-value="${b.value}" data-label="${b.label}" style="transform-origin: ${b.x + b.w/2}px ${height - padding}px; animation: growBar 1s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards; cursor: pointer;" />
      `).join('')}
    </svg>
    <style>
      @keyframes growBar {
        from { transform: scaleY(0); }
        to { transform: scaleY(1); }
      }
      .chart-bar:hover {
        filter: brightness(1.2);
      }
    </style>
  `;

  container.innerHTML = svg;
  addTooltipListeners(container);
}

function renderSvgPie(container, data, xKey, yKey) {
  const width = container.clientWidth || 300;
  const height = container.clientHeight || 240;
  const radius = Math.min(width, height) / 2 - 20;
  const cx = width / 2;
  const cy = height / 2;

  const yValues = data.map(d => parseFloat(d[yKey]) || 0);
  const total = yValues.reduce((acc, v) => acc + v, 0);

  const colors = [
    'var(--primary)',
    'var(--accent-cyan)',
    'var(--accent-purple)',
    'var(--accent-emerald)',
    'var(--accent-rose)'
  ];

  let accumulatedAngle = 0;
  const slices = data.map((d, i) => {
    const percentage = total > 0 ? yValues[i] / total : 0;
    const angle = percentage * 360;
    
    // Calculate arc points
    const x1 = cx + radius * Math.cos((accumulatedAngle - 90) * Math.PI / 180);
    const y1 = cy + radius * Math.sin((accumulatedAngle - 90) * Math.PI / 180);
    
    accumulatedAngle += angle;
    
    const x2 = cx + radius * Math.cos((accumulatedAngle - 90) * Math.PI / 180);
    const y2 = cy + radius * Math.sin((accumulatedAngle - 90) * Math.PI / 180);
    
    const largeArcFlag = angle > 180 ? 1 : 0;
    
    const pathD = `
      M ${cx} ${cy}
      L ${x1} ${y1}
      A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
      Z
    `;

    return { pathD, color: colors[i % colors.length], value: yValues[i], label: d[xKey] };
  });

  const svg = `
    <svg width="100%" height="100%" viewBox="0 0 ${width} ${height}">
      ${slices.map(s => `
        <path d="${s.pathD}" fill="${s.color}" class="chart-slice" data-value="${s.value}" data-label="${s.label}" style="cursor: pointer; transition: transform 0.3s; transform-origin: ${cx}px ${cy}px;" />
      `).join('')}
    </svg>
    <style>
      .chart-slice:hover {
        transform: scale(1.05);
      }
    </style>
  `;

  container.innerHTML = svg;
  addTooltipListeners(container);
}

function addTooltipListeners(container) {
  let tooltip = document.getElementById('chart-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'chart-tooltip';
    tooltip.style.position = 'fixed';
    tooltip.style.padding = '8px 12px';
    tooltip.style.background = 'var(--text-primary)';
    tooltip.style.color = 'var(--bg-primary)';
    tooltip.style.borderRadius = '6px';
    tooltip.style.fontSize = '0.85rem';
    tooltip.style.pointerEvents = 'none';
    tooltip.style.opacity = '0';
    tooltip.style.transition = 'opacity 0.2s';
    tooltip.style.zIndex = '1000';
    tooltip.style.fontFamily = 'var(--font-sans)';
    tooltip.style.fontWeight = '600';
    tooltip.style.boxShadow = 'var(--shadow-md)';
    document.body.appendChild(tooltip);
  }

  const elements = container.querySelectorAll('.chart-point, .chart-bar, .chart-slice');
  elements.forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const val = el.getAttribute('data-value');
      const label = el.getAttribute('data-label');
      tooltip.innerHTML = `<div>${label}</div><div style="color: var(--accent-cyan);">${val}</div>`;
      tooltip.style.left = `${e.clientX + 15}px`;
      tooltip.style.top = `${e.clientY - 15}px`;
      tooltip.style.opacity = '1';
    });

    el.addEventListener('mouseleave', () => {
      tooltip.style.opacity = '0';
    });
  });
}
