// Tests for Issue 2: last-unit sale block + cancel-does-not-restore-stock
var { test } = require('node:test');
var assert = require('node:assert/strict');

var inventory = require('../lib/inventory');

// --- Bug 2a: selling the exact remaining sellable stock should succeed ---
test('check: selling exactly the remaining sellable stock is allowed', function () {
  var products = [{ id: 6, sku: 'DRY-001', name: 'A2 Gir Cow Ghee 500ml', stock: 1, reserved: 0 }];
  var items = [{ id: 6, qty: 1 }];
  var result = inventory.check(products, items);
  assert.equal(result.ok, true, 'should allow selling the last unit');
});

test('check: selling more than sellable stock is blocked', function () {
  var products = [{ id: 6, sku: 'DRY-001', name: 'A2 Gir Cow Ghee 500ml', stock: 1, reserved: 0 }];
  var items = [{ id: 6, qty: 2 }];
  var result = inventory.check(products, items);
  assert.equal(result.ok, false, 'should block when qty exceeds sellable');
});

test('check: SPC-001 with stock=4 reserved=3 allows selling qty 1', function () {
  var products = [{ id: 11, sku: 'SPC-001', name: 'Byadgi Chilli Powder', stock: 4, reserved: 3 }];
  var items = [{ id: 11, qty: 1 }];
  var result = inventory.check(products, items);
  assert.equal(result.ok, true, 'sellable = 4-3 = 1; selling 1 should succeed');
});

// --- Bug 2b: cancelling an order must restore physical stock ---
test('release: stock is restored after cancel', function () {
  var products = [
    { id: 6, sku: 'DRY-001', name: 'A2 Gir Cow Ghee 500ml', stock: 0, reserved: 0 },
    { id: 4, sku: 'OIL-001', name: 'Cold-Pressed Sunflower Oil 1L', stock: 2, reserved: 4 }
  ];
  // Order #1007 items (uses items[i].id, as stored on orders)
  var orderItems = [
    { id: 6, sku: 'DRY-001', name: 'A2 Gir Cow Ghee 500ml', qty: 2 },
    { id: 4, sku: 'OIL-001', name: 'Cold-Pressed Sunflower Oil 1L', qty: 2 }
  ];
  inventory.release(products, orderItems);
  assert.equal(products[0].stock, 2, 'Ghee stock should be restored from 0 → 2');
  assert.equal(products[1].stock, 4, 'Oil stock should be restored from 2 → 4');
});
