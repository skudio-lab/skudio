(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PzExport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const n = value => Number(value.toFixed(6));
  function endpoint(entity, angle) {
    const radians = angle * Math.PI / 180;
    return { x: entity.center.x + entity.radius * Math.cos(radians), y: entity.center.y + entity.radius * Math.sin(radians) };
  }
  function entitySvg(entity) {
    if (entity.type === "line") return `<line x1="${n(entity.p1.x)}" y1="${n(entity.p1.y)}" x2="${n(entity.p2.x)}" y2="${n(entity.p2.y)}"/>`;
    const start = endpoint(entity, entity.startAngle), end = endpoint(entity, entity.endAngle);
    const increasing = ((entity.endAngle - entity.startAngle) % 360 + 360) % 360;
    const sweep = increasing <= 180 ? 1 : 0;
    return `<path d="M ${n(start.x)} ${n(start.y)} A ${n(entity.radius)} ${n(entity.radius)} 0 0 ${sweep} ${n(end.x)} ${n(end.y)}"/>`;
  }
  function illustratorSvg(cut, crease, bounds, padding = 5) {
    const x = bounds.minX - padding, y = bounds.minY - padding;
    const width = bounds.width + padding * 2, height = bounds.height + padding * 2;
    return `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<svg xmlns="http://www.w3.org/2000/svg" width="${n(width)}mm" height="${n(height)}mm" viewBox="${n(x)} ${n(y)} ${n(width)} ${n(height)}">\n` +
      `  <g id="CUT" fill="none" stroke="#ff0000" stroke-width="0.2">${cut.map(entitySvg).join("")}</g>\n` +
      `  <g id="CREASE" fill="none" stroke="#00aa00" stroke-width="0.2">${crease.map(entitySvg).join("")}</g>\n` +
      `</svg>\n`;
  }
  function illustratorSvgFromDrawing(drawing, padding = 5) {
    if (!drawing || drawing.canExport === false) {
      const errors = drawing?.geometryErrors ?? ["缺少完整刀模資料"];
      throw new Error(`刀模幾何未通過驗證：${errors.join("；")}`);
    }
    return illustratorSvg(drawing.cut, drawing.crease, drawing.bounds, padding);
  }
  return Object.freeze({ illustratorSvg, illustratorSvgFromDrawing });
});
