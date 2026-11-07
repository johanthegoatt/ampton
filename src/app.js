// Ampton page glue: let you build a list of what's plugged into one socket or
// lead, run the engine in core.js, draw the load bar and the warnings, and keep
// a share link in sync. All the electrical maths lives in core.js so it can be
// tested without a browser.
(function () {
  "use strict";
  var A = window.Ampton;
  var $ = function (id) { return document.getElementById(id); };

  var listEl = $("items");
  var picker = $("picker");
  var leadEl = $("lead");
  var daisyEl = $("daisy");
  var out = $("out");
  var emptyEl = $("empty");

  // The working list of items. Each is { id, label, watts, heat, qty }.
  var items = [];

  function presetOptions() {
    A.PRESETS.forEach(function (p) {
      var o = document.createElement("option");
      o.value = p.id;
      o.textContent = p.label + " (" + p.watts + " W)";
      picker.appendChild(o);
    });
  }

  function addItem(id, watts, qty) {
    var p = A.PRESETS.filter(function (x) { return x.id === id; })[0];
    if (!p) return;
    items.push({
      id: p.id, label: p.label, heat: p.heat,
      watts: watts != null ? watts : p.watts,
      qty: qty != null ? qty : 1
    });
    render();
  }

  function removeItem(i) { items.splice(i, 1); render(); }

  function drawRows() {
    listEl.innerHTML = "";
    items.forEach(function (it, i) {
      var row = document.createElement("div");
      row.className = "item" + (it.heat ? " item--heat" : "");

      var name = document.createElement("span");
      name.className = "item__name";
      name.textContent = it.label + (it.heat ? " ⚡" : "");
      row.appendChild(name);

      var wattWrap = document.createElement("label");
      wattWrap.className = "item__watts";
      wattWrap.append("Watts ");
      var watt = document.createElement("input");
      watt.type = "number"; watt.min = "0"; watt.step = "10";
      watt.value = it.watts; watt.setAttribute("aria-label", it.label + " watts");
      watt.addEventListener("input", function () {
        it.watts = watt.value === "" ? 0 : Number(watt.value);
        compute();
      });
      wattWrap.appendChild(watt);
      row.appendChild(wattWrap);

      var qtyWrap = document.createElement("label");
      qtyWrap.className = "item__qty";
      qtyWrap.append("×");
      var qty = document.createElement("input");
      qty.type = "number"; qty.min = "1"; qty.step = "1";
      qty.value = it.qty; qty.setAttribute("aria-label", it.label + " quantity");
      qty.addEventListener("input", function () {
        it.qty = qty.value === "" ? 1 : Math.max(1, Math.floor(Number(qty.value)));
        compute();
      });
      qtyWrap.appendChild(qty);
      row.appendChild(qtyWrap);

      var rm = document.createElement("button");
      rm.type = "button"; rm.className = "item__rm";
      rm.textContent = "Remove"; rm.setAttribute("aria-label", "Remove " + it.label);
      rm.addEventListener("click", function () { removeItem(i); });
      row.appendChild(rm);

      listEl.appendChild(row);
    });
    emptyEl.hidden = items.length > 0;
  }

  function fmtAmps(a) { return (Math.round(a * 10) / 10).toFixed(1); }

  function compute() {
    var leadAmps = Number(leadEl.value) || A.SOCKET_AMPS;
    var daisy = daisyEl.checked;
    var r = A.assess({ items: items, leadAmps: leadAmps, daisyChained: daisy });

    var bar = Math.min(100, Math.round(r.fraction * 100));
    var barClass = r.status === "over" ? "over" : r.status === "tight" ? "tight" : "ok";

    var headline = r.status === "over"
      ? "Over the limit"
      : r.status === "tight" ? "Close to the limit" : "Within the limit";

    var html = "";
    html += '<div class="gauge gauge--' + barClass + '">';
    html += '<div class="gauge__head"><strong>' + headline + '</strong>';
    html += '<span>' + r.totalWatts + ' W of ' + Math.round(r.ratedWatts) + ' W · ' +
            fmtAmps(r.totalAmps) + ' A of ' + r.ratedAmps + ' A</span></div>';
    html += '<div class="gauge__track"><div class="gauge__fill" style="width:' +
            Math.max(2, bar) + '%"></div></div>';
    var hw = Math.round(r.headroomWatts);
    html += '<p class="gauge__room">' + (r.status === "over"
      ? Math.abs(hw) + " W over the lead's rating"
      : hw + " W (" + fmtAmps(r.headroomAmps) + " A) still free") + '</p>';
    html += '</div>';

    if (r.warnings.length) {
      html += '<ul class="warns">';
      r.warnings.forEach(function (w) {
        html += '<li class="warn warn--' + w.level + '">' + w.text + '</li>';
      });
      html += '</ul>';
    } else if (items.length) {
      html += '<p class="warn warn--ok">Comfortable. Plenty of headroom on this lead.</p>';
    }

    out.innerHTML = html;

    if (window.Jack) {
      window.Jack.context({
        status: r.status, heatCount: r.heatCount,
        daisyChained: daisy, empty: items.length === 0
      });
    }
    writeHash();
  }

  function render() { drawRows(); compute(); }

  // Share link: the whole list lives in the URL's #fragment, which a browser
  // never sends to a server, so nothing you build is uploaded.
  function writeHash() {
    var payload = {
      v: 1,
      lead: Number(leadEl.value) || A.SOCKET_AMPS,
      daisy: daisyEl.checked ? 1 : 0,
      items: items.map(function (it) { return [it.id, it.watts, it.qty]; })
    };
    try {
      var s = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      history.replaceState(null, "", "#" + s);
    } catch (e) { /* ignore */ }
  }

  function readHash() {
    if (!location.hash || location.hash.length < 2) return false;
    try {
      var p = JSON.parse(decodeURIComponent(escape(atob(location.hash.slice(1)))));
      if (!p || !Array.isArray(p.items)) return false;
      if (p.lead) leadEl.value = String(p.lead);
      daisyEl.checked = !!p.daisy;
      items = [];
      p.items.forEach(function (row) {
        var id = row[0];
        var pr = A.PRESETS.filter(function (x) { return x.id === id; })[0];
        if (pr) items.push({ id: pr.id, label: pr.label, heat: pr.heat, watts: Number(row[1]), qty: Number(row[2]) || 1 });
      });
      return true;
    } catch (e) { return false; }
  }

  $("add").addEventListener("click", function () {
    if (picker.value) addItem(picker.value);
  });
  leadEl.addEventListener("change", compute);
  daisyEl.addEventListener("change", compute);
  $("clear").addEventListener("click", function () { items = []; render(); });

  $("share").addEventListener("click", function () {
    writeHash();
    var btn = $("share");
    function done(msg) { var old = btn.textContent; btn.textContent = msg; setTimeout(function () { btn.textContent = old; }, 1500); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(location.href).then(function () { done("Link copied"); }, function () { done("Copy the URL"); });
    } else { done("Copy the URL"); }
  });

  presetOptions();
  if (!readHash()) {
    // A sensible starter so the page isn't blank: a desk setup.
    addItem("laptop"); addItem("monitor"); addItem("lamp");
  } else {
    render();
  }
  compute();
})();
