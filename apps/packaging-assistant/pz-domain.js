(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PzDomain = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VALUE_KIND = Object.freeze({
    INPUT: "人工輸入",
    STRUCTURAL: "結構公式",
    FIXED: "固定工程值",
    CALIBRATED: "打樣校準值",
    HEURISTIC: "工程建議值",
    DRAWING_CHOICE: "可調繪圖參數",
  });

  function cd9030Preset() {
    return {
      productLength: 159,
      productWidth: 45,
      productHeight: 165,
      horizontalAccessoryEnabled: true,
      horizontalAccessoryIncrement: 30,
      horizontalAccessoryTolerance: 1,
      horizontalLinerEnabled: false,
      verticalAccessoryEnabled: true,
      verticalAccessoryIncrement: 36,
      verticalAccessoryTolerance: 1,
      verticalLinerEnabled: true,
      boardThickness: 2,
      returnSetback: 5,
      cornerTolerance: 1,
      curvedWingRadius: 40,
      region5SmallRadius: 10,
      region5LocalStraight: 6,
      region5TopRetreat: 4,
    };
  }

  function positive(name, value) {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`${name}必須大於 0`);
  }

  function nonNegative(name, value) {
    if (!Number.isFinite(value) || value < 0) throw new Error(`${name}不可小於 0`);
  }

  function evidence(value, expression, kind, note, substitution) {
    const item = { expression, substitution: substitution || String(value), value };
    Object.defineProperties(item, {
      formula: { value: expression, enumerable: false },
      kind: { value: kind, enumerable: false },
      note: { value: note, enumerable: false },
    });
    return Object.freeze(item);
  }

  function calculatePz(input) {
    const i = Object.assign(cd9030Preset(), input || {});
    positive("產品擺放後 W", i.productLength);
    positive("產品擺放後 H", i.productWidth);
    positive("產品擺放後 L", i.productHeight);
    const horizontalAccessoryEnabled = i.horizontalAccessoryEnabled !== false;
    const verticalAccessoryEnabled = i.verticalAccessoryEnabled !== false;
    const horizontalLinerEnabled = horizontalAccessoryEnabled && i.horizontalLinerEnabled === true;
    const verticalLinerEnabled = verticalAccessoryEnabled && i.verticalLinerEnabled === true;
    const horizontalAccessoryIncrement = horizontalAccessoryEnabled ? i.horizontalAccessoryIncrement : 0;
    const verticalAccessoryIncrement = verticalAccessoryEnabled ? i.verticalAccessoryIncrement : 0;
    const horizontalAccessoryTolerance = horizontalAccessoryEnabled ? i.horizontalAccessoryTolerance : 0;
    const verticalAccessoryTolerance = verticalAccessoryEnabled ? i.verticalAccessoryTolerance : 0;
    nonNegative("水平配件增值", horizontalAccessoryIncrement);
    nonNegative("垂直配件增值", verticalAccessoryIncrement);
    nonNegative("水平配件公差", horizontalAccessoryTolerance);
    nonNegative("垂直配件公差", verticalAccessoryTolerance);
    positive("紙板厚度", i.boardThickness);
    if (!Number.isFinite(i.returnSetback) || i.returnSetback < 5) throw new Error("區域2回折結構距離不可小於 5 mm");
    positive("4號大圓角", i.curvedWingRadius);
    positive("5號小圓角", i.region5SmallRadius);
    positive("5號局部直線", i.region5LocalStraight);

    const t = i.boardThickness;
    const region4WidthIncrement = t / 2;
    const innerLength = i.productHeight;
    const horizontalProductLength = i.productLength;
    const stackedProductWidth = i.productWidth;
    const hasVerticalUTypePartition = verticalLinerEnabled;
    const hasHorizontalBoardPartition = horizontalLinerEnabled;
    const accessoryLayout = horizontalAccessoryEnabled
      ? (verticalAccessoryEnabled ? "mixed" : "horizontal")
      : (verticalAccessoryEnabled ? "vertical" : "none");
    i.horizontalAccessoryEnabled = horizontalAccessoryEnabled;
    i.verticalAccessoryEnabled = verticalAccessoryEnabled;
    i.horizontalLinerEnabled = horizontalLinerEnabled;
    i.verticalLinerEnabled = verticalLinerEnabled;
    i.horizontalAccessoryIncrement = horizontalAccessoryIncrement;
    i.verticalAccessoryIncrement = verticalAccessoryIncrement;
    i.horizontalAccessoryTolerance = horizontalAccessoryTolerance;
    i.verticalAccessoryTolerance = verticalAccessoryTolerance;
    i.accessoryLayout = accessoryLayout;
    const horizontalBoardOccupancy = hasHorizontalBoardPartition ? t : 0;
    const verticalLinerOccupancy = hasVerticalUTypePartition ? t : 0;
    const innerWidth = horizontalProductLength + horizontalAccessoryIncrement + horizontalAccessoryTolerance + horizontalBoardOccupancy;
    const capsuleWidth = i.returnSetback + t / 2;
    const reliefHoleWidth = capsuleWidth;
    const compressedReturnWalls = (t / 2) * 2;
    const reliefInnerSpace = reliefHoleWidth - compressedReturnWalls;
    const totalElasticClearance = t;
    const elasticClearancePerSide = t / 2;
    const region1Width = i.productHeight + t;
    const mainCheckLength = region1Width + 2 * capsuleWidth;
    const adapterInnerHeight = verticalAccessoryIncrement;
    const innerLinerThickness = verticalLinerOccupancy;
    const concaveFoldCorrection = verticalAccessoryTolerance;
    const partitionOuterHeight = adapterInnerHeight + innerLinerThickness + concaveFoldCorrection;
    const lowerSpaceHeight = innerLinerThickness + adapterInnerHeight + concaveFoldCorrection;
    const innerHeight = stackedProductWidth + adapterInnerHeight + verticalLinerOccupancy + verticalAccessoryTolerance;
    const outerLength = innerLength + 2 * reliefHoleWidth + 2 * t;
    const outerWidth = innerWidth + t;
    const outerHeight = innerHeight + t;
    const cornerOpening = (t / 2) * 2 + i.cornerTolerance;
    const foldStructureRadius = cornerOpening / 2;
    const lidZoneHeight = innerWidth + (t / 2) * 2 + region4WidthIncrement;
    const slotWidth = capsuleWidth;
    const slotLength = Math.floor(innerWidth * 89 / 190 + 0.5);
    const slotCenterMargin = (innerWidth - slotLength) / 2;
    const region1Inset = capsuleWidth;
    const region3Inset = slotWidth / 2 + 0.5;
    const region3Width = mainCheckLength - 2 * region3Inset;
    const region3WingLength = innerWidth / 2 - t;
    const region4Width = i.productHeight;
    const region4Inset = (mainCheckLength - region4Width) / 2;
    const region5Inset = slotWidth / 2;
    const region5Width = mainCheckLength - 2 * region5Inset;
    const region4BottomSemicircleDiameter = cornerOpening;
    const region2PanelDepth = innerHeight;
    const region2ReturnBand = i.returnSetback;
    const region2EntryAngle = 75;
    const region2EntryRise = region2ReturnBand * Math.tan((90 - region2EntryAngle) * Math.PI / 180);
    const region2OuterWingDepth = innerHeight;
    const region2ExtensionDepth = region2ReturnBand + region2OuterWingDepth;
    const region2LatchDepth = t;
    const region2LatchLength = slotLength - slotWidth;
    const region2LatchMargin = (innerWidth - region2LatchLength) / 2;
    const diecutNominalWidth = mainCheckLength + 2 * (region2PanelDepth + region2ExtensionDepth);
    const diecutFlatWidth = diecutNominalWidth + 2 * region2LatchDepth;
    const region4WingProjection = innerHeight - t;
    const region5EngagementHeight = Math.floor(innerHeight * 2 / 3);
    const region5LargeRadius = region5EngagementHeight - i.region5LocalStraight;
    const region5SlantOutward = slotWidth - t;
    const region5SlantUpward = t / 2;
    const partitionSide = verticalAccessoryIncrement + verticalAccessoryTolerance + t / 2;
    const partitionBase = i.productHeight - (t / 2) * 2;
    const partitionFormedSpan = partitionBase + (t / 2) * 2;
    const partitionFlatWidth = partitionSide * 2 + partitionBase;
    const partitionSecondAxis = horizontalProductLength;
    const region2SingleSideDepth = region2PanelDepth + region2ExtensionDepth + region2LatchDepth;

    const values = Object.freeze({
      accessoryLayout,
      horizontalAccessoryEnabled,
      verticalAccessoryEnabled,
      horizontalLinerEnabled,
      verticalLinerEnabled,
      hasVerticalUTypePartition,
      hasHorizontalBoardPartition,
      horizontalBoardOccupancy,
      verticalLinerOccupancy,
      horizontalAccessoryIncrement,
      verticalAccessoryIncrement,
      horizontalAccessoryTolerance,
      verticalAccessoryTolerance,
      region7Size: Object.freeze([horizontalProductLength, stackedProductWidth + verticalAccessoryIncrement]),
      innerLength,
      innerWidth,
      innerHeight,
      lowerSpaceHeight,
      innerLinerThickness,
      concaveFoldCorrection,
      outerLength,
      outerWidth,
      outerHeight,
      mainCheckLength,
      region1Width,
      region3Width,
      region3WingLength,
      region4Width,
      region5Width,
      region4BottomSemicircleDiameter,
      region4WidthIncrement,
      regionInsets: Object.freeze({ 1: region1Inset, 3: region3Inset, 4: region4Inset, 5: region5Inset }),
      region2PanelDepth,
      region2ExtensionDepth,
      region2ReturnBand,
      region2EntryAngle,
      region2EntryRise,
      region2OuterWingDepth,
      region2LatchDepth,
      region2LatchLength,
      region2LatchMargin,
      diecutFlatWidth,
      diecutNominalWidth,
      capsuleWidth,
      reliefHoleWidth,
      compressedReturnWalls,
      reliefInnerSpace,
      elasticClearancePerSide,
      cornerOpening,
      foldStructureRadius,
      cornerLocalOffset: region3Inset,
      adapterInnerHeight,
      partitionOuterHeight,
      lidZoneHeight,
      slotWidth,
      slotLength,
      slotCenterMargin,
      slotHorizontalInset: slotWidth / 2,
      slotEndRadius: slotWidth / 2,
      region4WingProjection,
      curvedWingRadius: i.curvedWingRadius,
      region5TopRetreat: i.region5TopRetreat,
      region5SmallRadius: i.region5SmallRadius,
      region5LocalStraight: i.region5LocalStraight,
      region5EngagementHeight,
      region5LargeRadius,
      region5SlantOutward,
      region5SlantUpward,
      partitionPanels: Object.freeze([partitionSide, partitionBase, partitionSide]),
      partitionSide,
      partitionBase,
      partitionFlatWidth,
      partitionSecondAxis,
      partitionFlat: Object.freeze([partitionFlatWidth, partitionSecondAxis]),
      partitionFormedSpan,
      region2SingleSideDepth,
    });

    const evidenceMap = Object.freeze({
      innerLength: evidence(innerLength, "產品擺放後L", VALUE_KIND.STRUCTURAL, "左右GAP已包含在Region 1／2結構增值，不可在PZ內L重複增加", `${i.productHeight}`),
      innerWidth: evidence(innerWidth, "產品擺放後W + 水平物件深度 + 水平公差 + Board內襯占用", VALUE_KIND.STRUCTURAL, "未啟用水平配件時後三項皆為0；有內襯才加入1t。本案159+30+1+0=190", `${horizontalProductLength} + ${horizontalAccessoryIncrement} + ${horizontalAccessoryTolerance} + ${horizontalBoardOccupancy}`),
      innerHeight: evidence(innerHeight, "產品擺放後H + 垂直物件高度 + 垂直公差 + U型內襯占用", VALUE_KIND.STRUCTURAL, "未啟用垂直配件時後三項皆為0；有內襯才加入1t。本案45+36+1+2=84", `${stackedProductWidth} + ${verticalAccessoryIncrement} + ${verticalAccessoryTolerance} + ${verticalLinerOccupancy}`),
      region1Size: evidence([region1Width, innerWidth], "L向：(產品擺放後L + t)；W向：PZ內W", VALUE_KIND.STRUCTURAL, "t等於左右各補半個紙厚；CD9030為167×190，供Region 4飛機耳緊配插入", `(${i.productHeight} + ${t}) × ${innerWidth}`),
      region2Size: evidence([region2SingleSideDepth, innerWidth], "單側結構深度：(PZ內H + 回折5 + 後段PZ內H + 卡榫2)；W向：PZ內W", VALUE_KIND.STRUCTURAL, "左右鏡射；卡榫長度另由Region 1鎖槽兩圓心距決定", `(${region2PanelDepth} + ${region2ReturnBand} + ${region2OuterWingDepth} + ${region2LatchDepth}) × ${innerWidth}`),
      region3Size: evidence([region3Width, innerHeight], "L向：總基準跨度 - 膠囊孔寬C - 固定1 mm；H向：PZ內H", VALUE_KIND.STRUCTURAL, "每側內縮C/2+0.5；CD9030為179-6-1=172", `${region3Width} × ${innerHeight}`),
      mainCheckLength: evidence(mainCheckLength, "Region 1 L向 + 左右膠囊孔寬C×2", VALUE_KIND.STRUCTURAL, "C=回折結構距離+0.5t；CD9030為167+6×2=179。179是總基準，不是Region 1寬度", `${region1Width} + 2×${capsuleWidth}`),
      region23Height: evidence(innerHeight, "2號、3號區域高度 = PZ內高", VALUE_KIND.STRUCTURAL, "兩區皆沿PZ內高建立，本案84", `${innerHeight}`),
      slotWidth: evidence(slotWidth, "區域2回折結構距離 + 0.5t×2 - 0.5t", VALUE_KIND.STRUCTURAL, "化簡為回折距離+0.5t；E楞為6、F楞為5.5，不再使用3t", `${i.returnSetback} + ${t / 2}`),
      slotLength: evidence(slotLength, "四捨五入(內寬 × 89/190)", VALUE_KIND.HEURISTIC, "置中"),
      slotHorizontalInset: evidence(slotWidth / 2, "槽寬/2", VALUE_KIND.STRUCTURAL, "槽外切線貼住1號摺線，槽體位於1號內"),
      region3Width: evidence(region3Width, "總基準跨度 - 2×(C/2 + 固定0.5 mm)", VALUE_KIND.STRUCTURAL, "兩側反折軸依膠囊半寬連動；本案179-2×3.5=172", `${mainCheckLength} - 2×(${slotWidth / 2}+0.5)`),
      region3WingLength: evidence(region3WingLength, "PZ內寬/2 - 紙板厚度t", VALUE_KIND.STRUCTURAL, "本案190/2-2=93"),
      region4Size: evidence([region4Width, lidZoneHeight], "L向：產品擺放後L；W向：(PZ內W + 1t + 區域4寬度增值0.5t)", VALUE_KIND.STRUCTURAL, "CD9030為165×193；Region 4飛機耳插入Region 1左右半紙厚緊配空間", `${i.productHeight} × (${innerWidth} + ${t} + ${region4WidthIncrement})`),
      region5Size: evidence([region5Width, innerHeight], "L向：(總基準跨度 - 膠囊孔寬C)；H向：PZ內H", VALUE_KIND.STRUCTURAL, "每側內縮C/2；因此Region 5固定比Region 3寬1 mm，形成偏緊手感", `(${mainCheckLength} - ${slotWidth}) × ${innerHeight}`),
      region4BottomSemicircleDiameter: evidence(region4BottomSemicircleDiameter, "t + 角部公差1", VALUE_KIND.STRUCTURAL, "本案直徑3 mm；上下端點位於4號底部垂直線"),
      region2ExtensionDepth: evidence(region2ExtensionDepth, "回凹帶5 + PZ內高84", VALUE_KIND.STRUCTURAL, "後段長方形與第一段同為84；含雙摺帶後為89"),
      region2ReturnBand: evidence(region2ReturnBand, "區域2回折結構距離", VALUE_KIND.FIXED, "最低5 mm；E楞／F楞建議5 mm，不可與6 mm結構孔混用"),
      region2EntryRise: evidence(region2EntryRise, "回凹帶5 × tan(90°-導入角75°)", VALUE_KIND.STRUCTURAL, "上下端斜角的垂直落差，本案約1.34 mm"),
      region2LatchDepth: evidence(region2LatchDepth, "1×紙板厚度t", VALUE_KIND.STRUCTURAL, "本案向外凸出2 mm"),
      region2LatchLength: evidence(region2LatchLength, "1號鎖槽兩端圓心距 = 槽總長 - 槽寬", VALUE_KIND.STRUCTURAL, "本案89-6=83 mm，沿190方向置中"),
      region5EngagementHeight: evidence(region5EngagementHeight, "捨去(內高 × 2/3)", VALUE_KIND.HEURISTIC, "過長難蓋、過短易爆開"),
      region5LocalStraight: evidence(i.region5LocalStraight, "區域5上方飛機耳局部直線", VALUE_KIND.DRAWING_CHOICE, "只供外觀比例調整，相關R角由幾何自動成型"),
      curvedWingRadius: evidence(i.curvedWingRadius, "接近翼片高度一半", VALUE_KIND.DRAWING_CHOICE, "本案R40"),
      cornerLocalOffset: evidence(region3Inset, "膠囊半寬C/2 + 固定0.5 mm", VALUE_KIND.STRUCTURAL, "Region 3飛機耳反折軸偏移；本案3+0.5=3.5"),
      foldStructureRadius: evidence(foldStructureRadius, "折線結構直徑(t+1)/2", VALUE_KIND.STRUCTURAL, "本案所有3 mm折線結構統一R1.5；不含1號6 mm鎖槽"),
      partitionSide: evidence(partitionSide, "垂直物件高度 + 垂直公差 + t/2", VALUE_KIND.STRUCTURAL, "勾選U型內襯時建立；左右側翼各只折一次", `${verticalAccessoryIncrement} + ${verticalAccessoryTolerance} + ${t / 2}`),
      partitionBase: evidence(partitionBase, "產品高 - t/2 × 2", VALUE_KIND.STRUCTURAL, "水平方向折兩次", `${i.productHeight} - ${t / 2} × 2`),
      partitionFlat: evidence(values.partitionFlat, "展開段：(側翼 | 中央段 | 側翼)；W向：產品擺放後W", VALUE_KIND.STRUCTURAL, "Region 6左右側翼各折一次；CD9030為38 | 163 | 38，W向159，展開239×159", `(${partitionSide} | ${partitionBase} | ${partitionSide}) × ${horizontalProductLength}`),
      region7Size: evidence(values.region7Size, "W向：產品擺放後W；H向：(產品擺放後H + 垂直物件高度)", VALUE_KIND.STRUCTURAL, "Region 7水平Board內襯外框；只有勾選時顯示", `${horizontalProductLength} × (${stackedProductWidth} + ${verticalAccessoryIncrement})`),
    });

    const warnings = [];
    if (hasVerticalUTypePartition && verticalAccessoryIncrement === 0) warnings.push("垂直 U 型 Partition 已啟用，但垂直配件空間為 0");
    if (hasHorizontalBoardPartition && horizontalAccessoryIncrement === 0) warnings.push("水平 Board Partition 已啟用，但水平配件空間為 0");
    if (region5LargeRadius <= 0) warnings.push("5號局部直線過長，無法建立大圓角");

    return Object.freeze({ inputs: Object.freeze(i), values, evidence: evidenceMap, warnings: Object.freeze(warnings) });
  }

  return Object.freeze({ VALUE_KIND, cd9030Preset, calculatePz });
});
