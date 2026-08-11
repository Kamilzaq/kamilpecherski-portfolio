/* ============ SAFETY: fail visibly, not silently, if Chart.js didn't load ============ */
if (typeof Chart === "undefined") {
  document.querySelectorAll(".chart-wrap, .kpi-row").forEach(function (el) {
    el.innerHTML =
      "<div style=\"font-family:'IBM Plex Mono',monospace;font-size:12.5px;color:#E5484D;padding:16px;border:1px solid #E5484D;\">⚠ Plik chart.min.js nie załadował się. Upewnij się, że leży w tym samym folderze co index.html i script.js, i odśwież stronę.</div>";
  });
  throw new Error("Chart.js not loaded — aborting dashboard init.");
}

/* ============ MOBILE NAV ============ */
document.getElementById("burgerBtn").addEventListener("click", () => {
  document.getElementById("mobileMenu").classList.toggle("open");
});
document.querySelectorAll(".mobilemenu a").forEach((a) =>
  a.addEventListener("click", () => {
    document.getElementById("mobileMenu").classList.remove("open");
  }),
);

/* ============ BARCODE DIVIDERS ============ */
function drawBarcode(id, seed) {
  const el = document.getElementById(id);
  const rand = mulberry32(seed);
  let html = "";
  for (let i = 0; i < 90; i++) {
    const w = 1 + Math.floor(rand() * 4);
    const h = 30 + Math.floor(rand() * 70);
    html += `<span style="width:${w}px;height:${h}%;align-self:center;"></span>`;
  }
  el.innerHTML = html;
}
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
drawBarcode("barcode1", 5);
drawBarcode("barcode2", 19);
drawBarcode("barcode3", 33);
drawBarcode("barcode4", 47);
drawBarcode("barcode5", 61);

/* ============ NOTES ACCORDION ============ */
document.querySelectorAll(".note-head").forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.parentElement.classList.toggle("open");
  });
});

/* ============ CSV EXPORT HELPER ============ */
function downloadCSV(filename, rows) {
  const csv = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell);
          return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* ============ CHART.JS THEME ============ */
Chart.defaults.color = "#8A93A3";
Chart.defaults.font.family = "'IBM Plex Mono', monospace";
Chart.defaults.font.size = 11;
Chart.defaults.borderColor = "#2E3540";

/* ============ DASHBOARD TABS ============ */
document.querySelectorAll(".dash-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".dash-tab")
      .forEach((t) => t.classList.remove("active"));
    document
      .querySelectorAll(".dash-panel")
      .forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById("panel-" + tab.dataset.tab).classList.add("active");
  });
});

/* ============ DATA GENERATION ============ */
const CLIENTS = [
  {
    name: "Projekt A — design dziecięcy",
    seed: 11,
    meanOutflow: { rotating: 34, nonrotating: 6 },
    var: { rotating: 9, nonrotating: 3 },
    restock: { rotating: 9, nonrotating: 20 },
    restockQty: { rotating: 340, nonrotating: 90 },
    start: { rotating: 1250, nonrotating: 420 },
    leadTimeDays: 5,
  },
  {
    name: "Projekt B — sprzęt sportowy",
    seed: 23,
    meanOutflow: { rotating: 22, nonrotating: 4 },
    var: { rotating: 6, nonrotating: 2 },
    restock: { rotating: 11, nonrotating: 24 },
    restockQty: { rotating: 260, nonrotating: 70 },
    start: { rotating: 980, nonrotating: 360 },
    leadTimeDays: 7,
  },
  {
    name: "Projekt C — oświetlenie",
    seed: 37,
    meanOutflow: { rotating: 27, nonrotating: 5 },
    var: { rotating: 7, nonrotating: 2.5 },
    restock: { rotating: 10, nonrotating: 22 },
    restockQty: { rotating: 300, nonrotating: 80 },
    start: { rotating: 1100, nonrotating: 390 },
    leadTimeDays: 10,
  },
  {
    name: "Projekt D — kosmetyki/biżuteria",
    seed: 41,
    meanOutflow: { rotating: 31, nonrotating: 5.5 },
    var: { rotating: 13, nonrotating: 4 },
    restock: { rotating: 8, nonrotating: 18 },
    restockQty: { rotating: 280, nonrotating: 75 },
    start: { rotating: 1050, nonrotating: 340 },
    leadTimeDays: 6,
  },
];

