/**
 * areaGrowth.js
 * Section 3: Area growth — Euclidean vs. hyperbolic plane.
 * Formula: A_hyp = 4π sinh²(r/2)   A_euc = πr²
 * Poincaré disk: tanh(r/2) maps hyperbolic r to Euclidean radius
 *
 * SVG elements are built with createElementNS to avoid the
 * innerHTML-without-namespace bug that leaves boxes empty.
 */

function initAreaGrowth() {
  const container = document.getElementById("area-growth-container");
  if (!container) return;

  const style = document.createElement("style");
  style.textContent = `
    #ag-wrap {
      font-family: 'Tinos','Times New Roman',Times,serif;
      width: 100%;
      box-sizing: border-box;
    }
    #ag-controls {
      display:flex; align-items:center; gap:16px;
      margin:8px 0; font-size:1rem; color:#4a4a4a;
    }
    #ag-controls label { display:flex; align-items:center; gap:6px; }
    #ag-controls input[type=range] { width:110px; accent-color:#2a5298; }
    #ag-row {
      display:flex; flex-direction:row; align-items:stretch;
      gap:12px; margin-bottom:8px;
    }
    .ag-panel {
      border:1px solid rgba(0,0,0,0.12);
      border-radius:6px; background:#fff; overflow:hidden;
      flex:0 0 auto;
    }
    .ag-panel-label {
      font-size:0.75rem; font-weight:700;
      letter-spacing:0.05em; text-transform:uppercase;
      padding:5px 10px 4px;
      border-bottom:1px solid rgba(0,0,0,0.07);
    }
    #ag-stats {
      display:flex; flex-direction:column;
      gap:8px; flex:0 0 auto; justify-content:center;
    }
    .ag-stat {
      background:#f8f6f2; border-radius:5px;
      padding:7px 12px; font-size:0.85rem; color:#4a4a4a;
    }
    .ag-stat-val { font-size:1.2rem; font-weight:700; color:#1a1a1a; margin-top:1px; }
    .ag-stat-formula { font-size:0.75rem; color:#999; font-style:italic; }
    #ag-chart-wrap {
      border:1px solid rgba(0,0,0,0.12); border-radius:6px;
      background:#fff; padding:10px 12px 6px;
      flex:1 1 auto; min-width:0;
    }
    #ag-chart-label {
      font-size:0.75rem; font-weight:700; letter-spacing:0.05em;
      text-transform:uppercase; color:#1a1a1a; margin-bottom:5px;
    }
    .ag-legend { display:flex; gap:16px; margin-bottom:5px; font-size:0.8rem; color:#4a4a4a; }
    #ag-caption {
      margin-top:8px; font-size:0.9rem; font-style:italic;
      color:#6a6a6a; line-height:1.55; min-height:2.4em;
    }
  `;
  document.head.appendChild(style);

  container.innerHTML = `
    <div id="ag-wrap">
      <div id="ag-controls">
        <label>Radius <em>r</em>
          <input type="range" id="ag-r" min="0.1" max="1.0" value="0.3" step="0.1">
          <strong id="ag-r-val">0.3</strong>
        </label>
      </div>
      <div id="ag-row">
        <div class="ag-panel">
          <div class="ag-panel-label" style="color:#185FA5;">Euclidean plane</div>
          <svg id="ag-euc-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200" style="display:block;width:180px;"></svg>
        </div>
        <div class="ag-panel">
          <div class="ag-panel-label" style="color:#993C1D;">Poincaré disk (hyperbolic)</div>
          <svg id="ag-hyp-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 200" style="display:block;width:180px;"></svg>
        </div>
        <div id="ag-stats">
          <div class="ag-stat">
            <div>Euclidean area</div>
            <div class="ag-stat-val" id="ag-euc-area">—</div>
            <div class="ag-stat-formula">A = πr²</div>
          </div>
          <div class="ag-stat">
            <div>Hyperbolic area</div>
            <div class="ag-stat-val" id="ag-hyp-area">—</div>
            <div class="ag-stat-formula">A = 4π sinh²(r/2)</div>
          </div>
        </div>
        <div id="ag-chart-wrap">
          <div id="ag-chart-label">Area vs. radius</div>
          <div class="ag-legend">
            <span><span style="display:inline-block;width:18px;height:2px;background:#185FA5;vertical-align:middle;margin-right:4px;"></span>Euclidean — πr²</span>
            <span><span style="display:inline-block;width:18px;height:2px;border-top:2px dashed #D85A30;vertical-align:middle;margin-right:4px;"></span>Hyperbolic — 4π sinh²(r/2)</span>
          </div>
          <div style="position:relative;width:100%;height:155px;">
            <canvas id="ag-chart" role="img" aria-label="Line chart: Euclidean area pi r-squared vs hyperbolic area 4pi sinh-squared(r/2)">Euclidean: polynomial. Hyperbolic: exponential.</canvas>
          </div>
        </div>
      </div>
      <p id="ag-caption"></p>
    </div>
  `;

  /* ── Constants ───────────────────────────────────────── */
  const NS        = "http://www.w3.org/2000/svg";
  const EUC_COLOR = "#185FA5";
  const HYP_COLOR = "#D85A30";
  const DISK_R    = 80;           // pixel radius of the unit disk
  const CX = 110, CY = 100;
  const MAX_R     = 1.0;          // Euclidean radius max (unit disk)
  const MAX_RHYP  = 4.0;          // hyperbolic r shown on chart

  // Euclidean: r is the actual Euclidean radius in [0,1]
  function eucArea(r)    { return Math.PI * r * r; }
  // Hyperbolic: r_hyp is the hyperbolic radius; convert to Poincaré disk Euclidean radius via tanh(r/2)
  function hypArea(rh)   { const s = Math.sinh(rh / 2); return 4 * Math.PI * s * s; }
  // Map hyperbolic radius to pixel radius in Poincaré disk
  function pdR(rh)       { return Math.tanh(rh / 2) * DISK_R; }
  // For a given Euclidean r in [0,1], the equivalent hyperbolic radius
  function eucToHyp(r)   { return 2 * Math.atanh(r); }

  /* ── SVG helpers ─────────────────────────────────────── */
  function el(tag, attrs) {
    const e = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  }
  function circle(attrs)         { return el("circle", attrs); }
  function line(attrs)           { return el("line", attrs); }
  function text(attrs, content)  { const t = el("text", attrs); t.textContent = content; return t; }
  function clearSVG(id) {
    const svg = document.getElementById(id);
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    return svg;
  }

  /* ── Draw Euclidean panel ────────────────────────────── */
  // r is Euclidean radius in [0,1]; disk boundary is the unit circle
  function drawEuclidean(r) {
    const svg = clearSVG("ag-euc-svg");
    const pr  = r * DISK_R;   // pixel radius — linear in r

    // Unit circle boundary
    svg.appendChild(circle({ cx: CX, cy: CY, r: DISK_R, fill: "rgba(0,0,0,0.012)", stroke: "rgba(0,0,0,0.22)", "stroke-width": 1 }));
    // Faint reference rings at 0.25, 0.5, 0.75, 1.0
    for (const frac of [0.25, 0.5, 0.75]) {
      svg.appendChild(circle({ cx: CX, cy: CY, r: frac * DISK_R, fill: "none", stroke: "rgba(0,0,0,0.07)", "stroke-width": 0.5 }));
    }
    // Filled disk
    svg.appendChild(circle({ cx: CX, cy: CY, r: pr, fill: EUC_COLOR, "fill-opacity": 0.15, stroke: EUC_COLOR, "stroke-width": 1.5 }));
    // Radius line
    svg.appendChild(line({ x1: CX, y1: CY, x2: CX + pr, y2: CY, stroke: EUC_COLOR, "stroke-width": 1, "stroke-dasharray": "3 2" }));
    // r label
    svg.appendChild(text({ x: CX + pr / 2, y: CY - 7, "text-anchor": "middle", "font-size": 10, "font-family": "Tinos,serif", fill: EUC_COLOR, "font-style": "italic" }, `r = ${r.toFixed(1)}`));
    // Tick labels
    for (const frac of [0.25, 0.5, 0.75, 1.0]) {
      svg.appendChild(text({ x: CX + frac * DISK_R, y: CY + 13, "text-anchor": "middle", "font-size": 8, "font-family": "Tinos,serif", fill: "rgba(0,0,0,0.30)" }, String(frac)));
    }
    // Caption
    svg.appendChild(text({ x: CX, y: CY + DISK_R + 16, "text-anchor": "middle", "font-size": 9, "font-family": "Tinos,serif", fill: "rgba(0,0,0,0.38)" }, "uniform spacing — polynomial"));
  }

  /* ── Draw Hyperbolic panel ───────────────────────────── */
  // rh is the hyperbolic radius corresponding to Euclidean r via rh = 2·atanh(r)
  function drawHyperbolic(rh) {
    const svg = clearSVG("ag-hyp-svg");
    const er  = pdR(rh);   // pixel radius in Poincaré disk

    // Unit disk boundary
    svg.appendChild(circle({ cx: CX, cy: CY, r: DISK_R, fill: "rgba(0,0,0,0.012)", stroke: "rgba(0,0,0,0.22)", "stroke-width": 1 }));
    // Reference rings at hyperbolic radii 0.5, 1, 2, 3
    for (const rref of [0.5, 1, 2, 3]) {
      const pr_ref = pdR(rref);
      svg.appendChild(circle({ cx: CX, cy: CY, r: pr_ref, fill: "none", stroke: "rgba(0,0,0,0.07)", "stroke-width": 0.5 }));
    }
    // Filled hyperbolic disk
    svg.appendChild(circle({ cx: CX, cy: CY, r: er, fill: HYP_COLOR, "fill-opacity": 0.15, stroke: HYP_COLOR, "stroke-width": 1.5 }));
    // Radius line
    svg.appendChild(line({ x1: CX, y1: CY, x2: CX + er, y2: CY, stroke: HYP_COLOR, "stroke-width": 1, "stroke-dasharray": "3 2" }));
    // rh label
    svg.appendChild(text({ x: CX + er / 2, y: CY - 7, "text-anchor": "middle", "font-size": 10, "font-family": "Tinos,serif", fill: HYP_COLOR, "font-style": "italic" }, `r = ${rh.toFixed(2)}`));
    // Tick labels at reference rings
    for (const rref of [0.5, 1, 2, 3]) {
      const pr_ref = pdR(rref);
      if (pr_ref + 8 < DISK_R) {
        svg.appendChild(text({ x: CX + pr_ref + 4, y: CY + 3, "font-size": 8, "font-family": "Tinos,serif", fill: "rgba(0,0,0,0.28)" }, String(rref)));
      }
    }
    // Caption
    svg.appendChild(text({ x: CX, y: CY + DISK_R + 16, "text-anchor": "middle", "font-size": 9, "font-family": "Tinos,serif", fill: "rgba(0,0,0,0.38)" }, "crowding near edge — exponential"));
  }

  /* ── Stat cards ──────────────────────────────────────── */
  function updateStats(r, rh) {
    const ea = eucArea(r), ha = hypArea(rh);
    document.getElementById("ag-euc-area").textContent = ea.toFixed(4);
    document.getElementById("ag-hyp-area").textContent = ha.toFixed(4);
  }

  /* ── Chart ───────────────────────────────────────────── */
  const CHART_CAP = 300;
  let chart = null;

  function buildChart() {
    const labels = [], eucData = [], hypData = [];
    for (let r = 0; r <= MAX_R; r += 0.01) {
      labels.push(r.toFixed(2));
      eucData.push(+eucArea(r).toFixed(6));
      const rh = r < 1 ? eucToHyp(r) : eucToHyp(0.9999);
      hypData.push(+Math.min(hypArea(rh), CHART_CAP).toFixed(6));
    }
    const ctx = document.getElementById("ag-chart").getContext("2d");
    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          { label: "Euclidean", data: eucData, borderColor: EUC_COLOR, backgroundColor: "transparent", borderWidth: 2, pointRadius: 0, tension: 0.3 },
          { label: "Hyperbolic", data: hypData, borderColor: HYP_COLOR, backgroundColor: "transparent", borderWidth: 2, pointRadius: 0, borderDash: [6, 3], tension: 0.3 },
          { label: "_marker", data: [], borderColor: "rgba(0,0,0,0.2)", borderWidth: 1, borderDash: [2, 2], pointRadius: 0, tension: 0 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false, animation: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            filter: item => item.datasetIndex < 2,
            callbacks: {
              title: items => `r = ${parseFloat(items[0].label).toFixed(2)}`,
              label: item => {
                const r = parseFloat(item.label);
                const actual = item.datasetIndex === 1 ? hypArea(eucToHyp(Math.min(r, 0.9999))) : item.parsed.y;
                const suffix = (item.datasetIndex === 1 && actual > CHART_CAP) ? " (capped)" : "";
                return `${item.dataset.label}: ${actual.toFixed(4)}${suffix}`;
              },
            },
          },
        },
        scales: {
          x: {
            title: { display: true, text: "Euclidean radius r", font: { family: "Tinos,serif", size: 11 }, color: "#888" },
            ticks: {
              font: { size: 10 },
              maxTicksLimit: 9,
              callback: (_, i) => {
                const v = parseFloat(labels[i]);
                return (Math.round(v * 4) % 4 === 0) ? v.toFixed(2) : null;
              }
            },
            grid: { color: "rgba(0,0,0,0.05)" },
          },
          y: {
            title: { display: true, text: "area", font: { family: "Tinos,serif", size: 11 }, color: "#888" },
            ticks: { font: { size: 10 } },
            grid: { color: "rgba(0,0,0,0.05)" },
          },
        },
      },
    });
  }

  function updateMarker(r) {
    if (!chart) return;
    const idx = Math.round(r / 0.01);
    chart.data.datasets[2].data = chart.data.labels.map((_, i) => i === idx ? CHART_CAP : null);
    chart.update("none");
  }

  /* ── Main update ─────────────────────────────────────── */
  function update() {
    const r  = +document.getElementById("ag-r").value;
    const rh = eucToHyp(r);
    document.getElementById("ag-r-val").textContent = r.toFixed(1);
    drawEuclidean(r);
    drawHyperbolic(rh);
    updateStats(r, rh);
    updateMarker(r);
  }

  /* ── Boot ────────────────────────────────────────────── */
  function boot() {
    buildChart();
    document.getElementById("ag-r").addEventListener("input", update);
    update();
  }

  if (window.Chart) {
    boot();
  } else {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js";
    s.onload = boot;
    document.head.appendChild(s);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAreaGrowth);
} else {
  initAreaGrowth();
}