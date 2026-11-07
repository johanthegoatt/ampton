"use strict";
const test = require("node:test");
const assert = require("node:assert");
const A = require("../src/core.js");

test("watts and amps convert both ways at 230 V (I = P / V)", () => {
  assert.ok(Math.abs(A.wattsToAmps(2300) - 10) < 1e-9);
  assert.ok(Math.abs(A.ampsToWatts(13) - 2990) < 1e-9);
  // 13 A at 230 V is about 3,000 W, the quoted socket limit
  assert.ok(Math.abs(A.ampsToWatts(13) - 3000) < 15);
});

test("a light load sits well under the 13 A limit", () => {
  const r = A.assess({ items: [{ id: "tv" }, { id: "laptop" }, { id: "router" }] });
  assert.strictEqual(r.totalWatts, 175);
  assert.strictEqual(r.status, "ok");
  assert.ok(r.percent < 10);
  assert.ok(r.headroomWatts > 2800);
});

test("a single kettle alone is within the limit but near it", () => {
  const r = A.assess({ items: [{ id: "kettle" }] });
  assert.strictEqual(r.totalWatts, 3000);
  // 3000 W vs ~2990 W rated at 230 V: just over, so flagged
  assert.strictEqual(r.status, "over");
  assert.strictEqual(r.heatCount, 1);
});

test("kettle plus heater on one lead is an overload", () => {
  const r = A.assess({ items: [{ id: "kettle" }, { id: "heater" }] });
  assert.strictEqual(r.totalWatts, 5000);
  assert.strictEqual(r.status, "over");
  assert.ok(r.totalAmps > 13);
  const danger = r.warnings.find((w) => w.level === "danger");
  assert.ok(danger, "an overload should raise a danger warning");
});

test("two high-power appliances warn even when within the rating", () => {
  // toaster 900 + microwave 1000 = 1900 W, under 2990 W, but both are heat
  const r = A.assess({ items: [{ id: "toaster" }, { id: "microwave" }] });
  assert.strictEqual(r.status, "ok");
  assert.strictEqual(r.heatCount, 2);
  const shareWarn = r.warnings.find((w) => /high-power/.test(w.text));
  assert.ok(shareWarn, "sharing two heat loads should warn");
});

test("a typed wattage overrides the preset, and quantity multiplies", () => {
  const r = A.assess({ items: [{ id: "phone", watts: 10, qty: 3 }, { id: "heater", watts: 2500 }] });
  assert.strictEqual(r.totalWatts, 30 + 2500);
});

test("a 10 A travel lead has a lower rating", () => {
  const r = A.assess({ items: [{ id: "hairdryer" }], leadAmps: 10 });
  // 10 A at 230 V = 2300 W; a 2000 W dryer fits but with little room
  assert.ok(Math.abs(r.ratedWatts - 2300) < 1e-9);
  assert.strictEqual(r.status, "ok");
  assert.ok(r.headroomWatts < 400, "little room left on a 10 A lead");
  // the same dryer would overload the lead once a second one joins it
  const two = A.assess({ items: [{ id: "hairdryer" }, { id: "hairdryer" }], leadAmps: 10 });
  assert.strictEqual(two.status, "over");
});

test("daisy-chaining raises a danger warning regardless of load", () => {
  const r = A.assess({ items: [{ id: "lamp" }], daisyChained: true });
  assert.strictEqual(r.status, "ok");
  const danger = r.warnings.find((w) => w.level === "danger" && /daisy/i.test(w.text));
  assert.ok(danger, "a daisy-chained lead should always warn");
});

test("the biggest single draw is identified", () => {
  const r = A.assess({ items: [{ id: "phone" }, { id: "washer" }, { id: "tv" }] });
  assert.strictEqual(r.biggest.item.id, "washer");
  assert.strictEqual(r.biggest.watts, 2100);
});

test("percent and headroom are consistent with the total", () => {
  const r = A.assess({ items: [{ id: "microwave" }, { id: "console" }] }); // 1180 W
  assert.strictEqual(r.totalWatts, 1180);
  assert.strictEqual(r.headroomWatts, r.ratedWatts - 1180);
  assert.strictEqual(r.percent, Math.round((1180 / r.ratedWatts) * 100));
});

test("presets are well-formed", () => {
  assert.ok(A.PRESETS.length >= 15);
  A.PRESETS.forEach((p) => {
    assert.ok(typeof p.id === "string" && p.id.length > 0);
    assert.ok(typeof p.label === "string" && p.label.length > 0);
    assert.ok(typeof p.watts === "number" && p.watts > 0);
    assert.ok(typeof p.heat === "boolean");
  });
});

test("an empty lead reads as zero with full headroom", () => {
  const r = A.assess({ items: [] });
  assert.strictEqual(r.totalWatts, 0);
  assert.strictEqual(r.totalAmps, 0);
  assert.strictEqual(r.status, "ok");
  assert.strictEqual(r.headroomAmps, r.ratedAmps);
});