function genSeries(
  seed,
  days,
  meanOutflow,
  outflowVar,
  restockEvery,
  restockQty,
  startStock,
) {
  const rand = mulberry32(seed);
  let stock = startStock;
  const series = [];
  for (let d = 0; d < days; d++) {
    const dow = d % 7;
    const seasonal = dow === 5 || dow === 6 ? 0.35 : 1;
    const noise = (rand() - 0.5) * outflowVar * 2;
    const outflow = Math.max(0, meanOutflow * seasonal + noise);
    stock -= outflow;
    if (d > 0 && d % restockEvery === 0) {
      stock += restockQty * (0.8 + rand() * 0.4);
    }
    stock = Math.max(stock, 4);
    series.push(Math.round(stock));
  }
  return series;
}

function linreg(xs, ys) {
  const n = xs.length;
  let sx = 0,
    sy = 0,
    sxy = 0,
    sxx = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i];
    sy += ys[i];
    sxy += xs[i] * ys[i];
    sxx += xs[i] * xs[i];
  }
  const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  const intercept = (sy - slope * sx) / n;
  return { slope, intercept };
}

function forecastFrom(series, trainWindow, horizon) {
  const n = series.length;
  const startIdx = n - trainWindow;
  const xs = [],
    ys = [];
  for (let i = startIdx; i < n; i++) {
    xs.push(i);
    ys.push(series[i]);
  }
  const { slope, intercept } = linreg(xs, ys);
  const forecast = [];
  for (let h = 0; h <= horizon; h++) {
    const x = n - 1 + h;
    forecast.push(Math.max(0, slope * x + intercept));
  }
  return { forecast, slope, intercept };
}

function backtestMAPE(series, trainWindow, testWindow) {
  const n = series.length;
  const trainEnd = n - testWindow;
  const startIdx = trainEnd - trainWindow;
  const xs = [],
    ys = [];
  for (let i = startIdx; i < trainEnd; i++) {
    xs.push(i);
    ys.push(series[i]);
  }
  const { slope, intercept } = linreg(xs, ys);
  let errSum = 0,
    count = 0;
  for (let i = trainEnd; i < n; i++) {
    const pred = Math.max(0, slope * i + intercept);
    const actual = series[i];
    if (actual > 0) {
      errSum += Math.abs(actual - pred) / actual;
      count++;
    }
  }
  return count ? (errSum / count) * 100 : null;
}

let invChart, paretoChart, leadChart;
let currentInvExport = null,
  currentAbcExport = null,
  currentLeadExport = null;

