(function () {
  "use strict";
  const D = window.PzDomain;
  const G = window.PzGeometry;
  const V = window.PzViewport;
  const E = window.PzExport;
  const numericFields = [
    "productLength", "productWidth", "productHeight",
    "horizontalAccessoryIncrement", "horizontalAccessoryTolerance",
    "verticalAccessoryIncrement", "verticalAccessoryTolerance",
    "boardThickness", "returnSetback",
    "curvedWingRadius",
    "region5SmallRadius", "region5LocalStraight",
  ];
  const booleanFields = [
    "horizontalAccessoryEnabled", "horizontalLinerEnabled",
    "verticalAccessoryEnabled", "verticalLinerEnabled",
  ];
  const svg = document.getElementById("preview");
  const exportButton = document.getElementById("exportSvg");
  const ns = "http://www.w3.org/2000/svg";
  let current = D.cd9030Preset();
  let fullView = null;
  let view = null;
  let dragging = null;
  let drawing = null;

  function rulerNode(name, attrs, content) {
    const node = document.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function installGrid() {
    const defs = rulerNode("defs", {});
    const minor = rulerNode("pattern", { id: "gridMinor", width: 1, height: 1, patternUnits: "userSpaceOnUse" });
    minor.appendChild(rulerNode("path", { d: "M 1 0 L 0 0 0 1", class: "grid-minor", fill: "none", "vector-effect": "non-scaling-stroke" }));
    const major = rulerNode("pattern", { id: "gridMajor", width: 10, height: 10, patternUnits: "userSpaceOnUse" });
    major.appendChild(rulerNode("path", { d: "M 10 0 L 0 0 0 10", class: "grid-major", fill: "none", "vector-effect": "non-scaling-stroke" }));
    defs.append(minor, major);
    svg.appendChild(defs);
    svg.appendChild(rulerNode("rect", { id: "minorGrid", fill: "url(#gridMinor)", "pointer-events": "none" }));
    svg.appendChild(rulerNode("rect", { id: "majorGrid", fill: "url(#gridMajor)", "pointer-events": "none" }));
  }

  function updateGrid() {
    if (!view) return;
    const margin = Math.max(view.width, view.height);
    for (const id of ["minorGrid", "majorGrid"]) {
      const grid = document.getElementById(id);
      if (!grid) continue;
      grid.setAttribute("x", view.x - margin);
      grid.setAttribute("y", view.y - margin);
      grid.setAttribute("width", view.width + 2 * margin);
      grid.setAttribute("height", view.height + 2 * margin);
    }
  }

  const titleMap = Object.freeze({
    innerLength: "PZ內L",
    innerWidth: "PZ內W",
    innerHeight: "PZ內H",
    region1Size: "Region 1 展開尺寸",
    region2Size: "Region 2 單側展開尺寸",
    region3Size: "Region 3 展開尺寸",
    mainCheckLength: "整體結構基準跨度",
    region23Height: "2號／3號區域高度",
    region3Width: "3號區域寬度",
    region4Size: "4號區域長寬",
    region5Size: "5號區域長寬",
    partitionSide: "Partition側翼",
    partitionBase: "Partition中央段",
    partitionFlat: "Region 6 展開尺寸",
    region7Size: "Region 7尺寸",
  });

  function formatValue(value) {
    if (Array.isArray(value)) return value.map(formatValue).join(" × ");
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(3)));
    return String(value);
  }

  function applyView() {
    if (!view || !fullView) return;
    svg.setAttribute("viewBox", V.text(view));
    document.getElementById("zoomLevel").textContent = `${Math.round(fullView.width / view.width * 100)}%`;
    updateGrid();
  }

  function setInputs() {
    for (const key of numericFields) {
      const element = document.getElementById(key);
      if (element && current[key] !== undefined) element.value = current[key];
    }
    for (const key of booleanFields) {
      const element = document.getElementById(key);
      if (element) element.checked = current[key] === true;
    }
    syncAxisControls();
  }

  function syncAxisControls() {
    for (const axis of ["horizontal", "vertical"]) {
      const enabled = document.getElementById(`${axis}AccessoryEnabled`).checked;
      const container = document.getElementById(`${axis}AccessoryFields`);
      container.classList.toggle("disabled", !enabled);
      for (const input of container.querySelectorAll("input")) input.disabled = !enabled;
    }
  }

  function svgElement(name, attrs) {
    const node = document.createElementNS(ns, name);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  }

  function arcEndpoints(entity) {
    const toPoint = angle => ({
      x: entity.center.x + entity.radius * Math.cos(angle * Math.PI / 180),
      y: entity.center.y + entity.radius * Math.sin(angle * Math.PI / 180),
    });
    return [toPoint(entity.startAngle), toPoint(entity.endAngle)];
  }

  function drawEntity(entity) {
    const klass = entity.layer === "CREASE" ? "crease" : "cut";
    if (entity.type === "line") return svgElement("line", { x1: entity.p1.x, y1: entity.p1.y, x2: entity.p2.x, y2: entity.p2.y, class: klass });
    const [start, end] = arcEndpoints(entity);
    const increasing = ((entity.endAngle - entity.startAngle) % 360 + 360) % 360;
    const sweep = increasing <= 180 ? 1 : 0;
    return svgElement("path", { d: `M ${start.x} ${start.y} A ${entity.radius} ${entity.radius} 0 0 ${sweep} ${end.x} ${end.y}`, class: klass });
  }

  function metric(label, value, note) {
    return `<div class="metric"><strong>${formatValue(value)}</strong><span>${label}<br>${note}</span></div>`;
  }

  function renderEvidence(evidenceMap, values) {
    const keys = ["innerLength", "innerWidth", "innerHeight", "region1Size", "region2Size", "region3Size", "region4Size", "region5Size"];
    if (values.hasVerticalUTypePartition) keys.push("partitionFlat");
    if (values.hasHorizontalBoardPartition) keys.push("region7Size");
    return keys.map(key => {
      const item = evidenceMap[key];
      return `<article class="formula-card"><h3>${titleMap[key] || key}</h3><p>公式：<strong>${item.expression}</strong><br>代入：${item.substitution}<br>結果：<strong>${formatValue(item.value)}</strong></p></article>`;
    }).join("");
  }

  function renderConfiguration(result) {
    const values = result.values;
    const verticalText = values.hasVerticalUTypePartition ? "有U型內襯／Region 6已建立" : "無U型內襯";
    const horizontalText = values.hasHorizontalBoardPartition ? "有Board內襯／Region 7已建立" : "無Board內襯";
    document.getElementById("configurationReasoning").innerHTML = [
      "<h3>配置判讀</h3>",
      `<div>水平配件區：<strong>${values.horizontalAccessoryEnabled ? "啟動" : "停用"}</strong>；物件 ${formatValue(values.horizontalAccessoryIncrement)}＋公差 ${formatValue(values.horizontalAccessoryTolerance)}＋內襯 ${formatValue(values.horizontalBoardOccupancy)} mm</div>`,
      `<div>垂直配件區：<strong>${values.verticalAccessoryEnabled ? "啟動" : "停用"}</strong>；物件 ${formatValue(values.verticalAccessoryIncrement)}＋公差 ${formatValue(values.verticalAccessoryTolerance)}＋內襯 ${formatValue(values.verticalLinerOccupancy)} mm</div>`,
      `<div>配件配置：<strong>${values.accessoryLayout}</strong></div>`,
      `<div>水平：<strong>${horizontalText}</strong></div>`,
      `<div>垂直：<strong>${verticalText}</strong></div>`,
    ].join("");
  }

  function statusValue(value) { return formatValue(value); }

  function renderStatusCard(title, validation, preferredR) {
    const status = validation.status || "invalid";
    const reasonItems = [...(validation.errors || []), ...(validation.warnings || []), ...(validation.reasons || [])];
    const reasons = reasonItems.length
      ? `<ul>${reasonItems.map(reason => `<li>${reason}</li>`).join("")}</ul>`
      : "<p>目前沒有幾何警告。</p>";
    return `<article class="status-card ${status}"><h3>${title}（${status === "valid" ? "可用" : status === "warning" ? "注意" : "無法匯出"}）</h3><div>偏好R：<strong>${statusValue(preferredR)}</strong></div><div>理論上限：${statusValue(validation.theoreticalMaximumRadius)}；安全上限：${statusValue(validation.safeMaximumRadius)}</div><div>建議R：<strong>${statusValue(validation.suggestedRadius)}</strong></div>${reasons}</article>`;
  }

  function renderRegion5Status(r5) {
    const status = r5.status || "invalid";
    const reasonItems = [...(r5.errors || []), ...(r5.warnings || []), ...(r5.reasons || [])];
    const reasons = reasonItems.length
      ? `<ul>${reasonItems.map(reason => `<li>${reason}</li>`).join("")}</ul>`
      : "<p>目前沒有幾何警告。</p>";
    const large = r5.large;
    const small = r5.small;
    const preferredR = r5.preferredRadius;
    return `<article class="status-card ${status}"><h3>Region 5 圓角（${status === "valid" ? "可用" : status === "warning" ? "注意" : "無法匯出"}）</h3><div>大圓角：偏好R <strong>${statusValue(r5.preferredRadius.large)}</strong>；理論上限 ${statusValue(r5.large.theoreticalMaximumRadius)}；安全上限 ${statusValue(r5.large.safeMaximumRadius)}；建議R <strong>${statusValue(r5.suggestedRadius.large)}</strong></div><div>小圓角：偏好R <strong>${statusValue(r5.preferredRadius.small)}</strong>；理論上限 ${statusValue(r5.small.theoreticalMaximumRadius)}；安全上限 ${statusValue(r5.small.safeMaximumRadius)}；建議R <strong>${statusValue(r5.suggestedRadius.small)}</strong></div>${reasons}</article>`;
  }

  function renderFilletStatus() {
    if (!drawing) {
      document.getElementById("filletStatus").innerHTML = "";
      return;
    }
    const region4 = drawing.regions.find(region => region.id === 4);
    const region5 = drawing.regions.find(region => region.id === 5);
    const r4 = region4 && region4.filletValidation;
    const r5 = region5 && region5.filletValidation;
    document.getElementById("filletStatus").innerHTML = [
      r4 ? renderStatusCard("Region 4 圓角", r4, r4.preferredRadius) : "",
      r5 ? renderRegion5Status(r5) : "",
    ].join("");
  }

  function appendLabel(region, x, y) {
    if (!region) return;
    const label = svgElement("text", { x, y, class: "region-label" });
    label.textContent = String(region.id);
    svg.appendChild(label);
  }

  function renderLabels(result) {
    const values = result.values;
    const region1 = drawing.regions.find(region => region.id === 1);
    const region2 = drawing.regions.find(region => region.id === 2);
    const region3 = drawing.regions.filter(region => region.id === 3);
    const region4 = drawing.regions.find(region => region.id === 4);
    const region5 = drawing.regions.find(region => region.id === 5);
    appendLabel(region1, values.mainCheckLength / 2, values.innerWidth / 2);
    appendLabel(region2, -values.innerHeight / 2, values.innerWidth / 2);
    appendLabel(region2, values.mainCheckLength + values.innerHeight / 2, values.innerWidth / 2);
    appendLabel(region3[0], values.mainCheckLength / 2, -values.innerHeight / 2);
    appendLabel(region3[1], values.mainCheckLength / 2, values.innerWidth + values.innerHeight / 2);
    appendLabel(region4, values.mainCheckLength / 2, -values.innerHeight - values.lidZoneHeight / 2);
    appendLabel(region5, values.mainCheckLength / 2, -values.innerHeight - values.lidZoneHeight - values.innerHeight / 2);
    const label6 = drawing.region6;
    const label7 = drawing.region7;
    if (drawing.region6) appendLabel(label6, label6.x + label6.size[0] / 2, label6.y + label6.size[1] / 2);
    if (drawing.region7) appendLabel(label7, label7.x + label7.size[0] / 2, label7.y + label7.size[1] / 2);
  }

  function render(resetView = true) {
    drawing = null;
    exportButton.disabled = true;
    try {
      for (const key of booleanFields) current[key] = document.getElementById(key).checked;
      for (const key of numericFields) current[key] = Number(document.getElementById(key).value);
      syncAxisControls();
      const result = D.calculatePz(current);
      renderConfiguration(result);
      drawing = G.buildCompleteDrawing(result.values);
      exportButton.disabled = !drawing || drawing.canExport === false;
      svg.replaceChildren();
      installGrid();
      fullView = V.fit(drawing.bounds);
      if (resetView || !view) view = fullView;
      applyView();
      if (document.getElementById("showCut").checked) for (const entity of drawing.cut) svg.appendChild(drawEntity(entity));
      if (document.getElementById("showCrease").checked) for (const entity of drawing.crease) svg.appendChild(drawEntity(entity));
      renderLabels(result);
      const metrics = [
        metric("PZ內L", result.values.innerLength, "等於產品擺放後L；左右GAP已在結構增值內"),
        metric("PZ內W", result.values.innerWidth, "擺放後W＋水平物件＋公差＋勾選時內襯1t"),
        metric("PZ內H", result.values.innerHeight, "擺放後H＋垂直物件＋公差＋勾選時內襯1t"),
        metric("1號主基底", [result.values.region1Width, result.values.innerWidth], "L向＝擺放後L＋t/2×2；W向＝PZ內W，供Region 4飛機耳緊配"),
        metric("2號側翼", [result.values.region2SingleSideDepth, result.values.innerWidth], `單側結構深度＝${formatValue(result.values.innerHeight)}＋回折${formatValue(result.values.region2ReturnBand)}＋後段${formatValue(result.values.innerHeight)}＋卡榫${formatValue(result.values.region2LatchDepth)}；W向＝PZ內W`),
        metric("3號區域", [result.values.region3Width, result.values.innerHeight], `L向＝總基準${formatValue(result.values.mainCheckLength)}−膠囊${formatValue(result.values.slotWidth)}−固定1；H向＝PZ內H`),
        metric("4號區域", [result.values.region4Width, result.values.lidZoneHeight], `L向＝產品擺放後L${formatValue(result.values.region4Width)}；W向${formatValue(result.values.lidZoneHeight)}`),
        metric("5號區域", [result.values.region5Width, result.values.innerHeight], `L向＝總基準${formatValue(result.values.mainCheckLength)}−膠囊${formatValue(result.values.slotWidth)}；H向＝PZ內H`),
      ];
      if (drawing.region6) metrics.push(metric("Region 6 Partition", result.values.partitionFlat, `${formatValue(result.values.partitionSide)} | ${formatValue(result.values.partitionBase)} | ${formatValue(result.values.partitionSide)}，寬${formatValue(result.values.partitionSecondAxis)}；左右側翼各折1次`));
      if (drawing.region7) metrics.push(metric("Region 7 Partition", result.values.region7Size, "獨立水平Board Partition"));
      document.getElementById("metrics").innerHTML = metrics.join("");
      document.getElementById("formulaCards").innerHTML = renderEvidence(result.evidence, result.values);
      renderFilletStatus();
      const geometryMessages = [...result.warnings, ...drawing.geometryErrors, ...drawing.geometryWarnings];
      document.getElementById("warnings").textContent = geometryMessages.join("；");
      window.dispatchEvent(new CustomEvent("pz:calculated", { detail: { result } }));
    } catch (error) {
      drawing = null;
      exportButton.disabled = true;
      svg.replaceChildren();
      document.getElementById("metrics").innerHTML = "";
      document.getElementById("configurationReasoning").innerHTML = "";
      document.getElementById("formulaCards").innerHTML = "";
      document.getElementById("filletStatus").innerHTML = "";
      fullView = null;
      view = null;
      document.getElementById("warnings").textContent = error.message;
      window.dispatchEvent(new CustomEvent("pz:calculation-error", { detail: { error } }));
    }
  }

  function zoom(factor, anchor) {
    if (!view || !fullView) return;
    if (!anchor) anchor = { x: view.x + view.width / 2, y: view.y + view.height / 2 };
    const nextScale = fullView.width / (view.width * factor);
    if (nextScale < 0.5 || nextScale > 20) return;
    view = V.zoomAt(view, factor, anchor);
    applyView();
  }

  document.getElementById("zoomIn").addEventListener("click", () => zoom(0.75));
  document.getElementById("zoomOut").addEventListener("click", () => zoom(1.25));
  document.getElementById("zoomFit").addEventListener("click", () => { if (fullView) { view = fullView; applyView(); } });
  exportButton.addEventListener("click", () => {
    if (!drawing || drawing.canExport === false) return;
    const content = E.illustratorSvgFromDrawing(drawing);
    const url = URL.createObjectURL(new Blob([content], { type: "image/svg+xml;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "CD9030_PZ_diecut_review.svg";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  });
  svg.addEventListener("wheel", event => {
    event.preventDefault();
    if (!view) return;
    const rect = svg.getBoundingClientRect();
    const anchor = { x: view.x + (event.clientX - rect.left) / rect.width * view.width, y: view.y + (event.clientY - rect.top) / rect.height * view.height };
    zoom(event.deltaY < 0 ? 0.82 : 1.22, anchor);
  }, { passive: false });
  svg.addEventListener("pointerdown", event => { dragging = { x: event.clientX, y: event.clientY }; svg.classList.add("dragging"); svg.setPointerCapture(event.pointerId); });
  svg.addEventListener("pointermove", event => {
    if (!dragging || !view) return;
    const rect = svg.getBoundingClientRect();
    view = V.pan(view, -(event.clientX - dragging.x) * view.width / rect.width, -(event.clientY - dragging.y) * view.height / rect.height);
    dragging = { x: event.clientX, y: event.clientY };
    applyView();
  });
  svg.addEventListener("pointerup", event => { dragging = null; svg.classList.remove("dragging"); if (svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId); });
  document.getElementById("reset").addEventListener("click", () => { current = D.cd9030Preset(); setInputs(); render(true); });
  for (const button of document.querySelectorAll("[data-board-thickness]")) {
    button.addEventListener("click", () => {
      document.getElementById("boardThickness").value = button.dataset.boardThickness;
      render(true);
    });
  }
  for (const id of numericFields) document.getElementById(id).addEventListener("input", () => render(true));
  for (const id of booleanFields) document.getElementById(id).addEventListener("input", () => render(true));
  for (const id of ["showCut", "showCrease"]) document.getElementById(id).addEventListener("input", () => render(false));
  window.addEventListener("resize", applyView);
  setInputs();
  render();
})();
