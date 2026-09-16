(() => {
  const linkedLabels = components => (components || []).filter(item => item.label?.enabled).map(item => ({ image: "", name: item.name || "Label", regulations: item.label.regulations || "", size: item.size || "", paper: item.material || "", adhesive: item.label.adhesive || "", supplyForm: "", visible: true, linked: true }));
  const clean = value => typeof value === "string" && value.trim() ? value.trim() : null;
  const presentComponent = item => ({
    ...item,
    description: clean(item.description),
    label: item.label?.enabled ? { adhesive: clean(item.label.adhesive), regulations: clean(item.label.regulations) } : null,
  });
  const pdfSource = (slug, filename) => clean(filename) ? `../assets/images/pkg-projects/${slug}/${filename.trim()}` : "";
  const normalizeDeliverables = deliverables => ({
    visible: Array.isArray(deliverables) ? true : deliverables?.visible !== false,
    items: (Array.isArray(deliverables) ? deliverables : deliverables?.items || []).map(item => ({ title: item.title || "", pdf: item.pdf || item.image || "", visible: item.visible !== false })),
  });
  const api = { linkedLabels, presentComponent, pdfSource, normalizeDeliverables };
  if (typeof window !== "undefined") window.PKGLabelLink = api;
  if (typeof window !== "undefined") window.PKGComponentModel = api;
  if (typeof module !== "undefined") module.exports = api;
})();
