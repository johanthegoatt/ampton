// Ampton core: add up everything plugged into one wall socket or extension
// lead and say whether it is within the lead's limit or heading for an
// overload. No DOM in here, so the same file runs in the page and under
// `node --test`.
//
// The number that matters is current, in amps. A UK wall socket, plug fuse and
// most extension leads are rated 13 A. At 230 V that is about 3,000 W (13 x 230
// = 2,990 W; a touch more at the old 240 V figure, ~3,120 W). The catch people
// miss is that a four-way lead is rated 13 A for the WHOLE lead, not 13 A per
// socket, so four sockets do not mean four times the power. Ampton works in
// watts for the appliances and converts to amps for the limit.
//
// It also leans on two fire-service rules: high-power heating appliances
// (kettles, heaters, irons, washing machines) each pull a big share on their
// own and are best in a wall socket rather than shared on a lead, and you
// should never plug one extension lead into another (daisy-chaining), because
// the current from everything downstream runs through the first lead's 13 A.
//
// Figures follow Electrical Safety First's socket-overload guidance, the BS
// 1363 13 A rating for UK plugs and sockets, and typical appliance wattages
// from the same guidance and manufacturer plates. Wattages are typical: the
// real figure is on the appliance's rating plate, and Ampton lets you type it.
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Ampton = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MAINS_VOLTS = 230;     // UK nominal mains voltage
  var SOCKET_AMPS = 13;      // BS 1363 socket / plug / typical lead rating

  // Convert between watts and amps at a given mains voltage. Current is power
  // over voltage (I = P / V); a little rounding keeps the display honest.
  function wattsToAmps(watts, volts) {
    var v = volts || MAINS_VOLTS;
    return watts / v;
  }
  function ampsToWatts(amps, volts) {
    var v = volts || MAINS_VOLTS;
    return amps * v;
  }

  // Typical appliances, with a representative wattage and whether the appliance
  // is a high-power heating or motor load. "heat" items are the ones the fire
  // service says to keep off a shared lead: they draw a lot and run hot.
  var PRESETS = [
    { id: "kettle",       label: "Kettle",            watts: 3000, heat: true },
    { id: "heater",       label: "Fan / bar heater",  watts: 2000, heat: true },
    { id: "iron",         label: "Iron",              watts: 2400, heat: true },
    { id: "hairdryer",    label: "Hair dryer",        watts: 2000, heat: true },
    { id: "microwave",    label: "Microwave",         watts: 1000, heat: true },
    { id: "toaster",      label: "Toaster",           watts:  900, heat: true },
    { id: "airfryer",     label: "Air fryer",         watts: 1500, heat: true },
    { id: "washer",       label: "Washing machine",   watts: 2100, heat: true },
    { id: "dishwasher",   label: "Dishwasher",        watts: 2200, heat: true },
    { id: "dryer",        label: "Tumble dryer",      watts: 2500, heat: true },
    { id: "vacuum",       label: "Vacuum cleaner",    watts:  900, heat: false },
    { id: "desktop",      label: "Desktop PC",        watts:  300, heat: false },
    { id: "monitor",      label: "Monitor",           watts:   50, heat: false },
    { id: "tv",           label: "TV",                watts:  100, heat: false },
    { id: "console",      label: "Games console",     watts:  180, heat: false },
    { id: "laptop",       label: "Laptop charger",    watts:   65, heat: false },
    { id: "phone",        label: "Phone charger",     watts:   10, heat: false },
    { id: "lamp",         label: "Lamp (LED)",        watts:   10, heat: false },
    { id: "fan",          label: "Fan",               watts:   50, heat: false },
    { id: "router",       label: "Router",            watts:   10, heat: false },
    { id: "fridge",       label: "Fridge",            watts:  150, heat: false }
  ];

  var PRESET_BY_ID = {};
  PRESETS.forEach(function (p) { PRESET_BY_ID[p.id] = p; });

  function presetWatts(id) {
    var p = PRESET_BY_ID[id];
    return p ? p.watts : null;
  }

  // A single item on the lead. `watts` can be given directly (a typed figure
  // off the rating plate) or left out to use the preset's typical wattage.
  // `qty` lets you add several of the same thing (three phone chargers, say).
  function itemWatts(item) {
    var each = item.watts != null ? Number(item.watts) : presetWatts(item.id);
    if (each == null || !isFinite(each) || each < 0) each = 0;
    var qty = item.qty != null ? Math.max(0, Math.floor(item.qty)) : 1;
    return each * qty;
  }

  function isHeat(item) {
    if (item.heat != null) return !!item.heat;
    var p = PRESET_BY_ID[item.id];
    return p ? !!p.heat : false;
  }

  // Add everything up and judge it against the lead's rating. Pass the items,
  // the lead's amp rating (13 A unless the lead's plate says otherwise, e.g.
  // some travel leads are 10 A), the mains voltage, and whether this lead is
  // plugged into another lead (daisy-chained).
  //
  // Returns the totals in watts and amps, the headroom left, the fraction of
  // the rating used, a status (ok / tight / over), and a list of warnings in
  // plain words.
  function assess(opts) {
    opts = opts || {};
    var items = opts.items || [];
    var volts = opts.volts || MAINS_VOLTS;
    var leadAmps = opts.leadAmps != null ? Number(opts.leadAmps) : SOCKET_AMPS;
    if (!isFinite(leadAmps) || leadAmps <= 0) leadAmps = SOCKET_AMPS;
    var daisyChained = !!opts.daisyChained;

    var ratedWatts = ampsToWatts(leadAmps, volts);
    var totalWatts = 0;
    var heatCount = 0;
    var biggest = null;

    items.forEach(function (it) {
      var w = itemWatts(it);
      totalWatts += w;
      if (isHeat(it) && w > 0) heatCount += 1;
      if (!biggest || w > biggest.watts) biggest = { item: it, watts: w };
    });

    var totalAmps = wattsToAmps(totalWatts, volts);
    var fraction = ratedWatts > 0 ? totalWatts / ratedWatts : 0;
    var headroomWatts = ratedWatts - totalWatts;
    var headroomAmps = leadAmps - totalAmps;

    // Status: over the rating is a fire risk; within ~10% is "tight" and worth
    // moving something; otherwise there is comfortable headroom.
    var status = "ok";
    if (totalWatts > ratedWatts) status = "over";
    else if (fraction >= 0.9) status = "tight";

    var warnings = [];
    if (status === "over") {
      warnings.push({
        level: "danger",
        text: "Over the limit. This draws more than the lead is rated for and can overheat. Unplug something, or move a high-power appliance to its own wall socket."
      });
    } else if (status === "tight") {
      warnings.push({
        level: "warn",
        text: "Close to the limit. There is little headroom left, so adding anything else could tip it over. Keep the spare sockets free or move a big appliance."
      });
    }

    // More than one high-power heating appliance sharing a single lead is the
    // classic overload, even when the total is within the rating.
    if (heatCount >= 2) {
      warnings.push({
        level: "warn",
        text: "Two or more high-power appliances share this lead. Each one is best in its own wall socket rather than sharing; together they run the lead hot."
      });
    } else if (heatCount === 1 && status !== "over" && items.length > 1) {
      warnings.push({
        level: "info",
        text: "A high-power appliance is sharing this lead. On its own it is fine, but it is safest in a wall socket, leaving the lead for low-power things."
      });
    }

    // Daisy-chaining: everything downstream runs through the first lead's 13 A.
    if (daisyChained) {
      warnings.push({
        level: "danger",
        text: "Leads plugged into leads. Never daisy-chain extension leads: all the current runs through the first lead's 13 A, which overloads it. Use one lead per wall socket."
      });
    }

    return {
      ratedWatts: ratedWatts,
      ratedAmps: leadAmps,
      totalWatts: totalWatts,
      totalAmps: totalAmps,
      fraction: fraction,
      percent: Math.round(fraction * 100),
      headroomWatts: headroomWatts,
      headroomAmps: headroomAmps,
      heatCount: heatCount,
      biggest: biggest,
      status: status,
      warnings: warnings
    };
  }

  return {
    MAINS_VOLTS: MAINS_VOLTS,
    SOCKET_AMPS: SOCKET_AMPS,
    PRESETS: PRESETS,
    wattsToAmps: wattsToAmps,
    ampsToWatts: ampsToWatts,
    presetWatts: presetWatts,
    itemWatts: itemWatts,
    assess: assess
  };
});
