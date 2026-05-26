import { describe, it, expect } from 'vitest';
import { executeMockSQL } from '../src/data.js';

describe('Cloudetta Mock SQL Parser', () => {
  it('should parse simple SELECT * FROM queries', () => {
    const result = executeMockSQL('SELECT * FROM odoo_sales');
    expect(result).toBeInstanceOf(Array);
    expect(result.length).toBe(7);
    expect(result[0]).toHaveProperty('product');
  });

  it('should parse projection queries with specific columns', () => {
    const result = executeMockSQL('SELECT id, product FROM odoo_sales');
    expect(result[0]).toHaveProperty('id');
    expect(result[0]).toHaveProperty('product');
    expect(result[0]).not.toHaveProperty('amount');
  });

  it('should filter rows using WHERE conditions', () => {
    const result = executeMockSQL("SELECT * FROM odoo_sales WHERE country = 'DE'");
    expect(result.length).toBe(2);
    expect(result.every(row => row.country === 'DE')).toBe(true);
  });

  it('should support SUM aggregate and GROUP BY queries', () => {
    const result = executeMockSQL('SELECT country, SUM(amount) FROM odoo_sales GROUP BY country');
    expect(result).toBeInstanceOf(Array);
    
    const germany = result.find(r => r.country === 'DE');
    expect(germany).toBeDefined();
    // 450 + 150 = 600
    expect(germany['SUM(amount)']).toBe(600);
  });

  it('should support sorting with ORDER BY', () => {
    const result = executeMockSQL('SELECT * FROM odoo_sales ORDER BY amount DESC');
    expect(result[0].amount).toBe(3100); // Max sale value
    expect(result[result.length - 1].amount).toBe(150); // Min sale value
  });

  it('should throw an error for unsupported tables', () => {
    expect(() => {
      executeMockSQL('SELECT * FROM unknown_table');
    }).toThrow('Table "unknown_table" not found');
  });

  it('should throw an error for invalid query syntax', () => {
    expect(() => {
      executeMockSQL('SELECT FROM odoo_sales');
    }).toThrow('SQL Syntax Error');
  });
});
