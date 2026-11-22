// Tests for Issue 3: order sort/date filter broken + Khata settlement corrupts balance
var { test } = require('node:test');
var assert = require('node:assert/strict');

var dates  = require('../lib/dates');
var orders = require('../lib/orders');
var ledger = require('../lib/ledger');

// --- Bug 3a: normalizeDateKey must produce a sortable YYYYMMDD key ---
test('normalizeDateKey: DD/MM/YYYY converts to YYYYMMDD', function () {
  assert.equal(dates.normalizeDateKey('15/03/2022'), '20220315');
  assert.equal(dates.normalizeDateKey('28/12/2021'), '20211228');
  assert.equal(dates.normalizeDateKey('30/01/2022'), '20220130');
});

test('normalizeDateKey: YYYY-MM-DD converts to YYYYMMDD', function () {
  assert.equal(dates.normalizeDateKey('2022-03-15'), '20220315');
  assert.equal(dates.normalizeDateKey('2022-01-05'), '20220105');
});

test('normalizeDateKey: cross-year comparison is correct', function () {
  var dec2021 = dates.normalizeDateKey('28/12/2021');
  var jan2022 = dates.normalizeDateKey('05/01/2022');
  assert.ok(dec2021 < jan2022, 'Dec 2021 should sort before Jan 2022');
});

// --- Bug 3a: order list must be sorted newest-first ---
test('orders.list: newest order appears first', function () {
  var db = {
    orders: [
      { id: 1001, date: '28/12/2021', status: 'completed' },
      { id: 1004, date: '30/01/2022', status: 'completed' },
      { id: 1008, date: '15/03/2022', status: 'completed' }
    ]
  };
  var result = orders.list(db, {});
  assert.equal(result[0].id, 1008, 'newest order (Mar 2022) should be first');
  assert.equal(result[1].id, 1004, 'next newest (Jan 2022) should be second');
  assert.equal(result[2].id, 1001, 'oldest (Dec 2021) should be last');
});

// --- Bug 3a: date range filter must work across month/year boundaries ---
test('orders.list: date range filter from 2022-01-01 excludes Dec 2021', function () {
  var db = {
    orders: [
      { id: 1001, date: '28/12/2021', status: 'completed' },
      { id: 1002, date: '05/01/2022', status: 'completed' },
      { id: 1008, date: '15/03/2022', status: 'completed' }
    ]
  };
  var result = orders.list(db, { from: '2022-01-01' });
  var ids = result.map(function (o) { return o.id; });
  assert.ok(!ids.includes(1001), 'Dec 2021 order must be excluded');
  assert.ok(ids.includes(1002), 'Jan 2022 order must be included');
  assert.ok(ids.includes(1008), 'Mar 2022 order must be included');
});

// --- Bug 3b: settlement amount must be parsed as number, not concatenated as string ---
test('recordSettlement: settlement amount added numerically, not concatenated', function () {
  var db = {
    customers: [
      {
        id: 1, name: 'Meera Joshi', openingBalance: 450,
        totalBilled: 1982.01, totalSettled: 1200, balance: 1232.01,
        creditLimit: 5000
      }
    ],
    settlements: [],
    nextSettlementId: 505
  };

  // Simulate what the route does: body.amount comes in as a string from JSON
  var result = ledger.recordSettlement(db, 1, '500', 'upi', 'test payment');

  assert.equal(result.ok, true);
  // totalSettled must be 1700, NOT "1200500"
  assert.equal(result.customer.totalSettled, 1700, 'totalSettled should be 1700, not "1200500"');
  assert.equal(result.customer.balance, 732.01, 'balance should be 732.01');
});
