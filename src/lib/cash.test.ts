// Run: npx tsx src/lib/cash.test.ts
import assert from "node:assert/strict";
import { breakdown, roundCash, sayPieces } from "./cash";

assert.deepEqual(breakdown(0), []);
assert.deepEqual(breakdown(550), [500, 25, 25]);
assert.deepEqual(breakdown(1585), [1000, 500, 25, 25, 25, 10]);
assert.deepEqual(breakdown(8790), [5000, 2000, 1000, 500, 200, 25, 25, 25, 10, 5]);
assert.equal(roundCash(452), 450);
assert.equal(roundCash(453), 455);
assert.equal(sayPieces([25, 100, 25, 500]), "a 5-dollar bill, a 1-dollar coin and 2 quarters");
assert.equal(sayPieces([10]), "a dime");
assert.equal(sayPieces([]), "");
console.log("cash ok");
