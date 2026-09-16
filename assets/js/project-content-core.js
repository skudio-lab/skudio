(function attachProjectContent(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.ProjectContent = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createProjectContent() {
  const clone = (value) => JSON.parse(JSON.stringify(value || {}));

  function clampPercent(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.min(100, Math.max(0, number));
  }

  function swatchBackground(swatch = {}) {
    const start = swatch.start || "#d8d2c8";
    if (swatch.type !== "gradient") return start;
    const end = swatch.end || start;
    const angle = Number.isFinite(Number(swatch.angle)) ? Number(swatch.angle) : 90;
    return `linear-gradient(${angle}deg, ${start}, ${end})`;
  }

  function hexToRgb(value) {
    let hex = String(value || "#000000").replace("#", "");
    if (hex.length === 3) hex = hex.split("").map((character) => character + character).join("");
    const number = Number.parseInt(hex, 16);
    return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
  }

  function markerTextColor(swatch = {}) {
    const start = hexToRgb(swatch.start || "#d8d2c8");
    const end = swatch.type === "gradient" ? hexToRgb(swatch.end || swatch.start) : start;
    const brightness = ((start.r + end.r) / 2) * .299 + ((start.g + end.g) / 2) * .587 + ((start.b + end.b) / 2) * .114;
    return brightness < 145 ? "#ffffff" : "#111111";
  }

  function aspectRatioValue(ratio) {
    return ({ "1:1": "1 / 1", "4:3": "4 / 3", "3:2": "3 / 2", "16:9": "16 / 9", "4:5": "4 / 5", "3:4": "3 / 4", original: "auto" })[ratio] || "1 / 1";
  }

  function fallbackPosition(index) {
    const columns = [18, 36, 64, 82];
    const rows = [22, 48, 74];
    return { x: columns[index % columns.length], y: rows[Math.floor(index / columns.length) % rows.length] };
  }

  function pointToPercent(clientX, clientY, rect) {
    const x = rect.width ? ((clientX - rect.left) / rect.width) * 100 : 0;
    const y = rect.height ? ((clientY - rect.top) / rect.height) * 100 : 0;
    return { x: Math.round(clampPercent(x) * 100) / 100, y: Math.round(clampPercent(y) * 100) / 100 };
  }

  function normalizeProject(source) {
    const data = clone(source);
    data.overview = data.overview || {};
    data.brief = Array.isArray(data.brief) ? data.brief : [];
    data.gallery = (Array.isArray(data.gallery) ? data.gallery : []).map((item, index) => ({
      ...item,
      number: index + 1,
      title: item.title || "",
      description: item.description || "",
      alt: item.alt || "",
      ratio: ["1:1", "4:3", "3:2", "16:9", "4:5", "3:4", "original"].includes(item.ratio) ? item.ratio : "1:1",
      width: ["half", "full", "auto"].includes(item.width) ? item.width : "half",
      visible: item.visible !== false
    }));
    data.cmf = data.cmf || {};
    data.cmf.visible = data.cmf.visible !== false;
    data.cmf.explodedImage = data.cmf.explodedImage || { image: "", alt: "產品爆炸圖" };
    data.cmf.parts = (Array.isArray(data.cmf.parts) ? data.cmf.parts : []).map((item, index) => {
      const fallback = fallbackPosition(index);
      const position = item.position || fallback;
      return {
        ...item,
        number: index + 1,
        name: item.name || `Part ${String(index + 1).padStart(2, "0")}`,
        colorPlan: item.colorPlan || "",
        material: item.material || "",
        finish: typeof item.finish === "object" && item.finish !== null
          ? { main: item.finish.main || "", local: item.finish.local || "" }
          : { main: item.finish || "", local: "" },
        swatch: {
          type: item.swatch?.type === "gradient" ? "gradient" : "solid",
          start: item.swatch?.start || "#d8d2c8",
          end: item.swatch?.end || "#8c8780",
          angle: Number.isFinite(Number(item.swatch?.angle)) ? Number(item.swatch.angle) : 90
        },
        position: {
          x: clampPercent(position.x ?? fallback.x),
          y: clampPercent(position.y ?? fallback.y)
        },
        visible: item.visible !== false
      };
    });
    return data;
  }

  function serializeProject(source) {
    const data = normalizeProject(source);
    data.gallery.forEach((item) => delete item.number);
    data.cmf.parts.forEach((part) => delete part.number);
    return `${JSON.stringify(data, null, 2)}\n`;
  }

  return { clampPercent, swatchBackground, markerTextColor, aspectRatioValue, pointToPercent, normalizeProject, serializeProject };
});