function renderInventoryDash() {
  const clientIdx = parseInt(document.getElementById("clientSelect").value);
  const category = document.getElementById("categorySelect").value;
  const c = CLIENTS[clientIdx];
  const catKey = category === "rotating" ? "rotating" : "nonrotating";

  const days = 60,
    horizon = 14;
  const series = genSeries(
    c.seed + (catKey === "rotating" ? 0 : 100),
    days,
    c.meanOutflow[catKey],
    c.var[catKey],
    c.restock[catKey],
    c.restockQty[catKey],
    c.start[catKey],
  );

  const { forecast } = forecastFrom(series, 14, horizon);
  const mape = backtestMAPE(series, 14, 7);

  // avg daily outflow from last 14 real days (only negative deltas, ignoring restock jumps)
  let deltas = [];
  for (let i = days - 14; i < days; i++) {
    const d = series[i - 1] !== undefined ? series[i - 1] - series[i] : 0;
    if (d > 0) deltas.push(d);
  }
  const avgOutflow = deltas.length
    ? deltas.reduce((a, b) => a + b, 0) / deltas.length
    : c.meanOutflow[catKey];
  const safetyStock = Math.round(avgOutflow * 2.5);
  const reorderPoint = Math.round(safetyStock + avgOutflow * c.leadTimeDays);

  const currentStock = series[series.length - 1];
  const daysOfStock = Math.round(currentStock / avgOutflow);

  // find first forecast day crossing reorder point
  let reorderDay = null;
  for (let i = 0; i < forecast.length; i++) {
    if (forecast[i] <= reorderPoint) {
      reorderDay = i;
      break;
    }
  }

  // KPI cards
  const kpiEl = document.getElementById("invKpis");
  kpiEl.innerHTML = `
    <div class="kpi"><div class="k-label">Aktualny stan</div><div class="k-val">${currentStock.toLocaleString("pl-PL")}<span style="font-size:13px;color:var(--text-muted);"> szt.</span></div><div class="k-sub">${c.name}</div></div>
    <div class="kpi"><div class="k-label">Dni zapasu</div><div class="k-val ${daysOfStock < 7 ? "warn" : ""}">${daysOfStock}<span style="font-size:13px;color:var(--text-muted);"> dni</span></div><div class="k-sub">przy śr. zużyciu ${avgOutflow.toFixed(1)} szt./dzień</div></div>
    <div class="kpi"><div class="k-label">Prognoza: zamów za</div><div class="k-val ${reorderDay !== null && reorderDay <= 5 ? "warn" : "good"}">${reorderDay !== null ? reorderDay + " dni" : ">14 dni"}</div><div class="k-sub">punkt zamówienia: ${reorderPoint} szt.</div></div>
    <div class="kpi"><div class="k-label">Trafność prognozy (MAPE)</div><div class="k-val ${mape < 10 ? "good" : ""}">${mape ? mape.toFixed(1) + "%" : "—"}</div><div class="k-sub">backtest na 7 dniach historycznych</div></div>
  `;

  document.getElementById("chartSubtitle").textContent =
    `${c.name} · ${category === "rotating" ? "rotujące" : "nierotujące"}`;

  // detail table: last 10 real days
  const tbody = document.getElementById("invTableBody");
  let rowsHtml = "";
  for (let i = days - 10; i < days; i++) {
    const prev = series[i - 1];
    const cur = series[i];
    const change = prev !== undefined ? cur - prev : 0;
    const wasRestock = i > 0 && i % c.restock[catKey] === 0;
    const belowReorder = cur <= reorderPoint;
    rowsHtml += `<tr>
      <td>Dzień ${i - days + 1}</td>
      <td class="num">${cur.toLocaleString("pl-PL")}</td>
      <td class="num ${change >= 0 ? "up" : "down"}">${change >= 0 ? "+" : ""}${Math.round(change)}</td>
      <td>${wasRestock ? "tak" : "—"}</td>
      <td><span class="tag" style="border-color:${belowReorder ? "var(--danger)" : "var(--border)"};color:${belowReorder ? "var(--danger)" : "var(--text-muted)"}">${belowReorder ? "poniżej progu" : "ok"}</span></td>
    </tr>`;
  }
  tbody.innerHTML = rowsHtml;

  // full export dataset: history + forecast, all days
  const exportRows = [
    [
      "Dzień",
      "Typ",
      "Stan (szt.)",
      "Punkt zamówienia",
      "Zapas bezpieczeństwa",
      "Projekt",
      "Kategoria",
    ],
  ];
  for (let i = 0; i < days; i++) {
    exportRows.push([
      i - days + 1,
      "Historia",
      series[i],
      reorderPoint,
      safetyStock,
      c.name,
      category === "rotating" ? "rotujące" : "nierotujące",
    ]);
  }
  for (let h = 1; h <= horizon; h++) {
    exportRows.push([
      h,
      "Prognoza",
      Math.round(forecast[h]),
      reorderPoint,
      safetyStock,
      c.name,
      category === "rotating" ? "rotujące" : "nierotujące",
    ]);
  }
  currentInvExport = {
    filename: `stany-magazynowe_${c.name.replace(/[^a-z0-9]+/gi, "-")}_${category}.csv`,
    rows: exportRows,
  };

  // build chart datasets
  const labels = [];
  for (let i = 0; i < days + horizon; i++) {
    const offset = i - (days - 1); // days relative to "today" (D0 = last historical day)
    labels.push(
      offset === 0 ? "D0" : offset > 0 ? "D+" + offset : "D" + offset,
    );
  }
  const histData = series.map((v) => v).concat(Array(horizon).fill(null));
  const foreData = Array(days - 1)
    .fill(null)
    .concat(forecast);
  const reorderLine = Array(days + horizon).fill(reorderPoint);
  const safetyLine = Array(days + horizon).fill(safetyStock);

  const ctx = document.getElementById("invChart").getContext("2d");
  if (invChart) invChart.destroy();
  invChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Stan historyczny",
          data: histData,
          borderColor: "#2DD4BF",
          backgroundColor: "transparent",
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.15,
        },
        {
          label: "Prognoza",
          data: foreData,
          borderColor: "#FF6A13",
          backgroundColor: "transparent",
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          tension: 0.15,
        },
        {
          label: "Punkt zamówienia",
          data: reorderLine,
          borderColor: "#E5484D",
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [2, 3],
        },
        {
          label: "Zapas bezpieczeństwa",
          data: safetyLine,
          borderColor: "#8A93A3",
          borderWidth: 1,
          pointRadius: 0,
          borderDash: [1, 3],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { maxTicksLimit: 10 }, grid: { color: "#2E3540" } },
        y: {
          grid: { color: "#2E3540" },
          title: { display: true, text: "szt.", color: "#8A93A3" },
        },
      },
    },
  });
}
document
  .getElementById("clientSelect")
  .addEventListener("change", renderInventoryDash);
