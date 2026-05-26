/**
 * Mock Database & SQL Parser for Cloudetta BI Dashboard Builder
 */

export const mockDatabase = {
  odoo_sales: [
    { id: 1, date: '2026-05-01', amount: 1200, product: 'ERP Core License', customer: 'Acme Corp', country: 'IT' },
    { id: 2, date: '2026-05-02', amount: 450, product: 'Support Plan', customer: 'Beta Ltd', country: 'DE' },
    { id: 3, date: '2026-05-03', amount: 2400, product: 'ERP Core License', customer: 'Delta Inc', country: 'US' },
    { id: 4, date: '2026-05-04', amount: 150, product: 'Addon CRM', customer: 'Beta Ltd', country: 'DE' },
    { id: 5, date: '2026-05-05', amount: 3100, product: 'Enterprise Bundle', customer: 'Sigma Group', country: 'FR' },
    { id: 6, date: '2026-05-06', amount: 950, product: 'Support Plan', customer: 'Acme Corp', country: 'IT' },
    { id: 7, date: '2026-05-07', amount: 1500, product: 'ERP Core License', customer: 'Omega Co', country: 'US' }
  ],
  mautic_campaigns: [
    { id: 1, name: 'Spring Newsletter', sent: 5000, opened: 2100, clicked: 450, conversions: 80 },
    { id: 2, name: 'SaaS Promotion', sent: 12000, opened: 4800, clicked: 1200, conversions: 240 },
    { id: 3, name: 'Product Update Q2', sent: 8000, opened: 4200, clicked: 850, conversions: 65 },
    { id: 4, name: 'Re-engagement Funnel', sent: 4000, opened: 1100, clicked: 150, conversions: 12 }
  ],
  nextcloud_storage: [
    { user_group: 'Engineering', files_count: 14200, space_used_gb: 1240, active_users: 48 },
    { user_group: 'Marketing', files_count: 8500, space_used_gb: 450, active_users: 22 },
    { user_group: 'Sales & Support', files_count: 5300, space_used_gb: 180, active_users: 35 },
    { user_group: 'Executive', files_count: 1200, space_used_gb: 65, active_users: 8 }
  ],
  django_saas_metrics: [
    { date: '2026-05-01', mrr: 45000, active_subscriptions: 310, churn_rate: 1.8 },
    { date: '2026-05-08', mrr: 47500, active_subscriptions: 325, churn_rate: 1.7 },
    { date: '2026-05-15', mrr: 49000, active_subscriptions: 338, churn_rate: 1.6 },
    { date: '2026-05-22', mrr: 52000, active_subscriptions: 355, churn_rate: 1.5 }
  ]
};

/**
 * Basic SQL Parser supporting:
 * SELECT [cols, SUM(), COUNT(), AVG()] FROM [table] [WHERE col = val] [GROUP BY col] [ORDER BY col ASC/DESC]
 */
export function executeMockSQL(sqlQuery) {
  if (!sqlQuery || typeof sqlQuery !== 'string') {
    throw new Error('Invalid SQL query type.');
  }

  const query = sqlQuery.trim().replace(/\s+/g, ' ');
  const selectMatch = query.match(/^select\s+(.*?)\s+from\s+(\w+)(?:\s+where\s+(.*?))?(?:\s+group\s+by\s+(\w+))?(?:\s+order\s+by\s+(\w+)(?:\s+(asc|desc))?)?$/i);

  if (!selectMatch) {
    throw new Error('SQL Syntax Error. Supported pattern: SELECT columns/aggregates FROM table [WHERE condition] [GROUP BY column] [ORDER BY column [ASC/DESC]]');
  }

  const [, selectClause, tableName, whereClause, groupByClause, orderByClause, orderDirection] = selectMatch;
  const table = mockDatabase[tableName.toLowerCase()];

  if (!table) {
    throw new Error(`Table "${tableName}" not found. Available tables: ${Object.keys(mockDatabase).join(', ')}`);
  }

  // 1. Filter rows (WHERE clause)
  let filteredRows = [...table];
  if (whereClause) {
    const andConditions = whereClause.split(/\s+and\s+/i);
    filteredRows = filteredRows.filter(row => {
      return andConditions.every(cond => {
        const match = cond.match(/(\w+)\s*(=|>|<|>=|<=)\s*(['"]?.*?['"]?)$/);
        if (!match) return true;
        const [, col, op, rawVal] = match;
        const val = rawVal.replace(/['"]/g, '').trim();
        
        if (!(col in row)) return false;

        const rowVal = row[col];
        const compareVal = isNaN(val) ? val : parseFloat(val);

        switch (op) {
          case '=': return String(rowVal).toLowerCase() === String(compareVal).toLowerCase();
          case '>': return rowVal > compareVal;
          case '<': return rowVal < compareVal;
          case '>=': return rowVal >= compareVal;
          case '<=': return rowVal <= compareVal;
          default: return false;
        }
      });
    });
  }

  // 2. Select & Aggregation handling
  const columns = selectClause.split(',').map(s => s.trim());
  const hasAggregates = columns.some(col => /(sum|count|avg)\(/i.test(col));

  if (groupByClause || hasAggregates) {
    const groupKey = groupByClause ? groupByClause.trim() : null;
    const groups = {};

    // Group the rows
    filteredRows.forEach(row => {
      const key = groupKey ? row[groupKey] : 'all';
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(row);
    });

    const resultRows = [];
    for (const [key, groupRows] of Object.entries(groups)) {
      const newRow = {};
      if (groupKey) {
        newRow[groupKey] = groupRows[0][groupKey];
      }

      columns.forEach(col => {
        const sumMatch = col.match(/sum\((\w+)\)/i);
        const countMatch = col.match(/count\((\w+|\*)\)/i);
        const avgMatch = col.match(/avg\((\w+)\)/i);

        if (sumMatch) {
          const field = sumMatch[1];
          const val = groupRows.reduce((acc, r) => acc + (parseFloat(r[field]) || 0), 0);
          newRow[col] = Math.round(val * 100) / 100;
        } else if (countMatch) {
          newRow[col] = groupRows.length;
        } else if (avgMatch) {
          const field = avgMatch[1];
          const sum = groupRows.reduce((acc, r) => acc + (parseFloat(r[field]) || 0), 0);
          newRow[col] = Math.round((sum / groupRows.length) * 100) / 100;
        } else {
          const cleanCol = col.trim();
          if (cleanCol !== groupKey && groupRows[0][cleanCol] !== undefined) {
            newRow[cleanCol] = groupRows[0][cleanCol];
          }
        }
      });
      resultRows.push(newRow);
    }
    filteredRows = resultRows;
  } else {
    // Normal projection
    if (selectClause !== '*') {
      filteredRows = filteredRows.map(row => {
        const newRow = {};
        columns.forEach(col => {
          if (col in row) {
            newRow[col] = row[col];
          }
        });
        return newRow;
      });
    }
  }

  // 3. Sorting (ORDER BY clause)
  if (orderByClause) {
    const sortCol = orderByClause.trim();
    const isDesc = orderDirection && orderDirection.toLowerCase() === 'desc';
    filteredRows.sort((a, b) => {
      const valA = a[sortCol];
      const valB = b[sortCol];
      if (valA === undefined || valB === undefined) return 0;
      if (valA < valB) return isDesc ? 1 : -1;
      if (valA > valB) return isDesc ? -1 : 1;
      return 0;
    });
  }

  return filteredRows;
}
