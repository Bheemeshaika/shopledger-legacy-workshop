'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const pricing = require('../lib/pricing');
const invoice = require('../lib/invoice');

function orderWith(items, coupon) {
  return {
    id: 42,
    date: '22/11/2026',
    status: 'completed',
    customer: 'In-memory test customer',
    paymentMode: 'cash',
    items,
    coupon: coupon || ''
  };
}

test('invoice GST breakdown and total match billed HSN pricing and coupon', () => {
  const item = { id: 1, name: 'Rice', sku: 'RICE-1', hsn: '1006', price: 3000, qty: 1 };
  const order = orderWith([item], 'SAVE10');
  const billed = pricing.computeTotals([item], 'SAVE10');
  const printed = invoice.computeInvoiceFigures(order);

  assert.equal(billed.discount, 150);
  assert.equal(billed.tax, 142.5);
  assert.equal(billed.total, 2992.5);
  assert.equal(printed.subtotal, billed.subtotal);
  assert.equal(printed.discount, billed.discount);
  assert.equal(printed.tax, billed.tax);
  assert.equal(printed.cgst, billed.cgst);
  assert.equal(printed.sgst, billed.sgst);
  assert.equal(printed.total, billed.total);
  assert.equal(printed.rows[0].gstPercent, billed.lines[0].gstPercent);
  assert.equal(printed.rows[0].lineTax, billed.lines[0].tax);
});

test('invoice uses the HSN slab rather than the default GST rate', () => {
  const item = { id: 1, name: 'Rice', sku: 'RICE-1', hsn: '1006', price: 100, qty: 1 };
  const order = orderWith([item]);
  const billed = pricing.computeTotals([item], '');
  const printed = invoice.computeInvoiceFigures(order);

  assert.equal(printed.rows[0].gstPercent, 5);
  assert.equal(printed.tax, billed.tax);
  assert.equal(printed.total, billed.total);
});

test('rendered invoice does not show a reconciliation warning for the billed total', () => {
  const item = { id: 1, name: 'Rice', sku: 'RICE-1', hsn: '1006', price: 100, qty: 1 };
  const totals = pricing.computeTotals([item], '');
  const order = { ...orderWith([item]), ...totals };

  const html = invoice.render(order);

  assert.doesNotMatch(html, /Accountant Reconciliation Notice/);
  assert.match(html, /5%/);
  assert.match(html, /₹105\.00/);
});
