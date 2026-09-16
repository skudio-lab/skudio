(async () => {
  const slug = document.body.dataset.pkgProject;
  if (!slug) return;
  const base = `../assets/images/pkg-projects/${slug}/`;
  const ratios = { "1:1": "1 / 1", "4:3": "4 / 3", "3:2": "3 / 2", "16:9": "16 / 9", "4:5": "4 / 5", "3:4": "3 / 4", original: "auto" };
  const text = (selector, value) => document.querySelectorAll(selector).forEach(node => { node.textContent = value || "—"; });

  function media(item, label, className = "") {
    const figure = document.createElement("figure");
    figure.className = `media-slot ${className}`.trim();
    if (item?.image) {
      const image = document.createElement("img");
      image.src = `${base}${item.image}`;
      image.alt = "";
      image.addEventListener("error", () => figure.replaceChildren(Object.assign(document.createElement("span"), { className: "media-slot__label", textContent: "FILE NOT FOUND" })), { once: true });
      figure.append(image);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "media-slot__label";
      placeholder.textContent = label;
      figure.append(placeholder);
    }
    return figure;
  }

  function renderBrief(brief = {}) {
    const target = document.querySelector("[data-pkg-brief]");
    const rows = [
      ["ISTA Level", brief.ista || "1A"], ["Carton Weight", brief.weight], ["Export Market / Regulations", brief.markets],
      ["Product Size", brief.productSize], ["Accessories / Alternate Parts", brief.accessories], ["Cost Down / UX Priority", brief.priority]
    ];
    target.replaceChildren(...rows.map(([title, value], index) => {
      const row = document.createElement("article");
      row.className = "project-numbered-row";
      row.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><h3>${title}</h3><p>${value || "—"}</p>`;
      return row;
    }));
  }

  function renderComponents(components = {}) {
    const section = document.querySelector("[data-pkg-components-section]");
    section.hidden = components.visible === false;
    const stage = document.querySelector("[data-pkg-stage]");
    const drawing = media({ image: components.image }, "ASSEMBLY / EXPLODED DRAWING", "project-media");
    stage.replaceChildren(drawing);
    const items = (components.items || []).filter(item => item.visible !== false).map(window.PKGComponentModel.presentComponent);
    items.forEach((item, index) => {
      const marker = document.createElement("button");
      marker.type = "button";
      marker.className = "project-part-marker pkg-component-marker";
      marker.dataset.componentIndex = index;
      marker.style.left = `${item.position?.x ?? 50}%`;
      marker.style.top = `${item.position?.y ?? 50}%`;
      marker.textContent = String(index + 1).padStart(2, "0");
      if ((item.position?.x ?? 50) > 60) marker.classList.add("project-part-marker--tooltip-left");
      const tooltip = document.createElement("span");
      tooltip.className = "project-part-tooltip";
      tooltip.innerHTML = `<strong>${item.name || "Component"}</strong><dl>${item.description ? `<div><dt>Description</dt><dd>${item.description}</dd></div>` : ""}<div><dt>Material</dt><dd>${item.material || "—"}</dd></div><div><dt>Qty</dt><dd>${item.quantity || "—"}</dd></div><div><dt>Size</dt><dd>${item.size || "—"}</dd></div></dl>`;
      marker.append(tooltip);
      stage.append(marker);
    });
    const list = document.querySelector("[data-pkg-components]");
    list.replaceChildren(...items.map((item, index) => {
      const row = document.createElement("article");
      row.className = "project-part-row pkg-component-row";
      const labelFields = item.label ? [["Adhesive", item.label.adhesive], ["Regulations", item.label.regulations]] : [];
      row.innerHTML = `<span class="project-part-number">${String(index + 1).padStart(2, "0")}</span><div><h3>${item.name || "Component"}</h3>${item.description ? `<p>${item.description}</p>` : ""}<dl><div><dt>Material</dt><dd>${item.material || "—"}</dd></div><div><dt>Quantity</dt><dd>${item.quantity || "—"}</dd></div><div><dt>Size</dt><dd>${item.size || "—"}</dd></div>${labelFields.filter(([, value]) => value).map(([key, value]) => `<div class="pkg-label-property"><dt>${key}</dt><dd>${value}</dd></div>`).join("")}</dl></div>`;
      return row;
    }));
  }

  function renderLabelOverview(labels = {}) {
    document.querySelector("[data-pkg-labels-section]").hidden = labels.visible === false;
    const overview = document.querySelector("[data-pkg-label-overview]");
    const source = window.PKGComponentModel.pdfSource(slug, labels.overviewPdf);
    const nextOverview = document.createElement("div");
    nextOverview.className = "pkg-pdf-overview";
    nextOverview.setAttribute("data-pkg-label-overview", "");
    if (source) {
      window.PKGPdfViewer.mount(nextOverview, source);
    } else {
      nextOverview.append(Object.assign(document.createElement("span"), { className: "media-slot__label", textContent: "LABEL ARTWORK PDF" }));
    }
    overview.replaceWith(nextOverview);
  }

  function renderDeliverables(deliverables = {}) {
    const target = document.querySelector("[data-pkg-deliverables]");
    const normalized = window.PKGComponentModel.normalizeDeliverables(deliverables);
    target.hidden = normalized.visible === false;
    target.className = "project-section__content pkg-deliverables-list";
    target.replaceChildren(...normalized.items.filter(item => item.visible !== false).map((item, index) => {
      const article = document.createElement("article");
      article.className = "pkg-deliverable-pdf";
      if (item.title) article.innerHTML = `<header><span>${String(index + 1).padStart(2, "0")}</span><h3>${item.title}</h3></header>`;
      const stage = document.createElement("div");
      stage.className = "pkg-pdf-overview";
      const source = window.PKGComponentModel.pdfSource(slug, item.pdf);
      if (source) window.PKGPdfViewer.mount(stage, source);
      else stage.append(Object.assign(document.createElement("span"), { className: "media-slot__label", textContent: "PDF NOT SET" }));
      article.append(stage);
      return article;
    }));
  }

  function render(data) {
    text("[data-pkg-sequence]", data.sequence); text("[data-pkg-title]", data.title); text("[data-pkg-summary]", data.hero?.summary);
    text("[data-pkg-company]", data.overview?.company); text("[data-pkg-brand]", data.overview?.brand); text("[data-pkg-year]", data.overview?.year); text("[data-pkg-role]", (data.overview?.role || []).join(" / "));
    const hero = document.querySelector("[data-pkg-hero]");
    hero.replaceChildren(...media(data.hero, "PACKAGING HERO IMAGE").childNodes);
    renderBrief(data.brief); renderComponents(data.components); renderLabelOverview(data.labels); renderDeliverables(data.deliverables);
    const projects = window.PKG_PROJECTS || []; const index = projects.findIndex(item => item.slug === slug);
    const previous = projects[(index - 1 + projects.length) % projects.length]; const next = projects[(index + 1) % projects.length];
    const previousLink = document.querySelector("[data-pkg-prev]"); const nextLink = document.querySelector("[data-pkg-next]");
    if (previousLink && previous) { previousLink.href = `pkg-${previous.slug}.html`; previousLink.querySelector("span").textContent = previous.title; }
    if (nextLink && next) { nextLink.href = `pkg-${next.slug}.html`; nextLink.querySelector("span").textContent = next.title; }
  }

  window.PKGProjectPage = { slug, render, renderComponents };
  const response = await fetch(`../data/pkg-projects/${slug}.json`);
  if (!response.ok) return;
  const data = await response.json();
  render(data);
  dispatchEvent(new CustomEvent("pkg-project:data-ready", { detail: data }));
})();