document
  .getElementById("categorySelect")
  .addEventListener("change", renderInventoryDash);

/* ============ ABC/XYZ DASHBOARD ============ */
function renderABCDash() {
  const rand = mulberry32(77);
  const skuCount = 60;
  const skus = [];
  for (let i = 0; i < skuCount; i++) {
    // pareto-ish value share
    const value = Math.pow(rand(), 2.2) * 1000 + 5;
    const cv = rand() * 1.6; // coefficient of variation proxy
    skus.push({ value, cv });
  }
  skus.sort((a, b) => b.value - a.value);
  const totalValue = skus.reduce((s, x) => s + x.value, 0);
  let cum = 0;
  skus.forEach((s) => {
    cum += s.value;
    s.cumShare = cum / totalValue;
  });
  skus.forEach((s) => {
    s.abc = s.cumShare <= 0.8 ? "A" : s.cumShare <= 0.95 ? "B" : "C";
    s.xyz = s.cv < 0.5 ? "X" : s.cv < 1.0 ? "Y" : "Z";
  });

  const matrixCounts = {};
  ["A", "B", "C"].forEach((a) =>
    ["X", "Y", "Z"].forEach((x) => (matrixCounts[a + x] = 0)),
  );
  skus.forEach((s) => matrixCounts[s.abc + s.xyz]++);

  const matrixEl = document.getElementById("abcMatrix");
  let mHtml = "";
  ["A", "B", "C"].forEach((a) => {
    ["X", "Y", "Z"].forEach((x) => {
      const key = a + x;
      const isRotating = (a === "A" || a === "B") && (x === "X" || x === "Y");
      const isDead = a === "C" && x === "Z";
      const color = isRotating
        ? "var(--accent-2)"
        : isDead
          ? "var(--danger)"
          : "var(--text)";
      mHtml += `<div class="matrix-cell"><div class="mc-label">${key}</div><div class="mc-val" style="color:${color}">${matrixCounts[key]}</div></div>`;
    });
  });
  matrixEl.innerHTML = mHtml;

  const rotatingCount = skus.filter(
    (s) => (s.abc === "A" || s.abc === "B") && (s.xyz === "X" || s.xyz === "Y"),
  ).length;
  const deadCount = skus.filter((s) => s.abc === "C" && s.xyz === "Z").length;
  const aShare = skus.filter((s) => s.abc === "A").length;

  document.getElementById("abcKpis").innerHTML = `
    <div class="kpi"><div class="k-label">SKU w analizie</div><div class="k-val">${skuCount}</div><div class="k-sub">próbka na potrzeby prezentacji</div></div>
    <div class="kpi"><div class="k-label">Kategoria A (80% wartości)</div><div class="k-val good">${aShare} SKU</div><div class="k-sub">${((aShare / skuCount) * 100).toFixed(0)}% wszystkich pozycji</div></div>
    <div class="kpi"><div class="k-label">Rotujące (AX/AY/BX/BY)</div><div class="k-val good">${rotatingCount}</div><div class="k-sub">częsta kontrola, dobra lokalizacja</div></div>
    <div class="kpi"><div class="k-label">Martwy zapas (CZ)</div><div class="k-val warn">${deadCount}</div><div class="k-sub">kandydaci do przeglądu</div></div>
  `;

  const abcTbody = document.getElementById("abcTableBody");
  let abcRows = "";
  skus.slice(0, 10).forEach((s, i) => {
    abcRows += `<tr>
      <td>${i + 1}</td>
      <td class="num">${s.value.toFixed(0)}</td>
      <td class="num">${(s.cumShare * 100).toFixed(1)}%</td>
      <td><span class="tag" style="border-color:var(--accent-2);color:var(--accent-2)">${s.abc}</span></td>
      <td><span class="tag">${s.xyz}</span></td>
    </tr>`;
  });
  abcTbody.innerHTML = abcRows;

  const exportRows = [
    [
      "Lp",
      "Wartość (jedn. umowne)",
      "Udział skumulowany (%)",
      "Klasa ABC",
      "Klasa XYZ",
    ],
  ];
  skus.forEach((s, i) => {
    exportRows.push([
      i + 1,
      s.value.toFixed(1),
      (s.cumShare * 100).toFixed(1),
      s.abc,
      s.xyz,
    ]);
  });
  currentAbcExport = {
    filename: "rotacja-abc-xyz_wszystkie-sku.csv",
    rows: exportRows,
  };

  const ctx = document.getElementById("paretoChart").getContext("2d");
  if (paretoChart) paretoChart.destroy();
  const labels = skus.map((s, i) => i + 1);
  paretoChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          type: "bar",
          label: "Udział wartości",
          data: skus.map((s) => s.value),
          backgroundColor: "#2DD4BF66",
          borderWidth: 0,
          yAxisID: "y",
        },
        {
          type: "line",
          label: "Skumulowany %",
          data: skus.map((s) => s.cumShare * 100),
          borderColor: "#FF6A13",
          pointRadius: 0,
          borderWidth: 2,
          yAxisID: "y1",
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { display: false },
        y: {
          grid: { color: "#2E3540" },
          title: {
            display: true,
            text: "wartość (jedn. umowne)",
            color: "#8A93A3",
          },
        },
        y1: {
          position: "right",
          min: 0,
          max: 100,
          grid: { display: false },
          title: { display: true, text: "% skumulowany", color: "#8A93A3" },
        },
      },
    },
  });
}

