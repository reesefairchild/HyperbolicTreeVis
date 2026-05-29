/**
 * euclideanTree.js
 * Self-contained D3 module for the Euclidean tree motivation widget.
 * Appends an interactive tree visualization into #etree-container.
 *
 * Usage: <script type="module" src="d3-graphs/euclideanTree.js"></script>
 * Requires: D3 v7 loaded globally, or imported below.
 */

(function () {
  // ── Mount target ──────────────────────────────────────────────
  const container = document.getElementById("etree-container");
  if (!container) {
    console.warn("euclideanTree.js: #etree-container not found.");
    return;
  }

  // ── Inject styles ─────────────────────────────────────────────
  const style = document.createElement("style");
  style.textContent = `
    #etree-wrap {
      font-family: 'Tinos', 'Times New Roman', Times, serif;
      padding: 0;
      width: 55%;
      max-width: 560px;
      box-sizing: border-box;
    }
    #etree-controls {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 20px;
      margin: 16px 0 8px;
      font-size: 1.1rem;
      color: #4a4a4a;
    }
    #etree-controls label {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #etree-controls input[type=range] {
      width: 110px;
      accent-color: #2a5298;
    }
    #etree-controls strong {
      color: #1a1a1a;
    }
    #overflow-badge {
      display: inline-block;
      background: #faeaea;
      color: #c0392b;
      font-size: 1.15rem;
      padding: 3px 10px;
      border-radius: 4px;
      border: 1px solid #e8b4b4;
      opacity: 0;
      transition: opacity 0.4s;
    }
    #overflow-badge.show {
      opacity: 1;
    }
    #etree-svg-el {
      width: 100%;
      border: 1px solid rgba(0,0,0,0.12);
      border-radius: 6px;
      background: #ffffff;
      display: block;
      margin-top: 8px;
    }
    #etree-caption {
      margin-top: 10px;
      font-size: 1.1rem;
      font-style: italic;
      color: #6a6a6a;
      line-height: 1.6;
      min-height: 2.8em;
    }
    .etree-node {
      cursor: pointer;
    }
    .etree-node circle {
      transition: r 0.2s ease, fill 0.2s ease;
    }
    .etree-node:hover circle {
      r: 8;
    }
  `;
  document.head.appendChild(style);

  // ── Build HTML structure ───────────────────────────────────────
  container.innerHTML = `
    <div id="etree-wrap">
      <div id="etree-controls">
        <label>
          Depth
          <input type="range" id="et-depth" min="1" max="6" value="3" step="1">
          <strong id="et-depth-val">3</strong>
        </label>
        <label>
          Branching factor
          <input type="range" id="et-branch" min="2" max="4" value="2" step="1">
          <strong id="et-branch-val">2</strong>
        </label><br>
        <label>
          Nodes: <strong id="et-node-count">7</strong>
        </label>
        <span id="overflow-badge">⚠ nodes extend beyond canvas</span>
      </div>
      <svg id="etree-svg-el" viewBox="0 0 680 260"></svg>
      <p id="etree-caption">
        A binary tree at depth 3 needs modest space. Try increasing depth or branching factor —
        the tree grows exponentially while Euclidean space grows only polynomially.
      </p>
    </div>
  `;

  // ── Wait for D3 ───────────────────────────────────────────────
  function waitForD3(cb) {
    if (window.d3) { cb(); return; }
    const script = document.createElement("script");
    script.src = "https://d3js.org/d3.v7.min.js";
    script.onload = cb;
    document.head.appendChild(script);
  }

  waitForD3(function () {
    const W = 680, H = 260, PAD = 28;

    // Color ramp: root (darkest) → leaf (lightest)
    const NODE_COLORS = [
      "#185FA5", // depth 0
      "#2a7fd8", // depth 1
      "#5fa8ea", // depth 2
      "#9ecde8", // depth 3
      "#c8e6f5", // depth 4
      "#e4f3fb", // depth 5+
    ];

    const CAPTIONS = {
      1: (b) => `${Math.pow(b, 0) + Math.pow(b, 1)} nodes. The root and its ${b} children. Trivially fits on any canvas.`,
      2: (b) => `${nodeCount(2, b)} nodes. Still readable, though the leaves are spreading out.`,
      3: (b) => `${nodeCount(3, b)} nodes at depth 3. A ${b}-ary tree grows as ${b}ⁿ; Euclidean space can only widen linearly.`,
      4: (b) => `${nodeCount(4, b)} nodes. Layout is tightening. Sibling subtrees begin competing for horizontal room.`,
      5: (b) => `${nodeCount(5, b)} nodes. Euclidean renderings start to collapse; leaves are crowded or overflow the canvas.`,
      6: (b) => `${nodeCount(6, b)} nodes at depth 6: exponential growth has outpaced the available Euclidean space.`,
    };

    function nodeCount(depth, branch) {
      let total = 0;
      for (let i = 0; i <= depth; i++) total += Math.pow(branch, i);
      return total;
    }

    function buildHierarchyData(depth, branch) {
      function node(d) {
        if (d === 0) return {};
        return { children: Array.from({ length: branch }, () => node(d - 1)) };
      }
      return node(depth);
    }

    function draw() {
      const depth  = +document.getElementById("et-depth").value;
      const branch = +document.getElementById("et-branch").value;

      document.getElementById("et-depth-val").textContent  = depth;
      document.getElementById("et-branch-val").textContent = branch;

      const total = nodeCount(depth, branch);
      document.getElementById("et-node-count").textContent = total;

      // Update caption
      const captFn = CAPTIONS[Math.min(depth, 6)];
      document.getElementById("etree-caption").textContent = captFn(branch);

      // Build layout
      const root = d3.hierarchy(buildHierarchyData(depth, branch));
      const layout = d3.tree().size([W - PAD * 2, H - PAD * 2 - 10]);
      layout(root);

      const svg = d3.select("#etree-svg-el");
      svg.selectAll("*").remove();

      const g = svg.append("g").attr("transform", `translate(${PAD},${PAD + 14})`);

      // Check overflow
      let clipped = false;
      root.descendants().forEach(n => {
        const ax = n.x + PAD, ay = n.y + PAD + 14;
        if (ax < 0 || ax > W || ay < 0 || ay > H) clipped = true;
      });
      document.getElementById("overflow-badge").classList.toggle("show", clipped);

      // Links
      g.selectAll(".et-link")
        .data(root.links())
        .enter()
        .append("path")
        .attr("class", "et-link")
        .attr("fill", "none")
        .attr("stroke", "rgba(0,0,0,0.13)")
        .attr("stroke-width", 1)
        .attr("d", d3.linkVertical()
          .x(d => d.x)
          .y(d => d.y)
        );

      // Nodes
      const nodeG = g.selectAll(".etree-node")
        .data(root.descendants())
        .enter()
        .append("g")
        .attr("class", "etree-node")
        .attr("transform", d => `translate(${d.x},${d.y})`);

      nodeG.append("circle")
        .attr("r", d => d.children ? 5.5 : 4)
        .attr("fill", d => NODE_COLORS[Math.min(d.depth, NODE_COLORS.length - 1)])
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1.5);

      // Depth labels on the left margin (only for first few depths)
      if (depth <= 5) {
        const depthGroups = d3.groups(root.descendants(), d => d.depth);
        depthGroups.forEach(([dep, nodes]) => {
          const ys = nodes.map(n => n.y);
          const midY = (Math.min(...ys) + Math.max(...ys)) / 2;
          g.append("text")
            .attr("x", -PAD + 4)
            .attr("y", midY)
            .attr("text-anchor", "start")
            .attr("dominant-baseline", "central")
            .attr("font-size", "11px")
            .attr("font-family", "Tinos, 'Times New Roman', serif")
            .attr("fill", "#aaaaaa")
            .text(`d=${dep}`);
        });
      }
    }

    document.getElementById("et-depth").addEventListener("input", draw);
    document.getElementById("et-branch").addEventListener("input", draw);
    draw();
  });
})();