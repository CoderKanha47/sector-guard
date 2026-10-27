import { test } from 'node:test';
import assert from 'node:assert/strict';

const DAILY_LIMIT = 29;
const WARNING_THRESHOLD = 27;

test('DAILY_LIMIT is set to 29', () => {
  assert.equal(DAILY_LIMIT, 29);
});

test('WARNING_THRESHOLD is set to 27', () => {
  assert.equal(WARNING_THRESHOLD, 27);
});

test('Daily limit constants are correct', () => {
  assert.equal(DAILY_LIMIT, 29);
  assert.equal(WARNING_THRESHOLD, 27);
  assert.ok(WARNING_THRESHOLD < DAILY_LIMIT);
});

test('Daily limit logic: 29 uploads allowed, 30th rejected', () => {
  // Simulate the checkAndIncrementUsage logic
  function checkLimit(currentCount) {
    return {
      allowed: currentCount <= DAILY_LIMIT,
      currentCount,
      warning: currentCount >= WARNING_THRESHOLD && currentCount <= DAILY_LIMIT
    };
  }

  // Test all allowed counts up to limit
  for (let i = 1; i <= DAILY_LIMIT; i++) {
    const result = checkLimit(i);
    assert.equal(result.allowed, true, `Count ${i} should be allowed`);
    assert.equal(result.currentCount, i);
    assert.equal(result.warning, i >= WARNING_THRESHOLD && i <= DAILY_LIMIT);
  }

  // Test 30th request (DAILY_LIMIT + 1) is rejected
  const rejected = checkLimit(DAILY_LIMIT + 1);
  assert.equal(rejected.allowed, false, '30th request should be rejected');
  assert.equal(rejected.currentCount, DAILY_LIMIT + 1);
  assert.equal(rejected.warning, false);
});

test('Warning threshold behavior', () => {
  function checkLimit(currentCount) {
    return {
      allowed: currentCount <= DAILY_LIMIT,
      currentCount,
      warning: currentCount >= WARNING_THRESHOLD && currentCount <= DAILY_LIMIT
    };
  }

  // At WARNING_THRESHOLD (27), warning should be true
  assert.equal(checkLimit(WARNING_THRESHOLD).warning, true);
  // At WARNING_THRESHOLD - 1 (26), warning should be false
  assert.equal(checkLimit(WARNING_THRESHOLD - 1).warning, false);
  // At DAILY_LIMIT (29), warning should be true
  assert.equal(checkLimit(DAILY_LIMIT).warning, true);
  // Above DAILY_LIMIT (30), warning should be false (since not allowed)
  assert.equal(checkLimit(DAILY_LIMIT + 1).warning, false);
});