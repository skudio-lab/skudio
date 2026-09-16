(async () => {
  const slug = document.body.dataset.viProject;
  if (!slug) return;
  const base = `../assets/images/vi-projects/${slug}/`;
  const setText = (selector, value) => document.querySelectorAll(selector).forEach(element => { element.textContent = value || "—"; });
  const aspectRatio = ratio => ({ "1:1": "1 / 1", "4:3": "4 / 3", "3:2": "3 / 2", "16:9": "16 / 9", "4:5": "4 / 5", "3:4": "3 / 4", original: "auto" })[ratio] || "1 / 1";
  const media = (item, label) => {
    const figure = document.createElement("figure");
    figure.className = "media-slot vi-media";
    if (item?.image) {
      const image = document.createElement("img");
      image.src = `${base}${item.image}`;
      image.alt = item.alt || item.title || label;
      figure.append(image);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "media-slot__label";
      placeholder.textContent = label;
      figure.append(placeholder);
    }
    return figure;
  };
  const renderGrid = (selector, items, label, adjustable = false) => {
    const target = document.querySelector(selector);
    if (!target) return;
    target.replaceChildren(...items.filter(item => item.visible !== false).map((item, index) => {
      const article = document.createElement("article");
      article.className = "vi-grid-item";
      if (adjustable) article.classList.add(`project-gallery-item--${["half", "full", "auto"].includes(item.width) ? item.width : "half"}`);
      const figure = media(item, `${label} · 1200 × 1200 px`);
      if (adjustable) figure.style.aspectRatio = aspectRatio(item.ratio);
      article.append(figure);
      if (item.title || item.description) {
        const caption = document.createElement("div");
        caption.className = "project-gallery-caption";
        const number = document.createElement("span");
        number.textContent = String(index + 1).padStart(2, "0");
        const title = document.createElement("h3");
        title.textContent = item.title || "";
        caption.append(number, title);
        if (item.description) {
          const description = document.createElement("p");
          description.textContent = item.description;
          caption.append(description);
        }
        article.append(caption);
      }
      return article;
    }));
  };
  function render(data) {
    setText("[data-vi-sequence]", data.sequence);
    setText("[data-vi-title]", data.title);
    setText("[data-vi-company]", data.overview?.company);
    setText("[data-vi-category]", data.overview?.category);
    setText("[data-vi-year]", data.overview?.year);
    setText("[data-vi-role]", (data.overview?.role || []).join(" / "));
    const hero = document.querySelector("[data-vi-hero]");
    if (hero) hero.replaceChildren(...media(data.hero, "HERO CONTEXT IMAGE · 1600 × 900 px").childNodes);
    const brief = document.querySelector("[data-vi-brief]");
    if (brief) brief.replaceChildren(...(data.brief || []).map((item, index) => {
      const row = document.createElement("article");
      row.className = "project-numbered-row";
      const number = document.createElement("span");
      number.textContent = String(index + 1).padStart(2, "0");
      const title = document.createElement("h3");
      title.textContent = item.title || "";
      const copy = document.createElement("p");
      copy.textContent = item.content || "";
      row.append(number, title, copy);
      return row;
    }));
    renderGrid("[data-vi-development]", data.development || [], "LOGO ITERATION");
    const finalTarget = document.querySelector("[data-vi-final]");
    if (finalTarget) finalTarget.replaceChildren(media(data.finalLogo, "FINAL LOGO · 1600 × 1200 px"));
    renderGrid("[data-vi-applications]", data.applications || [], "LOGO APPLICATION", true);
    const projects = window.VI_PROJECTS || [];
    const index = projects.findIndex(item => item.slug === slug);
    const previous = projects[(index - 1 + projects.length) % projects.length];
    const next = projects[(index + 1) % projects.length];
    const previousLink = document.querySelector("[data-vi-prev]");
    const nextLink = document.querySelector("[data-vi-next]");
    if (previousLink && previous) { previousLink.href = `${previous.slug}.html`; previousLink.querySelector("span").textContent = previous.title; }
    if (nextLink && next) { nextLink.href = `${next.slug}.html`; nextLink.querySelector("span").textContent = next.title; }
  }
  window.VIProjectPage = { slug, render };
  const response = await fetch(`../data/vi-projects/${slug}.json`);
  if (!response.ok) return;
  const data = await response.json();
  render(data);
  dispatchEvent(new CustomEvent("vi-project:data-ready", { detail: data }));
})();
