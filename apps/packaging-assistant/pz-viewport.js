(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PzViewport = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const freeze = view => Object.freeze(view);
  function fit(bounds, padding = 18) {
    return freeze({ x: bounds.minX - padding, y: bounds.minY - padding, width: bounds.width + 2 * padding, height: bounds.height + 2 * padding });
  }
  function zoomAt(view, factor, anchor) {
    const width = view.width * factor, height = view.height * factor;
    return freeze({
      x: anchor.x - (anchor.x - view.x) * factor,
      y: anchor.y - (anchor.y - view.y) * factor,
      width, height,
    });
  }
  function pan(view, dx, dy) { return freeze({ x: view.x + dx, y: view.y + dy, width: view.width, height: view.height }); }
  function text(view) { return `${view.x} ${view.y} ${view.width} ${view.height}`; }
  return Object.freeze({ fit, zoomAt, pan, text });
});