/* ============ LEAD TIME DASHBOARD ============ */
function renderLeadDash() {
  const rand = mulberry32(88);
  const receiving = CLIENTS.map(() => 1 + rand() * 2.5);
  const shipping = CLIENTS.map(() => 0.6 + rand() * 1.6);
  const avgReceiving = receiving.reduce((a, b) => a + b, 0) / receiving.length;
  const avgShipping = shipping.reduce((a, b) => a + b, 0) / shipping.length;
  const slaRate = 92 + rand() * 6;

  document.getElementById("leadKpis").innerHTML = `
    <div class="kpi"><div class="k-label">Śr. czas przyjęcia</div><div class="k-val">${avgReceiving.toFixed(1)}<span style="font-size:13px;color:var(--text-muted)"> godz.</span></div><div class="k-sub">dostawa → dostępność w systemie</div></div>
    <div class="kpi"><div class="k-label">Śr. czas realizacji wydania</div><div class="k-val">${avgShipping.toFixed(1)}<span style="font-size:13px;color:var(--text-muted)"> godz.</span></div><div class="k-sub">zamówienie → gotowe do wysyłki</div></div>
    <div class="kpi"><div class="k-label">SLA dotrzymane</div><div class="k-val good">${slaRate.toFixed(1)}%</div><div class="k-sub">na bazie 4 projektów</div></div>
    <div class="kpi"><div class="k-label">Projekty monitorowane</div><div class="k-val">4</div><div class="k-sub">Liewood / FittinQ / Lampenwelt / Shyne — styl</div></div>
  `;

  const leadTbody = document.getElementById("leadTableBody");
  let leadRows = "";
  const exportRows = [
    [
      "Projekt",
      "Czas przyjęcia (godz.)",
      "Czas wydania (godz.)",
      "Łącznie (godz.)",
    ],
  ];
  CLIENTS.forEach((c, i) => {
    const total = receiving[i] + shipping[i];
    leadRows += `<tr><td>${c.name}</td><td class="num">${receiving[i].toFixed(1)}</td><td class="num">${shipping[i].toFixed(1)}</td><td class="num">${total.toFixed(1)}</td></tr>`;
    exportRows.push([
      c.name,
      receiving[i].toFixed(1),
      shipping[i].toFixed(1),
      total.toFixed(1),
    ]);
  });
  leadTbody.innerHTML = leadRows;
  currentLeadExport = {
    filename: "czasy-realizacji_wg-projektu.csv",
    rows: exportRows,
  };

  const ctx = document.getElementById("leadChart").getContext("2d");
  if (leadChart) leadChart.destroy();
  leadChart = new Chart(ctx, {
    type: "bar",
    data: {
      labels: CLIENTS.map((c) => c.name.replace("Projekt ", "P.")),
      datasets: [
        { label: "Przyjęcie", data: receiving, backgroundColor: "#2DD4BF" },
        { label: "Wydanie", data: shipping, backgroundColor: "#FF6A13" },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false } },
        y: {
          grid: { color: "#2E3540" },
          title: { display: true, text: "godziny", color: "#8A93A3" },
        },
      },
    },
  });
}

/* ============ EXPORT BUTTONS ============ */
document.getElementById("exportInvBtn").addEventListener("click", () => {
  if (currentInvExport)
    downloadCSV(currentInvExport.filename, currentInvExport.rows);
});
document.getElementById("exportAbcBtn").addEventListener("click", () => {
  if (currentAbcExport)
    downloadCSV(currentAbcExport.filename, currentAbcExport.rows);
});
document.getElementById("exportLeadBtn").addEventListener("click", () => {
  if (currentLeadExport)
    downloadCSV(currentLeadExport.filename, currentLeadExport.rows);
});

/* ============ INIT ============ */
renderInventoryDash();
renderABCDash();
renderLeadDash();
