(function () {
  "use strict";
  const D = window.CartonDomain;
  const palletSelect = document.getElementById("cartonPrimaryPallet");
  const optimizeButton = document.getElementById("cartonOptimize");
  const solutionsHost = document.getElementById("cartonSolutions");
  const detailHost = document.getElementById("cartonDetail");
  const warningHost = document.getElementById("cartonWarnings");
  let singleBox = null;
  let optimization = null;
  let selectedIndex = 0;
  let confirmedIndex = null;
  let stackSelections = { standardLayers: null, highCubeLayers: null };

  function decimal(value, digits = 1) { return Number(value.toFixed(digits)).toString(); }
  function percent(value) { return `${decimal(value * 100, 2)}%`; }

  function renderSingleBox() {
    const host = document.getElementById("cartonSingleBox");
    optimizeButton.disabled = !singleBox;
    if (!singleBox) {
      host.textContent = "等待有效的PZ尺寸";
      return;
    }
    host.innerHTML = `<strong>Single Box外尺寸：${singleBox.outer.length} × ${singleBox.outer.width} × ${singleBox.outer.height} mm</strong><span>固定裝箱：${singleBox.cartonPlane.x} × ${singleBox.cartonPlane.y}平面陣列；${singleBox.cartonPlane.z} mm為單層高度。禁止翻面及Z軸陣列。</span>`;
  }

  function gridRects(countX, countY, cellWidth, cellHeight, offsetX, offsetY, className) {
    let markup = "";
    for (let y = 0; y < countY; y += 1) {
      for (let x = 0; x < countX; x += 1) {
        markup += `<rect x="${offsetX + x * cellWidth}" y="${offsetY + y * cellHeight}" width="${cellWidth}" height="${cellHeight}" class="${className}"/>`;
      }
    }
    return markup;
  }

  function drawCarton(svg, solution) {
    const carton = solution.carton;
    const margin = 12;
    const labelMarkup = carton.outer.length >= carton.outer.width
      ? `<text x="${margin + 4}" y="${margin + carton.outer.width / 2}" class="diagram-label" transform="rotate(-90 ${margin + 4} ${margin + carton.outer.width / 2})">LABEL短邊</text>`
      : `<text x="${margin + carton.outer.length / 2}" y="${margin + 10}" class="diagram-label">LABEL短邊</text>`;
    svg.setAttribute("viewBox", `0 0 ${carton.outer.length + margin * 2} ${carton.outer.width + margin * 2}`);
    svg.innerHTML = `<rect x="${margin}" y="${margin}" width="${carton.outer.length}" height="${carton.outer.width}" class="diagram-boundary"/>${gridRects(solution.array.countX, solution.array.countY, singleBox.cartonPlane.x, singleBox.cartonPlane.y, margin + 13, margin + 8.5, "diagram-item")}${labelMarkup}`;
  }

  function drawPallet(svg, pallet, placement) {
    svg.setAttribute("viewBox", `0 0 ${pallet.length} ${pallet.width}`);
    if (!placement) {
      svg.innerHTML = `<rect x="2" y="2" width="${pallet.length - 4}" height="${pallet.width - 4}" class="diagram-boundary"/><text x="${pallet.length / 2}" y="${pallet.width / 2}" class="diagram-empty">無可行井字排列</text>`;
      return;
    }
    const usedWidth = placement.layout.countX * placement.footprint.length;
    const usedHeight = placement.layout.countY * placement.footprint.width;
    const offsetX = (pallet.length - usedWidth) / 2;
    const offsetY = (pallet.width - usedHeight) / 2;
    svg.innerHTML = `<rect x="2" y="2" width="${pallet.length - 4}" height="${pallet.width - 4}" class="diagram-boundary"/>${gridRects(placement.layout.countX, placement.layout.countY, placement.footprint.length, placement.footprint.width, offsetX, offsetY, "diagram-carton")}<text x="${pallet.length / 2}" y="${pallet.width - 18}" class="diagram-pallet-text">${placement.layout.countX} × ${placement.layout.countY} · ${percent(placement.utilization)}</text>`;
  }

  function renderEngineeringState() {
    const ready = document.getElementById("cartonWeightConfirmed").checked && document.getElementById("cartonLabelConfirmed").checked;
    const state = document.getElementById("cartonEngineeringState");
    state.textContent = ready ? "工程確認完成" : "尚未完成工程確認";
    state.classList.toggle("confirmed", ready);
  }

  function renderComputeStats() {
    const host = document.getElementById("cartonComputeStats");
    if (!optimization) { host.hidden = true; host.innerHTML = ""; return; }
    const stats = optimization.stats;
    host.hidden = false;
    host.innerHTML = [
      ["實際運算時間", `${decimal(stats.elapsedMs, 3)} ms`],
      ["內盒陣列候選", stats.arrayCandidates],
      ["主要棧板評估", stats.primaryOrientationEvaluations],
      ["有效方案", stats.validCandidates],
      ["參考棧板評估", stats.referenceOrientationEvaluations],
      ["總排列評估", stats.totalOrientationEvaluations],
      ["保留方案", stats.retainedSolutions],
    ].map(item => `<div><strong>${item[1]}</strong><span>${item[0]}</span></div>`).join("");
  }

  function stackSvg(mode, cartonHeight) {
    const width = 150;
    const blockX = 18;
    const blockWidth = 114;
    let y = mode.innerHeight;
    let shapes = `<rect x="1" y="1" width="148" height="${mode.innerHeight - 2}" class="stack-container"/>`;
    function pallet() {
      y -= 150;
      shapes += `<rect x="${blockX}" y="${y}" width="${blockWidth}" height="150" class="stack-pallet"/>`;
    }
    function cartons(count) {
      for (let index = 0; index < count; index += 1) {
        y -= cartonHeight;
        shapes += `<rect x="${blockX}" y="${y}" width="${blockWidth}" height="${cartonHeight}" class="stack-carton"/>`;
      }
    }
    pallet();
    cartons(mode.lowerLayers);
    if (mode.kind === "sea") { pallet(); cartons(mode.upperLayers); }
    if (mode.forkliftSpace > 0) {
      shapes += `<line x1="1" y1="${mode.forkliftSpace}" x2="149" y2="${mode.forkliftSpace}" class="stack-safe-line"/>`;
    }
    return `<svg viewBox="0 0 ${width} ${mode.innerHeight}" role="img" aria-label="${mode.label}堆疊側視圖">${shapes}</svg>`;
  }

  function containerTopSvg(mode, pallet) {
    const profileId = mode.profileId || mode.id;
    const layout = D.containerPalletLayout(profileId, pallet.id);
    const pad = 90;
    const placements = layout.placements.map(item => `<rect x="${pad + item.x}" y="${pad + item.y}" width="${item.length}" height="${item.width}" class="container-pallet"/>`).join("");
    const canvasLength = mode.kind === "air" ? pallet.length : mode.innerLength;
    const canvasWidth = mode.kind === "air" ? pallet.width : mode.innerWidth;
    const totalWidth = canvasLength + pad * 2;
    const totalHeight = canvasWidth + pad * 2;
    return `<svg viewBox="0 0 ${totalWidth} ${totalHeight}" role="img" aria-label="${mode.label}棧板俯視配置"><rect x="${pad}" y="${pad}" width="${canvasLength}" height="${canvasWidth}" class="container-shell"/>${placements}<text x="${pad + canvasLength / 2}" y="${pad + canvasWidth / 2}" class="container-count">${mode.floorPositions}</text></svg><p>${mode.kind === "air" ? "單棧板" : `${mode.innerLength} × ${mode.innerWidth} mm 櫃內`} · ${pallet.length} × ${pallet.width} mm棧板 · ${mode.floorPositions}個地板位置</p>`;
  }

  function renderShipping() {
    const host = document.getElementById("shippingAnalysis");
    const solution = optimization && confirmedIndex !== null ? optimization.solutions[confirmedIndex] : null;
    if (!solution) { host.hidden = true; return; }
    const stack = D.analyzeStackOptions(solution);
    host.hidden = false;
    document.getElementById("shippingSelectionSummary").textContent = `已選定：${solution.boxesPerCarton}入／箱，Carton外尺寸 ${solution.carton.outer.length}×${solution.carton.outer.width}×${solution.carton.outer.height} mm。請先確認標準櫃與高櫃層數。`;
    const stackCards = [stack.standard, stack.highCube].map(group => {
      const selectionKey = group.id === "standard" ? "standardLayers" : "highCubeLayers";
      const buttons = group.options.map(option => {
        const statusText = option.clearanceStatus === "recommended" ? "建議" : option.clearanceStatus === "review" ? "需人工審核" : "禁止";
        const selected = stackSelections[selectionKey] === option.totalCartonLayers;
        return `<button type="button" class="stack-option status-${option.clearanceStatus}${selected ? " selected" : ""}" data-stack-key="${selectionKey}" data-stack-layers="${option.totalCartonLayers}" ${option.clearanceStatus === "invalid" ? "disabled" : ""}><strong>${option.totalCartonLayers}層</strong><span>下${option.lowerLayers}＋上${option.upperLayers}</span><span>總高 ${option.completedHeight} mm</span><span>剩餘 ${option.containerRemaining} mm · ${statusText}</span></button>`;
      }).join("");
      return `<article class="stack-review-card"><span>Z軸差異審核</span><h3>${group.label} ${group.innerHeight} mm</h3><div class="stack-options">${buttons}</div></article>`;
    }).join("");
    let matrixMarkup = `<div class="matrix-pending">確認兩種高度的層數後，才會展開8組物流總表。</div>`;
    if (stackSelections.standardLayers !== null && stackSelections.highCubeLayers !== null) {
      const matrix = D.analyzeShippingMatrix(solution, stackSelections);
      matrixMarkup = `<section class="shipping-matrix"><header><h3>8組物流總表</h3><p>空運、20呎、40呎、40呎HQ × 兩種棧板</p></header><div class="shipping-matrix-grid">${matrix.map(item => {
        const size = item.kind === "air" ? `N/A × N/A × ${item.innerHeight}` : `${item.innerLength} × ${item.innerWidth} × ${item.innerHeight}`;
        const layers = item.kind === "air" ? `單棧${item.totalCartonLayers}層` : `下${item.lowerLayers}＋上${item.upperLayers}（${item.totalCartonLayers}層）`;
        return `<article class="matrix-card status-${item.clearanceStatus}"><figure class="container-top"><figcaption>${item.label} · ${item.pallet.label}</figcaption>${containerTopSvg(item, item.pallet)}</figure><dl><div><dt>櫃內L×W×H</dt><dd>${size}</dd></div><div><dt>棧板L×W×H</dt><dd>${item.pallet.length} × ${item.pallet.width} × 150</dd></div><div><dt>Carton陣列／每箱</dt><dd>${item.cartonArray.countX}×${item.cartonArray.countY}／${item.boxesPerCarton}入</dd></div><div><dt>每層Carton／產品</dt><dd>${item.cartonsPerLayer}箱／${item.unitsPerLayer}入</dd></div><div><dt>採用層數</dt><dd>${layers}</dd></div><div><dt>每位置入數</dt><dd>${item.unitsPerFloorPosition}入</dd></div><div><dt>地板位置／實體棧板</dt><dd>${item.floorPositions}／${item.physicalPallets}</dd></div><div><dt>總入數</dt><dd>${item.totalUnits}入</dd></div><div><dt>XY／Z利用率</dt><dd>${percent(item.horizontalUtilization)}／${percent(item.verticalUtilization)}</dd></div><div><dt>總高度／剩餘</dt><dd>${item.completedHeight}／${item.containerRemaining} mm</dd></div></dl></article>`;
      }).join("")}</div></section>`;
    }
    const modesHost = document.getElementById("shippingModes");
    modesHost.innerHTML = `<div class="stack-review-grid">${stackCards}</div>${matrixMarkup}`;
    for (const button of modesHost.querySelectorAll("[data-stack-key]")) {
      button.addEventListener("click", () => {
        stackSelections[button.dataset.stackKey] = Number(button.dataset.stackLayers);
        renderShipping();
      });
    }
  }

  function renderDetail() {
    const solution = optimization && optimization.solutions[selectedIndex];
    if (!solution) { detailHost.hidden = true; return; }
    detailHost.hidden = false;
    document.getElementById("cartonPrimaryCaption").textContent = `主要棧板：${optimization.primaryPallet.label} ${optimization.primaryPallet.length}×${optimization.primaryPallet.width}`;
    document.getElementById("cartonReferenceCaption").textContent = `參考棧板：${optimization.referencePallet.label} ${optimization.referencePallet.length}×${optimization.referencePallet.width}`;
    drawCarton(document.getElementById("cartonBoxDiagram"), solution);
    drawPallet(document.getElementById("cartonPrimaryDiagram"), optimization.primaryPallet, solution.primary);
    drawPallet(document.getElementById("cartonReferenceDiagram"), optimization.referencePallet, solution.reference);
    const carton = solution.carton;
    const referenceText = solution.reference ? `${solution.reference.layout.countX}×${solution.reference.layout.countY}；${percent(solution.reference.utilization)}` : "無符合限制的排列";
    document.getElementById("cartonEvidence").innerHTML = [
      `<article><h3>Single Box方向</h3><p>${singleBox.cartonPlane.x}×${singleBox.cartonPlane.y}為平面；${singleBox.cartonPlane.z}為單層高度。LABEL面固定，不翻面。</p></article>`,
      `<article><h3>Carton內尺寸</h3><p>L：${carton.evidence.innerLength}<br>W：${carton.evidence.innerWidth}<br>H：${carton.evidence.innerHeight}</p></article>`,
      `<article><h3>Carton外尺寸</h3><p>${carton.inner.length}×${carton.inner.width}×${carton.inner.height}，三軸各加8 → <strong>${carton.outer.length}×${carton.outer.width}×${carton.outer.height} mm</strong></p></article>`,
      `<article><h3>主要棧板利用率</h3><p>${solution.primary.cartonsPerLayer}箱 × ${solution.primary.footprint.length}×${solution.primary.footprint.width} ÷ ${optimization.primaryPallet.length}×${optimization.primaryPallet.width} = <strong>${percent(solution.primary.utilization)}</strong></p></article>`,
      `<article><h3>每層產品數</h3><p>${solution.boxesPerCarton}入/箱 × ${solution.primary.cartonsPerLayer}箱 = <strong>${solution.primary.unitsPerLayer}入/層</strong></p></article>`,
      `<article><h3>跨區參考</h3><p>${optimization.referencePallet.label}：${referenceText}；不影響主要推薦排名。</p></article>`,
    ].join("");
    renderEngineeringState();
  }

  function renderSolutions() {
    if (!optimization || !optimization.solutions.length) {
      solutionsHost.innerHTML = "";
      detailHost.hidden = true;
      document.getElementById("shippingAnalysis").hidden = true;
      warningHost.textContent = optimization ? optimization.warnings.join("；") : "";
      return;
    }
    warningHost.textContent = "";
    solutionsHost.innerHTML = optimization.solutions.map((solution, index) => {
      const carton = solution.carton;
      return `<article class="solution-card${index === selectedIndex ? " selected" : ""}${index === confirmedIndex ? " confirmed" : ""}" data-solution-index="${index}"><span>${index === 0 ? "推薦方案" : `次佳 ${index}`}</span><strong>${solution.boxesPerCarton}入／箱 · ${solution.array.countX}×${solution.array.countY}</strong><small>外箱 ${carton.outer.length}×${carton.outer.width}×${carton.outer.height}<br>棧板 ${solution.primary.layout.countX}×${solution.primary.layout.countY} · 利用率 ${percent(solution.primary.utilization)}<br>每層 ${solution.primary.unitsPerLayer}入</small><button type="button" data-confirm-solution="${index}">${index === confirmedIndex ? "已選定" : "選定此方案"}</button></article>`;
    }).join("");
    for (const card of solutionsHost.querySelectorAll("[data-solution-index]")) {
      card.addEventListener("click", () => { selectedIndex = Number(card.dataset.solutionIndex); renderSolutions(); });
    }
    for (const confirmButton of solutionsHost.querySelectorAll("[data-confirm-solution]")) {
      confirmButton.addEventListener("click", event => {
        event.stopPropagation();
        confirmedIndex = Number(confirmButton.dataset.confirmSolution);
        selectedIndex = confirmedIndex;
        stackSelections = { standardLayers: null, highCubeLayers: null };
        renderSolutions();
        renderShipping();
      });
    }
    renderDetail();
  }

  function runOptimization() {
    if (!singleBox) return;
    try {
      selectedIndex = 0;
      confirmedIndex = null;
      stackSelections = { standardLayers: null, highCubeLayers: null };
      optimization = D.optimize({ singleBox, primaryPallet: palletSelect.value });
      renderComputeStats();
      renderSolutions();
    } catch (error) {
      optimization = null;
      confirmedIndex = null;
      stackSelections = { standardLayers: null, highCubeLayers: null };
      renderComputeStats();
      solutionsHost.innerHTML = "";
      detailHost.hidden = true;
      warningHost.textContent = error.message;
    }
  }

  window.addEventListener("pz:calculated", event => {
    singleBox = D.singleBoxFromPz(event.detail.result.values);
    optimization = null;
    confirmedIndex = null;
    stackSelections = { standardLayers: null, highCubeLayers: null };
    renderComputeStats();
    solutionsHost.innerHTML = "";
    detailHost.hidden = true;
    renderSingleBox();
  });
  window.addEventListener("pz:calculation-error", () => { singleBox = null; optimization = null; confirmedIndex = null; stackSelections = { standardLayers: null, highCubeLayers: null }; renderComputeStats(); renderSingleBox(); });
  optimizeButton.addEventListener("click", runOptimization);
  palletSelect.addEventListener("change", () => { if (optimization) runOptimization(); });
  document.getElementById("cartonWeightConfirmed").addEventListener("input", renderEngineeringState);
  document.getElementById("cartonLabelConfirmed").addEventListener("input", renderEngineeringState);
  renderSingleBox();
})();
