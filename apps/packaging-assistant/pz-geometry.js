(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PzGeometry = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const EPS = 1e-9;
  const point = (x, y) => Object.freeze({ x, y });
  const line = (p1, p2, layer = "CUT", meta = {}) => Object.freeze({ type: "line", p1, p2, layer, meta });
  const arc = (center, radius, startAngle, endAngle, layer = "CUT", meta = {}) =>
    Object.freeze({ type: "arc", center, radius, startAngle, endAngle, layer, meta });
  const sub = (a, b) => point(a.x - b.x, a.y - b.y);
  const add = (a, b) => point(a.x + b.x, a.y + b.y);
  const scale = (v, s) => point(v.x * s, v.y * s);
  const dot = (a, b) => a.x * b.x + a.y * b.y;
  const length = v => Math.hypot(v.x, v.y);
  const normalize = v => {
    const size = length(v);
    if (size < EPS) throw new Error("Cannot normalize a zero-length vector");
    return scale(v, 1 / size);
  };
  const samePoint = (a, b) => Math.hypot(a.x - b.x, a.y - b.y) < EPS;
  const degrees = radians => radians * 180 / Math.PI;

  function intersection(a, b) {
    const x1 = a.p1.x, y1 = a.p1.y, x2 = a.p2.x, y2 = a.p2.y;
    const x3 = b.p1.x, y3 = b.p1.y, x4 = b.p2.x, y4 = b.p2.y;
    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denominator) < EPS) throw new Error("Lines are parallel and do not have a unique intersection");
    const detA = x1 * y2 - y1 * x2;
    const detB = x3 * y4 - y3 * x4;
    return point(
      (detA * (x3 - x4) - (x1 - x2) * detB) / denominator,
      (detA * (y3 - y4) - (y1 - y2) * detB) / denominator,
    );
  }

  function sharedVertex(a, b) {
    for (const pa of [a.p1, a.p2]) {
      for (const pb of [b.p1, b.p2]) if (samePoint(pa, pb)) return pa;
    }
    throw new Error("Fillet source lines must have a shared vertex");
  }

  function otherEnd(segment, vertex) {
    return samePoint(segment.p1, vertex) ? segment.p2 : segment.p1;
  }

  function fillet(a, b, radius) {
    if (!(radius > 0)) throw new Error("Fillet radius must be positive");
    const vertex = sharedVertex(a, b);
    const u = normalize(sub(otherEnd(a, vertex), vertex));
    const v = normalize(sub(otherEnd(b, vertex), vertex));
    const cosine = Math.max(-1, Math.min(1, dot(u, v)));
    const angle = Math.acos(cosine);
    if (angle < EPS || Math.abs(Math.PI - angle) < EPS) throw new Error("Parallel lines cannot be filleted");
    const tangentDistance = radius / Math.tan(angle / 2);
    const tangentA = add(vertex, scale(u, tangentDistance));
    const tangentB = add(vertex, scale(v, tangentDistance));
    const bisector = normalize(add(u, v));
    const center = add(vertex, scale(bisector, radius / Math.sin(angle / 2)));
    const startAngle = degrees(Math.atan2(tangentA.y - center.y, tangentA.x - center.x));
    const endAngle = degrees(Math.atan2(tangentB.y - center.y, tangentB.x - center.x));
    return Object.freeze({
      center, radius, tangentA, tangentB,
      arc: arc(center, radius, startAngle, endAngle, a.layer, { feature: "fillet" }),
      trimmedA: line(otherEnd(a, vertex), tangentA, a.layer, a.meta),
      trimmedB: line(tangentB, otherEnd(b, vertex), b.layer, b.meta),
    });
  }

  function immutableFilletAnalysis(preferredRadius, theoreticalMaximumRadius, safeMaximumRadius, suggestedRadius, tangentDistance, status, reasons) {
    return Object.freeze({
      status,
      preferredRadius,
      theoreticalMaximumRadius,
      safeMaximumRadius,
      suggestedRadius,
      tangentDistance,
      reasons: Object.freeze(reasons),
    });
  }

  function finitePoint(p) {
    return p && Number.isFinite(p.x) && Number.isFinite(p.y);
  }

  function isFiniteLineEntity(entity) {
    return entity && entity.type === "line" && finitePoint(entity.p1) && finitePoint(entity.p2);
  }

  function analyzeFillet(a, b, preferredRadius, options = {}) {
    const reasons = [];
    const safetyFactor = options && options.safetyFactor === undefined ? 0.9 : options && options.safetyFactor;
    const validSafetyFactor = Number.isFinite(safetyFactor) && safetyFactor > 0 && safetyFactor <= 1;
    let theoreticalMaximumRadius = null;
    let safeMaximumRadius = null;
    let tangentDistance = null;
    let suggestedRadius = 0;
    let status = "invalid";
    let geometry = null;

    if (!validSafetyFactor) reasons.push("安全係數必須在 (0, 1] 範圍內");
    if (!isFiniteLineEntity(a) || !isFiniteLineEntity(b)) {
      reasons.push("有限線段輸入無效");
    } else {
      const vertexCandidates = [a.p1, a.p2].flatMap(pa => [b.p1, b.p2].filter(pb => samePoint(pa, pb)));
      if (!vertexCandidates.length) {
        reasons.push("有限線段必須共用頂點");
      } else {
        const vertex = vertexCandidates[0];
        const aEnd = otherEnd(a, vertex);
        const bEnd = otherEnd(b, vertex);
        const vectorA = sub(aEnd, vertex);
        const vectorB = sub(bEnd, vertex);
        const lengthA = length(vectorA);
        const lengthB = length(vectorB);
        if (lengthA < EPS || lengthB < EPS) {
          reasons.push("有限線段不可為零長度");
        } else {
          const cosine = Math.max(-1, Math.min(1, dot(scale(vectorA, 1 / lengthA), scale(vectorB, 1 / lengthB))));
          const angle = Math.acos(cosine);
          if (angle < EPS || Math.abs(Math.PI - angle) < EPS) {
            reasons.push("平行線不能建立圓角");
          } else {
            const tangentFactor = Math.tan(angle / 2);
            const shortestLength = Math.min(lengthA, lengthB);
            theoreticalMaximumRadius = shortestLength * tangentFactor;
            safeMaximumRadius = theoreticalMaximumRadius * safetyFactor;
            geometry = { angle, tangentFactor };
          }
        }
      }
    }

    if (!(Number.isFinite(preferredRadius) && preferredRadius > 0)) {
      reasons.push("圓角半徑必須是正數");
    } else if (geometry && validSafetyFactor) {
      tangentDistance = preferredRadius / geometry.tangentFactor;
      suggestedRadius = Math.max(0, Math.floor(Math.min(preferredRadius, safeMaximumRadius) + EPS));
      if (preferredRadius > theoreticalMaximumRadius + EPS) {
        reasons.push("圓角切線距離超出安全可用線段");
      } else if (preferredRadius <= safeMaximumRadius + EPS) {
        status = "valid";
      } else if (preferredRadius <= theoreticalMaximumRadius + EPS) {
        status = "warning";
        reasons.push("圓角切線距離超出安全可用線段");
      } else {
        reasons.push("圓角切線距離超出安全可用線段");
      }
    }

    return immutableFilletAnalysis(
      preferredRadius,
      theoreticalMaximumRadius,
      safeMaximumRadius,
      suggestedRadius,
      tangentDistance,
      status,
      reasons,
    );
  }

  function filletFinite(a, b, radius, options = {}) {
    const analysis = analyzeFillet(a, b, radius, options);
    if (analysis.status === "invalid") {
      throw new Error(`有限線段圓角無法建立：${analysis.reasons.join("、")}`);
    }
    return Object.freeze({ ...fillet(a, b, radius), analysis });
  }

  function analyzeSharedSegmentFillets(segmentLength, firstTangentDistance, secondTangentDistance, minimumRemainingStraight = 0) {
    const reasons = [];
    const numericInputs = [segmentLength, firstTangentDistance, secondTangentDistance, minimumRemainingStraight];
    const allFinite = numericInputs.every(Number.isFinite);
    const allNonNegative = numericInputs.every(value => value >= 0);
    const usedLength = allFinite ? firstTangentDistance + secondTangentDistance : null;
    const remainingLength = allFinite ? segmentLength - usedLength : null;
    if (!allFinite) reasons.push("共享線段長度與切點距離必須是有限數值");
    if (!allNonNegative) reasons.push("共享線段長度與切點距離不可為負數");
    if (allFinite && allNonNegative && remainingLength < minimumRemainingStraight - EPS) {
      reasons.push("兩個圓角之間的剩餘直線不足");
    }
    const status = reasons.length ? "invalid" : "valid";
    return Object.freeze({
      status,
      segmentLength,
      usedLength,
      minimumRemainingStraight,
      remainingLength,
      reasons: Object.freeze(reasons),
    });
  }

  function distancePointToLine(p, segment) {
    const a = segment.p1, b = segment.p2;
    const numerator = Math.abs((b.y - a.y) * p.x - (b.x - a.x) * p.y + b.x * a.y - b.y * a.x);
    return numerator / Math.hypot(b.y - a.y, b.x - a.x);
  }

  function mirrorX(entity, axisX) {
    const mirrorPoint = p => point(2 * axisX - p.x, p.y);
    if (entity.type === "line") return line(mirrorPoint(entity.p1), mirrorPoint(entity.p2), entity.layer, entity.meta);
    if (entity.type === "arc") {
      return arc(mirrorPoint(entity.center), entity.radius, 180 - entity.endAngle, 180 - entity.startAngle, entity.layer, entity.meta);
    }
    throw new Error(`Unsupported entity type: ${entity.type}`);
  }

  function mirrorY(entity, axisY) {
    const mirrorPoint = p => point(p.x, 2 * axisY - p.y);
    if (entity.type === "line") return line(mirrorPoint(entity.p1), mirrorPoint(entity.p2), entity.layer, entity.meta);
    if (entity.type === "arc") return arc(mirrorPoint(entity.center), entity.radius, -entity.endAngle, -entity.startAngle, entity.layer, entity.meta);
    throw new Error(`Unsupported entity type: ${entity.type}`);
  }

  function normalizedAngle(value) {
    const n = value % 360;
    return n < 0 ? n + 360 : n;
  }

  function angleOnArc(candidate, start, end) {
    if (Math.abs(end - start) >= 360 - EPS) return true;
    const c = normalizedAngle(candidate), s = normalizedAngle(start), e = normalizedAngle(end);
    return s <= e ? c >= s - EPS && c <= e + EPS : c >= s - EPS || c <= e + EPS;
  }

  function bounds(entities) {
    if (!entities.length) throw new Error("Cannot calculate bounds of empty geometry");
    const points = [];
    for (const entity of entities) {
      if (entity.type === "line") points.push(entity.p1, entity.p2);
      else if (entity.type === "arc") {
        for (const angle of [entity.startAngle, entity.endAngle, 0, 90, 180, 270]) {
          if (angleOnArc(angle, entity.startAngle, entity.endAngle)) {
            const radians = angle * Math.PI / 180;
            points.push(point(entity.center.x + entity.radius * Math.cos(radians), entity.center.y + entity.radius * Math.sin(radians)));
          }
        }
      }
    }
    const xs = points.map(p => p.x), ys = points.map(p => p.y);
    const minX = Math.min(...xs), minY = Math.min(...ys), maxX = Math.max(...xs), maxY = Math.max(...ys);
    return Object.freeze({ minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY });
  }

  function cross(a, b) { return a.x * b.y - a.y * b.x; }

  function cleanEntityKey(entity) {
    const q = value => Math.round(value * 1e6) / 1e6;
    if (entity.type === "line") {
      const a = `${q(entity.p1.x)},${q(entity.p1.y)}`;
      const b = `${q(entity.p2.x)},${q(entity.p2.y)}`;
      return `L:${a < b ? `${a}:${b}` : `${b}:${a}`}`;
    }
    return `A:${q(entity.center.x)},${q(entity.center.y)},${q(entity.radius)},${q(entity.startAngle)},${q(entity.endAngle)}`;
  }

  function dedupeEntities(entities) {
    const seen = new Set();
    return entities.filter(entity => {
      if (entity.type === "line" && length(sub(entity.p2, entity.p1)) < EPS) return false;
      const key = cleanEntityKey(entity);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function subtractCollinearCuts(creaseEntity, cutEntities) {
    if (creaseEntity.type !== "line") return [creaseEntity];
    const direction = sub(creaseEntity.p2, creaseEntity.p1);
    const span = length(direction);
    if (span < EPS) return [];
    const unit = scale(direction, 1 / span);
    const blocked = [];
    for (const cutter of cutEntities) {
      if (cutter.type !== "line") continue;
      const cutterDirection = sub(cutter.p2, cutter.p1);
      if (Math.abs(cross(direction, cutterDirection)) > EPS * span * Math.max(length(cutterDirection), 1)) continue;
      if (Math.abs(cross(direction, sub(cutter.p1, creaseEntity.p1))) > EPS * span) continue;
      const first = dot(sub(cutter.p1, creaseEntity.p1), unit);
      const second = dot(sub(cutter.p2, creaseEntity.p1), unit);
      const start = Math.max(0, Math.min(first, second));
      const end = Math.min(span, Math.max(first, second));
      if (end - start > EPS) blocked.push([start, end]);
    }
    blocked.sort((a, b) => a[0] - b[0]);
    const merged = [];
    for (const interval of blocked) {
      const last = merged[merged.length - 1];
      if (last && interval[0] <= last[1] + EPS) last[1] = Math.max(last[1], interval[1]);
      else merged.push(interval.slice());
    }
    const pieces = [];
    let cursor = 0;
    for (const [start, end] of merged) {
      if (start - cursor > EPS) pieces.push(line(add(creaseEntity.p1, scale(unit, cursor)), add(creaseEntity.p1, scale(unit, start)), "CREASE", creaseEntity.meta));
      cursor = Math.max(cursor, end);
    }
    if (span - cursor > EPS) pieces.push(line(add(creaseEntity.p1, scale(unit, cursor)), creaseEntity.p2, "CREASE", creaseEntity.meta));
    return pieces;
  }

  function thirdPassCleanup(cutEntities, creaseEntities) {
    const cut = dedupeEntities(cutEntities);
    const creaseWithoutCutOverlap = creaseEntities.flatMap(entity => subtractCollinearCuts(entity, cut));
    const crease = dedupeEntities(creaseWithoutCutOverlap);
    return Object.freeze({
      cut: Object.freeze(cut),
      crease: Object.freeze(crease),
      removedCutDuplicates: cutEntities.length - cut.length,
      removedOrSplitCreases: creaseEntities.length - crease.length,
    });
  }

  function buildThirdPassCutReplacements(values) {
    const region3Inset = values.regionInsets[3];
    const region3Right = values.mainCheckLength - region3Inset;
    const region4Inset = values.regionInsets[4];
    const region4Right = region4Inset + values.region4Width;
    const region5Inset = values.regionInsets[5];
    const region5Right = region5Inset + values.region5Width;
    const region4BottomY = -values.innerHeight;
    const region5Top = -values.innerHeight - values.lidZoneHeight - values.innerHeight;
    const region5TopY = region5Top + values.region5TopRetreat;
    const meta = Object.freeze({ feature: "third-pass-structural-replacement" });
    return Object.freeze([
      line(point(0, 0), point(region3Inset, 0), "CUT", meta),
      line(point(region3Right, 0), point(values.mainCheckLength, 0), "CUT", meta),
      line(point(0, values.innerWidth), point(region3Inset, values.innerWidth), "CUT", meta),
      line(point(region3Right, values.innerWidth), point(values.mainCheckLength, values.innerWidth), "CUT", meta),
      line(point(region3Inset, region4BottomY), point(region4Inset, region4BottomY), "CUT", meta),
      line(point(region4Right, region4BottomY), point(region3Right, region4BottomY), "CUT", meta),
      line(point(region5Inset, region5Top), point(region5Inset, region5TopY), "CUT", meta),
      line(point(region5Right, region5Top), point(region5Right, region5TopY), "CUT", meta),
    ]);
  }

  function applyThirdPassCreaseOwnership(creaseEntities, values) {
    const region4BottomY = -values.innerHeight;
    const region5Bottom = -values.innerHeight - values.lidZoneHeight;
    const left = values.regionInsets[4];
    const right = left + values.region4Width;
    const region5Left = values.regionInsets[5];
    const region5Right = region5Left + values.region5Width;
    const earEndX = left - values.region5SlantOutward;
    const focusFraction = (region5Left - earEndX) / (left - earEndX);
    const region5CutIntersectionY = region5Bottom - values.region5SlantUpward + values.region5SlantUpward * focusFraction;
    return creaseEntities.map(entity => {
      const isSecondReturnFold = entity.type === "line"
        && entity.meta?.region === 2
        && entity.meta?.feature === "return-fold"
        && entity.meta?.sequence === 2;
      if (isSecondReturnFold) {
        return line(
          point(entity.p1.x, values.region2EntryRise),
          point(entity.p2.x, values.innerWidth - values.region2EntryRise),
          "CREASE",
          Object.freeze({ ...entity.meta, feature: "third-pass-trimmed-return-fold" }),
        );
      }
      const isRegion5BottomSkeleton = entity.type === "line"
        && entity.meta?.region === 5
        && entity.meta?.feature === "panel-boundary"
        && Math.abs(entity.p1.y - region5Bottom) < EPS
        && Math.abs(entity.p2.y - region5Bottom) < EPS;
      if (isRegion5BottomSkeleton) {
        return line(point(left, region5Bottom), point(right, region5Bottom), "CREASE", Object.freeze({ region: 5, feature: "third-pass-owned-fold" }));
      }
      const isRegion5Side = entity.type === "line"
        && entity.meta?.region === 5
        && entity.meta?.feature === "panel-boundary"
        && (Math.abs(entity.p1.x - region5Left) < EPS || Math.abs(entity.p1.x - region5Right) < EPS);
      if (isRegion5Side) {
        const topPoint = entity.p1.y < entity.p2.y ? entity.p1 : entity.p2;
        return line(topPoint, point(topPoint.x, region5CutIntersectionY), "CREASE", Object.freeze({ region: 5, feature: "third-pass-trimmed-side-fold" }));
      }
      const isRegion4Side = entity.type === "line"
        && entity.meta?.region === 4
        && entity.meta?.feature === "panel-boundary"
        && Math.abs(entity.p1.x - entity.p2.x) < EPS;
      if (isRegion4Side) {
        const topPoint = entity.p1.y < entity.p2.y ? entity.p1 : entity.p2;
        return line(topPoint, point(topPoint.x, region4BottomY - values.cornerOpening), "CREASE", Object.freeze({ region: 4, feature: "third-pass-trimmed-side-fold" }));
      }
      const isRegion3Side = entity.type === "line"
        && entity.meta?.region === 3
        && entity.meta?.feature === "panel-boundary"
        && Math.abs(entity.p1.x - entity.p2.x) < EPS;
      if (isRegion3Side) {
        const minY = Math.min(entity.p1.y, entity.p2.y);
        const maxY = Math.max(entity.p1.y, entity.p2.y);
        const isTopRegion = maxY <= EPS;
        const trimmedStart = isTopRegion ? minY : minY + values.cornerOpening;
        const trimmedEnd = isTopRegion ? maxY - values.cornerOpening : maxY;
        return line(point(entity.p1.x, trimmedStart), point(entity.p1.x, trimmedEnd), "CREASE", Object.freeze({ region: 3, feature: "third-pass-trimmed-side-fold" }));
      }
      return entity;
    });
  }

  function roundedVerticalSlot(center, width, totalLength, owner) {
    if (totalLength < width) throw new Error("Rounded slot length must be at least its width");
    const radius = width / 2;
    const halfStraight = (totalLength - width) / 2;
    const topCenter = point(center.x, center.y - halfStraight);
    const bottomCenter = point(center.x, center.y + halfStraight);
    const meta = Object.freeze({ feature: "locking-slot", owner });
    const entities = Object.freeze([
      line(point(center.x - radius, topCenter.y), point(center.x - radius, bottomCenter.y), "CUT", meta),
      arc(bottomCenter, radius, 0, 180, "CUT", meta),
      line(point(center.x + radius, bottomCenter.y), point(center.x + radius, topCenter.y), "CUT", meta),
      arc(topCenter, radius, 180, 360, "CUT", meta),
    ]);
    return Object.freeze({ owner, center, width, length: totalLength, radius, entities });
  }

  function buildRegion1(values) {
    const width = values.region1Width;
    const x = values.regionInsets[1];
    const height = values.innerWidth;
    const creaseMeta = Object.freeze({ region: 1, feature: "base-boundary" });
    const baseRectangle = Object.freeze([
      line(point(x, 0), point(x + width, 0), "CREASE", creaseMeta),
      line(point(x + width, 0), point(x + width, height), "CREASE", creaseMeta),
      line(point(x + width, height), point(x, height), "CREASE", creaseMeta),
      line(point(x, height), point(x, 0), "CREASE", creaseMeta),
    ]);
    const centerY = height / 2;
    const insetX = values.slotWidth / 2;
    const withMargin = slot => Object.freeze(Object.assign({}, slot, { startMargin: values.slotCenterMargin }));
    const slots = Object.freeze([
      withMargin(roundedVerticalSlot(point(insetX, centerY), values.slotWidth, values.slotLength, 1)),
      withMargin(roundedVerticalSlot(point(values.mainCheckLength - insetX, centerY), values.slotWidth, values.slotLength, 1)),
    ]);
    return Object.freeze({
      id: 1,
      x,
      size: Object.freeze([width, height]),
      baseRectangle,
      slots,
      reliefCuts: Object.freeze([]),
      cut: Object.freeze(slots.flatMap(slot => slot.entities)),
      crease: Object.freeze([]),
    });
  }

  function buildRegion2(values) {
    const baseWidth = values.mainCheckLength;
    const height = values.innerWidth;
    const depth = values.region2PanelDepth;
    const extensionDepth = values.region2ExtensionDepth;
    const returnBand = values.region2ReturnBand;
    const entryRise = values.region2EntryRise;
    const outerWingDepth = values.region2OuterWingDepth;
    const latchDepth = values.region2LatchDepth;
    const latchLength = values.region2LatchLength;
    const latchMargin = values.region2LatchMargin;
    const meta = Object.freeze({ region: 2, feature: "side-wing" });
    const outerX = -depth - extensionDepth;
    const latchOuterX = outerX - latchDepth;
    const latchMeta = Object.freeze({ region: 2, feature: "outer-locking-tab" });
    const entryMeta = edge => Object.freeze({ region: 2, feature: "return-fold-entry", edge });
    const leftLatch = Object.freeze({ depth: latchDepth, length: latchLength, margin: latchMargin, outerX: latchOuterX });
    const leftEntities = Object.freeze([
      line(point(outerX, entryRise), point(-depth - returnBand, entryRise), "CUT", meta),
      line(point(-depth - returnBand, entryRise), point(-depth, 0), "CUT", entryMeta("top")),
      line(point(-depth, 0), point(0, 0), "CUT", meta),
      line(point(outerX, entryRise), point(outerX, latchMargin), "CUT", meta),
      line(point(outerX, latchMargin), point(latchOuterX, latchMargin), "CUT", latchMeta),
      line(point(latchOuterX, latchMargin), point(latchOuterX, latchMargin + latchLength), "CUT", latchMeta),
      line(point(latchOuterX, latchMargin + latchLength), point(outerX, latchMargin + latchLength), "CUT", latchMeta),
      line(point(outerX, latchMargin + latchLength), point(outerX, height - entryRise), "CUT", meta),
      line(point(outerX, height - entryRise), point(-depth - returnBand, height - entryRise), "CUT", meta),
      line(point(-depth - returnBand, height - entryRise), point(-depth, height), "CUT", entryMeta("bottom")),
      line(point(-depth, height), point(0, height), "CUT", meta),
    ]);
    const axisX = baseWidth / 2;
    const rightEntities = Object.freeze(leftEntities.map(entity => mirrorX(entity, axisX)));
    return Object.freeze({
      id: 2,
      entryAngle: values.region2EntryAngle,
      entryRise,
      left: Object.freeze({ depth, extensionDepth, returnBand, outerWingDepth, latch: leftLatch, entities: leftEntities }),
      right: Object.freeze({ depth, extensionDepth, returnBand, outerWingDepth, latch: Object.freeze({ depth: latchDepth, length: latchLength, margin: latchMargin, outerX: baseWidth - latchOuterX }), entities: rightEntities }),
      cut: Object.freeze([...leftEntities, ...rightEntities]),
      crease: Object.freeze([
        line(point(0, 0), point(0, height), "CREASE", meta),
        line(point(baseWidth, 0), point(baseWidth, height), "CREASE", meta),
        line(point(-depth, 0), point(-depth, height), "CREASE", Object.freeze({ region: 2, feature: "return-fold", sequence: 1 })),
        line(point(-depth - returnBand, 0), point(-depth - returnBand, height), "CREASE", Object.freeze({ region: 2, feature: "return-fold", sequence: 2 })),
        line(point(baseWidth + depth, 0), point(baseWidth + depth, height), "CREASE", Object.freeze({ region: 2, feature: "return-fold", sequence: 1 })),
        line(point(baseWidth + depth + returnBand, 0), point(baseWidth + depth + returnBand, height), "CREASE", Object.freeze({ region: 2, feature: "return-fold", sequence: 2 })),
      ]),
    });
  }

  function rectangleCreases(x, y, width, height, region) {
    const meta = Object.freeze({ region, feature: "panel-boundary" });
    return Object.freeze([
      line(point(x, y), point(x + width, y), "CREASE", meta),
      line(point(x + width, y), point(x + width, y + height), "CREASE", meta),
      line(point(x + width, y + height), point(x, y + height), "CREASE", meta),
      line(point(x, y + height), point(x, y), "CREASE", meta),
    ]);
  }

  function reverseFoldRelief(owner, anchor, sideSign, width, offset) {
    const meta = Object.freeze({ region: owner, feature: "reverse-fold-relief" });
    const radius = width / 2;
    const center = point(anchor.x + sideSign * (offset - radius), anchor.y - radius);
    const lower = point(center.x, anchor.y);
    const upper = point(center.x, anchor.y - width);
    const reliefArc = sideSign > 0
      ? arc(center, radius, -90, 90, "CUT", meta)
      : arc(center, radius, 90, 270, "CUT", meta);
    return Object.freeze({ owner, width, offset, radius, direction: "up", outerEnd: upper,
      endpoints: Object.freeze([lower, upper]), entities: Object.freeze([line(anchor, lower, "CUT", meta), reliefArc]) });
  }

  function semicircularFoldTransition(owner, anchor, inwardSign, diameter) {
    const radius = diameter / 2;
    const center = point(anchor.x, anchor.y - radius);
    const lower = point(center.x, anchor.y);
    const upper = point(center.x, anchor.y - diameter);
    const meta = Object.freeze({ region: owner, feature: "semicircular-fold-transition" });
    const reliefArc = inwardSign > 0
      ? arc(center, radius, -90, 90, "CUT", meta)
      : arc(center, radius, 90, 270, "CUT", meta);
    return Object.freeze({
      owner, width: diameter, direction: "up", slantStart: upper,
      endpoints: Object.freeze([lower, upper]), usesStandardFoldRelief: false,
      entities: Object.freeze([reliefArc]),
    });
  }

  function buildRegion3(values) {
    const width = values.region3Width, x = values.regionInsets[3], height = values.innerHeight;
    const top = -height, bottom = 0;
    const depth = values.region3WingLength;
    const meta = Object.freeze({ region: 3, feature: "front-wall-side" });
    const leftRelief = reverseFoldRelief(3, point(x, bottom), 1, values.cornerOpening, values.cornerLocalOffset);
    const left = [
      line(point(x - depth, top), point(x, top), "CUT", meta),
      line(point(x - depth, top), point(x - depth, bottom - values.cornerOpening), "CUT", meta),
      line(point(x - depth, bottom - values.cornerOpening), leftRelief.outerEnd, "CUT", Object.freeze({ region: 3, feature: "relieved-edge" })),
    ];
    const right = left.map(entity => mirrorX(entity, values.mainCheckLength / 2));
    const reliefCuts = Object.freeze([
      leftRelief,
      reverseFoldRelief(3, point(x + width, bottom), -1, values.cornerOpening, values.cornerLocalOffset),
    ]);
    return Object.freeze({
      id: 3, x, size: Object.freeze([width, height]), wingLength: depth, foldDirection: "reverse",
      reliefCuts, cut: Object.freeze([...left, ...right, ...reliefCuts.flatMap(item => item.entities)]),
      crease: rectangleCreases(x, top, width, height, 3),
    });
  }

  function buildRegion3Pair(values) {
    const top = buildRegion3(values);
    const axisY = values.innerWidth / 2;
    const bottomOuterY = values.innerWidth + values.innerHeight;
    const mirroredCut = top.cut.map(entity => mirrorY(entity, axisY));
    const mirroredCrease = top.crease.map(entity => mirrorY(entity, axisY));
    const bottomOuterCut = line(
      point(top.x, bottomOuterY),
      point(top.x + top.size[0], bottomOuterY),
      "CUT",
      Object.freeze({ region: 3, feature: "bottom-outer-boundary" }),
    );
    const bottomCrease = mirroredCrease.filter(entity => !(
      entity.type === "line"
      && Math.abs(entity.p1.y - bottomOuterY) < EPS
      && Math.abs(entity.p2.y - bottomOuterY) < EPS
    ));
    const bottom = Object.freeze({
      id: 3,
      placement: "bottom",
      x: top.x,
      size: top.size,
      foldDirection: top.foldDirection,
      reliefCuts: Object.freeze([]),
      cut: Object.freeze([...mirroredCut, bottomOuterCut]),
      crease: Object.freeze(bottomCrease),
    });
    return Object.freeze({ top, bottom, cut: Object.freeze([...top.cut, ...bottom.cut]), crease: Object.freeze([...top.crease, ...bottom.crease]) });
  }

  function buildRegion4(values) {
    const width = values.region4Width, x = values.regionInsets[4], height = values.lidZoneHeight;
    const bottom = -values.innerHeight, top = bottom - height;
    const projection = values.region4WingProjection;
    const retainedStraight = height / 3;
    let preferredRadius = Math.min(projection / 2, retainedStraight * 0.9);
    let lowRise = 0, highRise = retainedStraight;
    for (let step = 0; step < 48; step += 1) {
      const candidateRise = (lowRise + highRise) / 2;
      const candidateAngle = Math.atan2(projection, Math.max(candidateRise, EPS));
      const usedHeight = candidateRise + preferredRadius * Math.tan(candidateAngle / 2);
      if (usedHeight > retainedStraight) highRise = candidateRise;
      else lowRise = candidateRise;
    }
    let rise = (lowRise + highRise) / 2;
    let entryAngle = degrees(Math.atan2(projection, rise));
    if (entryAngle > 80) {
      entryAngle = 80;
      rise = projection / Math.tan(entryAngle * Math.PI / 180);
      const radiusForRetainedStraight = (retainedStraight - rise) / Math.tan(entryAngle * Math.PI / 360);
      preferredRadius = Math.max(EPS, Math.min(projection / 2, radiusForRetainedStraight));
    }
    const topAnchor = point(x, top), bottomAnchor = point(x, bottom);
    const outerTop = point(x - projection, top + rise), outerBottom = point(x - projection, bottom - rise);
    const meta = Object.freeze({ region: 4, feature: "curved-wing" });
    const topSlant = line(topAnchor, outerTop, "CUT", meta);
    const outside = line(outerTop, outerBottom, "CUT", meta);
    const leftRelief = semicircularFoldTransition(4, bottomAnchor, 1, values.region4BottomSemicircleDiameter);
    const bottomSlant = line(outerBottom, leftRelief.slantStart, "CUT", meta);
    const topAnalysis = analyzeFillet(topSlant, outside, preferredRadius);
    const bottomAnalysis = analyzeFillet(outside, bottomSlant, preferredRadius);
    const sharedAnalysis = analyzeSharedSegmentFillets(
      length(sub(outside.p2, outside.p1)),
      topAnalysis.tangentDistance,
      bottomAnalysis.tangentDistance,
      0,
    );
    const sharedMaximumRadius = Number.isFinite(preferredRadius) && preferredRadius > 0 && Number.isFinite(sharedAnalysis.usedLength) && sharedAnalysis.usedLength > 0
      ? sharedAnalysis.segmentLength * preferredRadius / sharedAnalysis.usedLength
      : 0;
    const theoreticalMaximumRadius = Math.min(
      topAnalysis.theoreticalMaximumRadius ?? 0,
      bottomAnalysis.theoreticalMaximumRadius ?? 0,
      sharedMaximumRadius,
    );
    const safeMaximumRadius = Math.min(
      topAnalysis.safeMaximumRadius ?? 0,
      bottomAnalysis.safeMaximumRadius ?? 0,
      sharedMaximumRadius * 0.9,
    );
    const invalid = topAnalysis.status === "invalid" || bottomAnalysis.status === "invalid" || sharedAnalysis.status === "invalid";
    const warning = !invalid && (
      topAnalysis.status === "warning" || bottomAnalysis.status === "warning" || preferredRadius > safeMaximumRadius + EPS
    );
    const status = invalid ? "invalid" : (warning ? "warning" : "valid");
    const warnings = [];
    const errors = [];
    if (status === "warning") {
      for (const reason of topAnalysis.reasons) warnings.push(`4號上圓角：${reason}`);
      for (const reason of bottomAnalysis.reasons) warnings.push(`4號下圓角：${reason}`);
      if (!warnings.length) warnings.push("4號共享外側直線接近圓角上限");
    }
    if (status === "invalid") {
      if (topAnalysis.status === "invalid") for (const reason of topAnalysis.reasons) errors.push(`4號上圓角：${reason}`);
      if (bottomAnalysis.status === "invalid") for (const reason of bottomAnalysis.reasons) errors.push(`4號下圓角：${reason}`);
      if (sharedAnalysis.status === "invalid") for (const reason of sharedAnalysis.reasons) errors.push(`4號共享外側直線：${reason}`);
    }
    const filletValidation = Object.freeze({
      status,
      preferredRadius,
      theoreticalMaximumRadius,
      safeMaximumRadius,
      suggestedRadius: Math.max(0, Math.floor(Math.min(preferredRadius, safeMaximumRadius) + EPS)),
      remainingOutsideStraight: sharedAnalysis.remainingLength,
      warnings: Object.freeze(warnings),
      errors: Object.freeze(errors),
      top: topAnalysis,
      bottom: bottomAnalysis,
      shared: sharedAnalysis,
    });
    let leftCut;
    if (status === "invalid") {
      leftCut = Object.freeze([topSlant, outside, bottomSlant]);
    } else {
      const topRound = filletFinite(topSlant, outside, preferredRadius);
      const bottomRound = filletFinite(outside, bottomSlant, preferredRadius);
      leftCut = Object.freeze([
        topRound.trimmedA,
        topRound.arc,
        line(topRound.tangentB, bottomRound.tangentA, "CUT", meta),
        bottomRound.arc,
        bottomRound.trimmedB,
      ]);
    }
    const rightCut = Object.freeze(leftCut.map(entity => mirrorX(entity, values.mainCheckLength / 2)));
    const reliefCuts = Object.freeze([
      leftRelief,
      semicircularFoldTransition(4, point(x + width, bottom), -1, values.region4BottomSemicircleDiameter),
    ]);
    return Object.freeze({
      id: 4, x, size: Object.freeze([width, height]), wingProjection: projection,
      entryAngle, radius: preferredRadius, retainedStraight,
      filletValidation,
      left: Object.freeze({ cut: leftCut }), right: Object.freeze({ cut: rightCut }),
      reliefCuts,
      cut: Object.freeze([...leftCut, ...rightCut, ...reliefCuts.flatMap(item => item.entities)]),
      crease: rectangleCreases(x, top, width, height, 4),
    });
  }

  function buildRegion5(values) {
    const width = values.region5Width, x = values.regionInsets[5], height = values.innerHeight;
    const bottom = -values.innerHeight - values.lidZoneHeight, top = bottom - height;
    const extent = values.region5EngagementHeight;
    const meta = Object.freeze({ region: 5, feature: "closure-ear", provisional: true });
    const topY = top + values.region5TopRetreat;
    const outerX = x - extent;
    const focus = point(values.regionInsets[4], bottom);
    const earEnd = point(focus.x - values.region5SlantOutward, bottom - values.region5SlantUpward);
    const lowerCorner = point(outerX, earEnd.y);
    const largeCorner = point(outerX, topY);
    const topStraight = line(point(x, topY), largeCorner, "CUT", meta);
    const outsideStraight = line(largeCorner, lowerCorner, "CUT", meta);
    const lowerSlant = line(lowerCorner, earEnd, "CUT", Object.freeze({ region: 5, feature: "airplane-ear-baseline" }));
    const largeAnalysis = analyzeFillet(topStraight, outsideStraight, values.region5LargeRadius);
    const smallAnalysis = analyzeFillet(outsideStraight, lowerSlant, values.region5SmallRadius);
    const outsideSegmentLength = Math.max(0, length(sub(outsideStraight.p2, outsideStraight.p1)) - values.region5SlantUpward * 2);
    const sharedUsed = Number.isFinite(largeAnalysis.tangentDistance) && Number.isFinite(smallAnalysis.tangentDistance)
      ? largeAnalysis.tangentDistance + smallAnalysis.tangentDistance
      : null;
    const sharedTheoreticalLimit = outsideSegmentLength;
    const sharedSafeLimit = outsideSegmentLength * 0.9;
    const sharedReasons = [];
    if (!Number.isFinite(sharedUsed)) sharedReasons.push("共享外側直線的切點距離必須是有限數值");
    if (Number.isFinite(sharedUsed) && sharedUsed > sharedTheoreticalLimit + EPS) sharedReasons.push("兩個圓角之間的剩餘直線不足");
    const sharedStatus = sharedReasons.length ? "invalid" : (sharedUsed > sharedSafeLimit + EPS ? "warning" : "valid");
    const sharedAnalysis = Object.freeze({
      status: sharedStatus,
      segmentLength: outsideSegmentLength,
      usedLength: sharedUsed,
      theoreticalLimit: sharedTheoreticalLimit,
      safeLimit: sharedSafeLimit,
      remainingLength: Number.isFinite(sharedUsed) ? outsideSegmentLength - sharedUsed : null,
      reasons: Object.freeze(sharedReasons),
    });
    const invalid = largeAnalysis.status === "invalid" || smallAnalysis.status === "invalid" || sharedAnalysis.status === "invalid";
    const warning = !invalid && (largeAnalysis.status === "warning" || smallAnalysis.status === "warning" || sharedAnalysis.status === "warning");
    const status = invalid ? "invalid" : (warning ? "warning" : "valid");
    let suggestedLarge = largeAnalysis.suggestedRadius;
    let suggestedSmall = smallAnalysis.suggestedRadius;
    if (largeAnalysis.status !== "invalid" && smallAnalysis.status !== "invalid" && (sharedAnalysis.status === "warning" || sharedAnalysis.status === "invalid") && Number.isFinite(sharedAnalysis.usedLength) && sharedAnalysis.usedLength > 0) {
      const sharedScale = Math.max(0, sharedSafeLimit / sharedAnalysis.usedLength);
      suggestedLarge = Math.floor(Math.min(suggestedLarge, values.region5LargeRadius * sharedScale) + EPS);
      suggestedSmall = Math.floor(Math.min(suggestedSmall, values.region5SmallRadius * sharedScale) + EPS);
    }
    const warnings = [];
    const errors = [];
    if (largeAnalysis.status === "warning") for (const reason of largeAnalysis.reasons) warnings.push(`5號大圓角：${reason}`);
    if (smallAnalysis.status === "warning") for (const reason of smallAnalysis.reasons) warnings.push(`5號小圓角：${reason}`);
    if (status === "warning" && sharedAnalysis.status === "warning") warnings.push("5號共享外側直線接近安全上限");
    if (largeAnalysis.status === "invalid") for (const reason of largeAnalysis.reasons) errors.push(`5號大圓角：${reason}`);
    if (smallAnalysis.status === "invalid") for (const reason of smallAnalysis.reasons) errors.push(`5號小圓角：${reason}`);
    if (sharedAnalysis.status === "invalid") for (const reason of sharedAnalysis.reasons) errors.push(`5號共享外側直線：${reason}`);
    const filletValidation = Object.freeze({
      status,
      preferredRadius: Object.freeze({ large: values.region5LargeRadius, small: values.region5SmallRadius }),
      suggestedRadius: Object.freeze({ large: suggestedLarge, small: suggestedSmall }),
      large: largeAnalysis,
      small: smallAnalysis,
      warnings: Object.freeze(warnings),
      errors: Object.freeze(errors),
    });
    const focusConnector = line(earEnd, focus, "CUT", Object.freeze({ region: 5, feature: "focus-connector" }));
    let leftCut;
    if (status === "invalid") {
      leftCut = Object.freeze([topStraight, outsideStraight, lowerSlant, focusConnector]);
    } else {
      const largeRound = filletFinite(topStraight, outsideStraight, values.region5LargeRadius);
      const smallRound = filletFinite(outsideStraight, lowerSlant, values.region5SmallRadius);
      leftCut = Object.freeze([
        largeRound.trimmedA,
        largeRound.arc,
        line(largeRound.tangentB, smallRound.tangentA, "CUT", meta),
        smallRound.arc,
        smallRound.trimmedB,
        focusConnector,
      ]);
    }
    const rightCut = Object.freeze(leftCut.map(entity => mirrorX(entity, values.mainCheckLength / 2)));
    const reliefCuts = Object.freeze([]);
    return Object.freeze({
      id: 5, x, size: Object.freeze([width, height]), foldDirection: "reverse",
      topRetreat: values.region5TopRetreat, engagementHeight: extent,
      smallRadius: values.region5SmallRadius, largeRadius: values.region5LargeRadius,
      localStraight: values.region5LocalStraight,
      filletValidation,
      constructionTranslation: Object.freeze([values.region5SlantOutward, values.region5SlantUpward]),
      slotCorrespondence: Object.freeze({ owner: 1, focusOwner: 4, constructionTranslation: Object.freeze([values.region5SlantOutward, values.region5SlantUpward]), earEnd, focus }),
      reliefCuts,
      left: Object.freeze({ cut: leftCut }), right: Object.freeze({ cut: rightCut }),
      cut: Object.freeze([...leftCut, ...rightCut, line(point(x, top), point(x + width, top), "CUT", meta), ...reliefCuts.flatMap(item => item.entities)]),
      crease: rectangleCreases(x, top, width, height, 5),
      provisional: true,
    });
  }

  function buildRegion6(values, rowBounds, gap = 20) {
    if (!values.hasVerticalUTypePartition) return null;
    const width = values.partitionFlatWidth;
    const height = values.partitionSecondAxis;
    const x = (values.mainCheckLength - width) / 2;
    const y = rowBounds ? rowBounds.maxY + gap : values.innerWidth + values.innerHeight + 30;
    const meta = Object.freeze({ region: 6, feature: "partition" });
    const cut = Object.freeze([
      line(point(x, y), point(x + width, y), "CUT", meta),
      line(point(x + width, y), point(x + width, y + height), "CUT", meta),
      line(point(x + width, y + height), point(x, y + height), "CUT", meta),
      line(point(x, y + height), point(x, y), "CUT", meta),
    ]);
    const firstFoldX = x + values.partitionSide;
    const secondFoldX = firstFoldX + values.partitionBase;
    const crease = Object.freeze([
      line(point(firstFoldX, y), point(firstFoldX, y + height), "CREASE", meta),
      line(point(secondFoldX, y), point(secondFoldX, y + height), "CREASE", meta),
    ]);
    return Object.freeze({
      id: 6, x, y, size: Object.freeze([width, height]),
      panels: values.partitionPanels, cut, crease,
    });
  }

  function buildRegion7(values, pzBounds, gap = 20, rowBounds = pzBounds) {
    if (!values.hasHorizontalBoardPartition) return null;
    const [width, height] = values.region7Size;
    const x = (pzBounds.minX + pzBounds.maxX - width) / 2;
    const y = rowBounds.maxY + gap;
    const meta = Object.freeze({ region: 7, feature: "board-partition" });
    const cut = Object.freeze([
      line(point(x, y), point(x + width, y), "CUT", meta),
      line(point(x + width, y), point(x + width, y + height), "CUT", meta),
      line(point(x + width, y + height), point(x, y + height), "CUT", meta),
      line(point(x, y + height), point(x, y), "CUT", meta),
    ]);
    return Object.freeze({
      id: 7, x, y, size: Object.freeze([width, height]), cut, crease: Object.freeze([]),
    });
  }

  function buildCompleteDrawing(values) {
    const region1 = buildRegion1(values);
    const region2 = buildRegion2(values);
    const region3Pair = buildRegion3Pair(values);
    const region4 = buildRegion4(values);
    const region5 = buildRegion5(values);
    const pzRegions = Object.freeze([region1, region2, region3Pair.top, region3Pair.bottom, region4, region5]);
    const pzCut = Object.freeze(pzRegions.flatMap(region => region.cut));
    const pzCrease = Object.freeze(pzRegions.flatMap(region => region.crease));
    const pzBounds = bounds([...pzCut, ...pzCrease]);
    const region6 = buildRegion6(values, pzBounds);
    const region6Bounds = region6 ? bounds([...region6.cut, ...region6.crease]) : pzBounds;
    const region7 = buildRegion7(values, pzBounds, 20, region6Bounds);
    const regions = Object.freeze([...pzRegions, ...[region6, region7].filter(Boolean)]);
    const interfaceCutConnectors = buildThirdPassCutReplacements(values);
    const rawCut = [...regions.flatMap(region => region.cut), ...interfaceCutConnectors];
    const rawCrease = applyThirdPassCreaseOwnership(regions.flatMap(region => region.crease), values);
    const topology = thirdPassCleanup(rawCut, rawCrease);
    const cut = topology.cut;
    const crease = topology.crease;
    const drawingBounds = region6 || region7 ? bounds([...cut, ...crease]) : pzBounds;
    const geometryWarnings = Object.freeze([...region4.filletValidation.warnings, ...region5.filletValidation.warnings]);
    const geometryErrors = Object.freeze([...region4.filletValidation.errors, ...region5.filletValidation.errors]);
    const geometryStatus = geometryErrors.length ? "invalid" : (geometryWarnings.length ? "warning" : "valid");
    return Object.freeze({
      regions, pzBounds, region6, region7, cut, crease, bounds: drawingBounds, topology, interfaceCutConnectors,
      geometryStatus,
      geometryWarnings,
      geometryErrors,
      canExport: geometryStatus !== "invalid",
    });
  }

  return Object.freeze({
    point, line, arc, intersection, fillet, analyzeFillet, filletFinite, analyzeSharedSegmentFillets,
    mirrorX, mirrorY, bounds, distancePointToLine, thirdPassCleanup, buildThirdPassCutReplacements, applyThirdPassCreaseOwnership,
    roundedVerticalSlot, buildRegion1, buildRegion2, buildRegion3, buildRegion3Pair, buildRegion4, buildRegion5, buildRegion6, buildRegion7, buildCompleteDrawing,
  });
});
