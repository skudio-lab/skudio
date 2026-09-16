(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CartonDomain = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const CARTON_THICKNESS = 8;
  const INNER_ALLOWANCE = Object.freeze({ length: 18, width: 9, height: 11 });
  const PALLETS = Object.freeze({
    "asia-us": Object.freeze({ id: "asia-us", label: "美國／亞洲", length: 1200, width: 1000 }),
    "eu-uk": Object.freeze({ id: "eu-uk", label: "歐洲／英國", length: 1200, width: 800 }),
  });
  const TRANSPORT_PROFILES = Object.freeze([
    Object.freeze({ id: "sea-20-standard", label: "20呎標準櫃", kind: "sea", innerLength: 5890, innerWidth: 2350, innerHeight: 2390, safeHeight: 2100, forkliftSpace: 290, floorPositions: Object.freeze({ "eu-uk": 11, "asia-us": 10 }) }),
    Object.freeze({ id: "sea-40-standard", label: "40呎標準櫃", kind: "sea", innerLength: 12034, innerWidth: 2350, innerHeight: 2390, safeHeight: 2100, forkliftSpace: 290, floorPositions: Object.freeze({ "eu-uk": 24, "asia-us": 21 }) }),
    Object.freeze({ id: "sea-40-hq", label: "40呎HQ", kind: "sea", innerLength: 12034, innerWidth: 2350, innerHeight: 2690, safeHeight: 2390, forkliftSpace: 300, floorPositions: Object.freeze({ "eu-uk": 24, "asia-us": 21 }) }),
    Object.freeze({ id: "air-single", label: "空運單棧板", kind: "air", innerLength: 1200, innerWidth: 1000, innerHeight: 1500, safeHeight: 1500, forkliftSpace: 0, floorPositions: Object.freeze({ "eu-uk": 1, "asia-us": 1 }) }),
  ]);

  function finitePositive(name, value) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${name}必須大於0`);
    return value;
  }

  function singleBoxFromPz(values) {
    const outer = Object.freeze({
      length: finitePositive("Single Box外L", values.outerLength),
      width: finitePositive("Single Box外W", values.outerWidth),
      height: finitePositive("Single Box外H", values.outerHeight),
    });
    return Object.freeze({
      outer,
      cartonPlane: Object.freeze({ x: outer.height, y: outer.width, z: outer.length }),
      evidence: Object.freeze({
        length: "PZ整體結構基準跨度 + PZ紙厚補正",
        width: "PZ內W + PZ紙厚補正",
        height: "PZ內H + PZ紙厚補正",
        orientation: "LABEL面固定朝上；86×192為陣列平面，181為單層高度",
      }),
    });
  }

  function makeCarton(singleBox, countX, countY) {
    if (!Number.isInteger(countX) || countX < 1 || !Number.isInteger(countY) || countY < 1) {
      throw new Error("內盒陣列數必須為正整數");
    }
    const inner = Object.freeze({
      length: singleBox.cartonPlane.x * countX + INNER_ALLOWANCE.length,
      width: singleBox.cartonPlane.y * countY + INNER_ALLOWANCE.width,
      height: singleBox.cartonPlane.z + INNER_ALLOWANCE.height,
    });
    const outer = Object.freeze({
      length: inner.length + CARTON_THICKNESS,
      width: inner.width + CARTON_THICKNESS,
      height: inner.height + CARTON_THICKNESS,
    });
    return Object.freeze({
      array: Object.freeze({ countX, countY }),
      boxesPerCarton: countX * countY,
      inner,
      outer,
      evidence: Object.freeze({
        innerLength: `${singleBox.cartonPlane.x}×${countX}+18=${inner.length}`,
        innerWidth: `${singleBox.cartonPlane.y}×${countY}+9=${inner.width}`,
        innerHeight: `${singleBox.cartonPlane.z}+11=${inner.height}`,
        outer: `Carton內尺寸三軸各加(tc/2)×2=${CARTON_THICKNESS}`,
      }),
    });
  }

  function bestEvenGrid(maxX, maxY) {
    if (maxX < 1 || maxY < 1) return null;
    if (maxX % 2 === 0 || maxY % 2 === 0) return { countX: maxX, countY: maxY };
    const reduceX = maxX > 1 ? { countX: maxX - 1, countY: maxY } : null;
    const reduceY = maxY > 1 ? { countX: maxX, countY: maxY - 1 } : null;
    if (!reduceX) return reduceY;
    if (!reduceY) return reduceX;
    return reduceX.countX * reduceX.countY >= reduceY.countX * reduceY.countY ? reduceX : reduceY;
  }

  function evaluateOrientation(carton, pallet, rotated) {
    const footprint = rotated
      ? { length: carton.outer.width, width: carton.outer.length }
      : { length: carton.outer.length, width: carton.outer.width };
    const layout = bestEvenGrid(
      Math.floor(pallet.length / footprint.length),
      Math.floor(pallet.width / footprint.width)
    );
    if (!layout || layout.countX < 1 || layout.countY < 1) return null;
    const cartonsPerLayer = layout.countX * layout.countY;
    const utilization = cartonsPerLayer * footprint.length * footprint.width / (pallet.length * pallet.width);
    return Object.freeze({
      rotated,
      footprint: Object.freeze(footprint),
      layout: Object.freeze(layout),
      cartonsPerLayer,
      unitsPerLayer: cartonsPerLayer * carton.boxesPerCarton,
      utilization,
    });
  }

  function comparePlacement(left, right) {
    if (!left) return right;
    if (!right) return left;
    if (right.utilization !== left.utilization) return right.utilization > left.utilization ? right : left;
    if (right.unitsPerLayer !== left.unitsPerLayer) return right.unitsPerLayer > left.unitsPerLayer ? right : left;
    return left.rotated ? right : left;
  }

  function evaluatePallet(carton, pallet, stats) {
    if (stats) stats.orientationEvaluations += 2;
    return comparePlacement(
      evaluateOrientation(carton, pallet, false),
      evaluateOrientation(carton, pallet, true)
    );
  }

  const CONTAINER_LAYOUTS = Object.freeze({
    "sea-20-standard|asia-us": [[0,0,1200,1000],[1200,0,1200,1000],[2400,0,1000,1200],[3400,0,1000,1200],[4400,0,1200,1000],[0,1000,1000,1200],[1000,1000,1000,1200],[2000,1200,1200,1000],[3200,1200,1200,1000],[4400,1200,1200,1000]],
    "sea-20-standard|eu-uk": [[0,0,1200,800],[1200,0,1200,800],[0,800,800,1200],[800,800,800,1200],[1600,800,800,1200],[2400,300,800,1200],[3200,300,800,1200],[4000,300,800,1200],[2400,1500,1200,800],[3600,1500,1200,800],[4800,0,800,1200]],
    "sea-40-standard|asia-us": [[0,0,1200,1000],[1200,0,1200,1000],[2400,0,1200,1000],[3600,0,1200,1000],[4800,0,1200,1000],[6000,0,1200,1000],[7200,0,1200,1000],[8400,0,1200,1000],[9600,0,1000,1200],[10600,0,1000,1200],[0,1000,1000,1200],[1000,1000,1000,1200],[2000,1000,1000,1200],[3000,1000,1000,1200],[4000,1000,1000,1200],[5000,1000,1000,1200],[6000,1000,1000,1200],[7000,1000,1000,1200],[8000,1000,1000,1200],[9000,1200,1200,1000],[10200,1200,1200,1000]],
    "sea-40-standard|eu-uk": [[0,0,1200,800],[0,800,800,1200],[1200,300,800,1200],[800,1500,1200,800],[2000,0,1200,800],[3200,0,1200,800],[2000,800,800,1200],[2800,800,800,1200],[3600,800,800,1200],[4400,300,800,1200],[5200,300,800,1200],[6000,300,800,1200],[4400,1500,1200,800],[5600,1500,1200,800],[6800,0,1200,800],[8000,0,1200,800],[6800,800,800,1200],[7600,800,800,1200],[8400,800,800,1200],[9200,300,800,1200],[10000,300,800,1200],[10800,300,800,1200],[9200,1500,1200,800],[10400,1500,1200,800]],
  });

  function containerPalletLayout(modeId, palletId) {
    const profile = TRANSPORT_PROFILES.find(item => item.id === modeId);
    const pallet = PALLETS[palletId];
    if (!profile || !pallet) throw new Error("不支援的櫃型或棧板尺寸");
    if (profile.kind === "air") {
      return Object.freeze({ isValid: true, placements: Object.freeze([Object.freeze({ x: 0, y: 0, length: pallet.length, width: pallet.width, rotated: false })]) });
    }
    const templateMode = modeId === "sea-40-hq" ? "sea-40-standard" : modeId;
    const source = CONTAINER_LAYOUTS[`${templateMode}|${palletId}`] || [];
    const placements = source.map(([x, y, length, width]) => Object.freeze({
      x,
      y: y <= 300 ? 0 : profile.innerWidth - width,
      length,
      width,
      rotated: length === pallet.width && width === pallet.length,
    }));
    const overlaps = placements.some((item, index) => placements.slice(index + 1).some(other =>
      item.x < other.x + other.length && other.x < item.x + item.length && item.y < other.y + other.width && other.y < item.y + item.width
    ));
    const outside = placements.some(item => item.x < 0 || item.y < 0 || item.x + item.length > profile.innerLength || item.y + item.width > profile.innerWidth);
    return Object.freeze({ isValid: !overlaps && !outside, placements: Object.freeze(placements) });
  }

  function solutionKey(carton) {
    const sides = [carton.outer.length, carton.outer.width].sort((a, b) => a - b);
    return `${carton.boxesPerCarton}|${sides[0]}|${sides[1]}|${carton.outer.height}`;
  }

  function compareSolutions(left, right) {
    const utilizationDelta = right.primary.utilization - left.primary.utilization;
    if (Math.abs(utilizationDelta) > 1e-12) return utilizationDelta;
    if (right.primary.unitsPerLayer !== left.primary.unitsPerLayer) return right.primary.unitsPerLayer - left.primary.unitsPerLayer;
    if (left.boxesPerCarton !== right.boxesPerCarton) return left.boxesPerCarton - right.boxesPerCarton;
    return left.carton.outer.length * left.carton.outer.width - right.carton.outer.length * right.carton.outer.width;
  }

  function optimize(options) {
    const startedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    const singleBox = options && options.singleBox;
    if (!singleBox || !singleBox.cartonPlane) throw new Error("缺少Single Box外尺寸");
    const primaryPallet = PALLETS[options.primaryPallet];
    if (!primaryPallet) throw new Error("不支援的主要棧板尺寸");
    const referencePallet = primaryPallet.id === "asia-us" ? PALLETS["eu-uk"] : PALLETS["asia-us"];
    const maxPalletSide = Math.max(primaryPallet.length, primaryPallet.width);
    const maxCountX = Math.floor((maxPalletSide - INNER_ALLOWANCE.length - CARTON_THICKNESS) / singleBox.cartonPlane.x);
    const maxCountY = Math.floor((maxPalletSide - INNER_ALLOWANCE.width - CARTON_THICKNESS) / singleBox.cartonPlane.y);
    const candidates = [];
    const seen = new Set();
    const primaryStats = { orientationEvaluations: 0 };
    const referenceStats = { orientationEvaluations: 0 };
    let arrayCandidates = 0;

    for (let countX = 1; countX <= maxCountX; countX += 1) {
      for (let countY = 1; countY <= maxCountY; countY += 1) {
        if (countX * countY < 2) continue;
        arrayCandidates += 1;
        const carton = makeCarton(singleBox, countX, countY);
        const primary = evaluatePallet(carton, primaryPallet, primaryStats);
        if (!primary) continue;
        const key = solutionKey(carton);
        if (seen.has(key)) continue;
        seen.add(key);
        candidates.push(Object.freeze({
          carton,
          array: carton.array,
          boxesPerCarton: carton.boxesPerCarton,
          primary,
          reference: evaluatePallet(carton, referencePallet, referenceStats),
        }));
      }
    }

    candidates.sort(compareSolutions);
    const solutions = Object.freeze(candidates.slice(0, 4));
    const finishedAt = typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
    return Object.freeze({
      primaryPallet,
      referencePallet,
      objective: "maximize-pallet-footprint-utilization",
      solutions,
      candidateCount: candidates.length,
      stats: Object.freeze({
        elapsedMs: Math.max(0, finishedAt - startedAt),
        arrayCandidates,
        primaryOrientationEvaluations: primaryStats.orientationEvaluations,
        referenceOrientationEvaluations: referenceStats.orientationEvaluations,
        totalOrientationEvaluations: primaryStats.orientationEvaluations + referenceStats.orientationEvaluations,
        validCandidates: candidates.length,
        retainedSolutions: solutions.length,
      }),
      warnings: Object.freeze(candidates.length ? [] : ["沒有符合至少2入、井字排列與偶數軸限制的方案"]),
    });
  }

  function analyzeShipping(solution, palletId) {
    const pallet = PALLETS[palletId];
    if (!pallet) throw new Error("不支援的棧板尺寸");
    if (!solution || !solution.carton) throw new Error("請先選定Carton方案");
    const placement = evaluatePallet(solution.carton, pallet);
    if (!placement) throw new Error("選定Carton無法在此棧板形成合規井字排列");
    const cartonHeight = solution.carton.outer.height;
    const modes = TRANSPORT_PROFILES.map(profile => {
      const floorPositions = profile.floorPositions[palletId];
      const palletCount = profile.kind === "sea" ? 2 : 1;
      const minimumClearance = profile.kind === "sea" ? 150 : 0;
      const totalCartonLayers = Math.max(0, Math.floor((profile.innerHeight - palletCount * 150 - minimumClearance) / cartonHeight));
      const lowerLayers = profile.kind === "sea" ? Math.ceil(totalCartonLayers / 2) : totalCartonLayers;
      const upperLayers = profile.kind === "sea" ? Math.floor(totalCartonLayers / 2) : 0;
      const completedHeight = palletCount * 150 + totalCartonLayers * cartonHeight;
      const safetyRemaining = profile.innerHeight - completedHeight;
      const cartonStackHeight = totalCartonLayers * cartonHeight;
      const palletHeightTotal = palletCount * 150;
      const containerRemaining = profile.innerHeight - completedHeight;
      const clearanceStatus = profile.kind === "air"
        ? (completedHeight <= 1500 ? "recommended" : "invalid")
        : (containerRemaining >= 200 ? "recommended" : containerRemaining >= 150 ? "review" : "invalid");
      const unitsPerFloorPosition = placement.unitsPerLayer * totalCartonLayers;
      const physicalPallets = floorPositions * palletCount;
      const alternativeLayers = Math.max(0, totalCartonLayers - 1);
      const alternativeCompletedHeight = palletCount * 150 + alternativeLayers * cartonHeight;
      const alternativeRemaining = profile.innerHeight - alternativeCompletedHeight;
      const alternative = Object.freeze({
        totalCartonLayers: alternativeLayers,
        lowerLayers: profile.kind === "sea" ? Math.ceil(alternativeLayers / 2) : alternativeLayers,
        upperLayers: profile.kind === "sea" ? Math.floor(alternativeLayers / 2) : 0,
        completedHeight: alternativeCompletedHeight,
        containerRemaining: alternativeRemaining,
        unitDifference: placement.unitsPerLayer,
        totalUnitDifference: placement.unitsPerLayer * floorPositions,
        totalUnits: placement.unitsPerLayer * alternativeLayers * floorPositions,
      });
      return Object.freeze({
        id: profile.id,
        label: profile.label,
        kind: profile.kind,
        innerLength: profile.innerLength,
        innerWidth: profile.innerWidth,
        innerHeight: profile.innerHeight,
        safeHeight: profile.safeHeight,
        forkliftSpace: profile.forkliftSpace,
        floorPositions,
        physicalPallets,
        totalCartonLayers,
        lowerLayers,
        upperLayers,
        completedHeight,
        safetyRemaining,
        cartonStackHeight,
        palletHeightTotal,
        containerRemaining,
        clearanceStatus,
        alternative,
        cartonsPerLayer: placement.cartonsPerLayer,
        unitsPerLayer: placement.unitsPerLayer,
        unitsPerFloorPosition,
        totalUnits: clearanceStatus === "invalid" ? 0 : unitsPerFloorPosition * floorPositions,
        isValid: totalCartonLayers > 0 && clearanceStatus !== "invalid",
      });
    });
    return Object.freeze({ pallet, cartonHeight, placement, modes: Object.freeze(modes) });
  }

  function stackResult(innerHeight, cartonHeight, totalCartonLayers, unitsPerLayer) {
    const layers = Math.max(0, totalCartonLayers);
    const completedHeight = 300 + layers * cartonHeight;
    const containerRemaining = innerHeight - completedHeight;
    return Object.freeze({
      totalCartonLayers: layers,
      lowerLayers: Math.ceil(layers / 2),
      upperLayers: Math.floor(layers / 2),
      completedHeight,
      containerRemaining,
      clearanceStatus: containerRemaining >= 200 ? "recommended" : containerRemaining >= 150 ? "review" : "invalid",
      unitDifference: unitsPerLayer,
    });
  }

  function analyzeStackOptions(solution) {
    if (!solution || !solution.carton || !solution.primary) throw new Error("請先選定Carton方案");
    const cartonHeight = solution.carton.outer.height;
    function group(id, label, innerHeight) {
      const maximumLayers = Math.max(0, Math.floor((innerHeight - 300 - 150) / cartonHeight));
      return Object.freeze({
        id, label, innerHeight,
        options: Object.freeze([
          stackResult(innerHeight, cartonHeight, maximumLayers, solution.primary.unitsPerLayer),
          stackResult(innerHeight, cartonHeight, maximumLayers - 1, solution.primary.unitsPerLayer),
        ]),
      });
    }
    return Object.freeze({
      standard: group("standard", "標準櫃高度", 2390),
      highCube: group("highCube", "高櫃高度", 2690),
    });
  }

  function analyzeShippingMatrix(solution, selections) {
    if (!solution || !solution.carton) throw new Error("請先選定Carton方案");
    if (!selections || !Number.isInteger(selections.standardLayers) || !Number.isInteger(selections.highCubeLayers)) {
      throw new Error("請先確認標準櫃與高櫃層數");
    }
    const profiles = [
      TRANSPORT_PROFILES.find(item => item.id === "air-single"),
      TRANSPORT_PROFILES.find(item => item.id === "sea-20-standard"),
      TRANSPORT_PROFILES.find(item => item.id === "sea-40-standard"),
      TRANSPORT_PROFILES.find(item => item.id === "sea-40-hq"),
    ];
    const cartonHeight = solution.carton.outer.height;
    const rows = [];
    for (const profile of profiles) {
      for (const palletId of ["asia-us", "eu-uk"]) {
        const pallet = PALLETS[palletId];
        const placement = evaluatePallet(solution.carton, pallet);
        if (!placement) continue;
        const palletCount = profile.kind === "air" ? 1 : 2;
        const totalCartonLayers = profile.kind === "air"
          ? Math.max(0, Math.floor((1500 - 150) / cartonHeight))
          : profile.id === "sea-40-hq" ? selections.highCubeLayers : selections.standardLayers;
        const completedHeight = palletCount * 150 + totalCartonLayers * cartonHeight;
        const containerRemaining = profile.innerHeight - completedHeight;
        const clearanceStatus = profile.kind === "air"
          ? (completedHeight <= 1500 ? "recommended" : "invalid")
          : (containerRemaining >= 200 ? "recommended" : containerRemaining >= 150 ? "review" : "invalid");
        const floorPositions = profile.floorPositions[palletId];
        const unitsPerFloorPosition = placement.unitsPerLayer * totalCartonLayers;
        rows.push(Object.freeze({
          id: `${profile.id}|${palletId}`,
          profileId: profile.id,
          label: profile.label,
          kind: profile.kind,
          pallet,
          placement,
          innerLength: profile.kind === "air" ? null : profile.innerLength,
          innerWidth: profile.kind === "air" ? null : profile.innerWidth,
          innerHeight: profile.innerHeight,
          cartonArray: solution.array,
          boxesPerCarton: solution.boxesPerCarton,
          cartonsPerLayer: placement.cartonsPerLayer,
          unitsPerLayer: placement.unitsPerLayer,
          totalCartonLayers,
          lowerLayers: profile.kind === "air" ? totalCartonLayers : Math.ceil(totalCartonLayers / 2),
          upperLayers: profile.kind === "air" ? 0 : Math.floor(totalCartonLayers / 2),
          completedHeight,
          containerRemaining,
          clearanceStatus,
          floorPositions,
          physicalPallets: floorPositions * palletCount,
          unitsPerFloorPosition,
          totalUnits: clearanceStatus === "invalid" ? 0 : unitsPerFloorPosition * floorPositions,
          horizontalUtilization: placement.utilization,
          verticalUtilization: completedHeight / profile.innerHeight,
        }));
      }
    }
    return Object.freeze(rows);
  }

  return Object.freeze({
    CARTON_THICKNESS,
    INNER_ALLOWANCE,
    PALLETS,
    TRANSPORT_PROFILES,
    singleBoxFromPz,
    makeCarton,
    evaluatePallet,
    optimize,
    analyzeShipping,
    analyzeStackOptions,
    analyzeShippingMatrix,
    containerPalletLayout,
  });
});
