(() => {
  const slug = document.body.dataset.aiProject;
  if (!slug) return;

  const one = selector => document.querySelector(selector);
  const all = selector => document.querySelectorAll(selector);
  const escapeHTML = (value = "") => String(value).replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);
  const ratioClass = ratio => ({ "1:1": "is-square", "4:3": "is-standard", "16:9": "is-wide", auto: "is-auto" })[ratio] || "is-wide";

  const setText = (selector, value) => {
    const element = one(selector);
    if (!element) return;
    element.textContent = value || "";
    element.hidden = !value;
  };

  const mediaHTML = (image, label, ratio = "16:9") => `<figure class="media-slot ai-detail-media ${ratioClass(ratio)}">${image
    ? `<img src="${escapeHTML(image)}" alt="">`
    : `<span class="media-slot__label">${escapeHTML(label || `${ratio} IMAGE`)}</span>`}</figure>`;

  const renderItems = (selector, items = [], kind = "feature") => {
    const root = one(selector);
    if (!root) return;
    const valid = items.filter(item => item && (item.title || item.description || item.image));
    root.innerHTML = valid.map(item => `<article class="ai-detail-card is-${item.layout === "half" ? "half" : "full"}">
      ${mediaHTML(item.image, item.imageLabel, item.ratio)}
      <div class="ai-detail-card__copy">
        ${item.number ? `<span>${escapeHTML(item.number)}</span>` : ""}
        ${item.title ? `<h3>${escapeHTML(item.title)}</h3>` : ""}
        ${item.description ? `<p>${escapeHTML(item.description)}</p>` : ""}
      </div>
    </article>`).join("");
    const section = root.closest("[data-ai-section]");
    if (section) section.hidden = !valid.length;
    root.dataset.kind = kind;
  };

  const renderResults = (items = []) => {
    const root = one("[data-ai-results]");
    if (!root) return;
    const valid = items.filter(item => item && (item.value || item.title || item.description));
    root.innerHTML = valid.map(item => `<article class="ai-result">
      ${item.value ? `<strong class="display-serif">${escapeHTML(item.value)}</strong>` : ""}
      ${item.title ? `<h3>${escapeHTML(item.title)}</h3>` : ""}
      ${item.description ? `<p>${escapeHTML(item.description)}</p>` : ""}
    </article>`).join("");
    const section = root.closest("[data-ai-section]");
    if (section) section.hidden = !valid.length;
  };

  const renderApplication = application => {
    const link = one("[data-ai-application]");
    const section = link?.closest("[data-ai-section]");
    const visible = Boolean(application?.enabled && application.url);
    if (section) section.hidden = !visible;
    if (!link || !visible) return;
    link.href = application.url;
    link.textContent = application.label || "Open Application";
    if (application.openInNewTab) {
      link.target = "_blank";
      link.rel = "noopener";
    }
  };

  fetch(`../data/ai-projects/${slug}.json`, { cache: "no-store" })
    .then(response => response.ok ? response.json() : Promise.reject(new Error("Project data unavailable")))
    .then(data => {
      const project = data.project || {};
      document.title = `${project.title || "AI Project"}｜AI Applications`;
      setText("[data-ai-sequence]", project.sequence);
      all("[data-ai-sequence]").forEach(element => { element.textContent = project.sequence || ""; });
      setText("[data-ai-title]", project.title);
      setText("[data-ai-category]", project.category);
      setText("[data-ai-year]", project.year);
      setText("[data-ai-role]", project.role);
      setText("[data-ai-statement]", data.hero?.statement);

      const hero = one("[data-ai-hero]");
      if (hero) hero.innerHTML = data.hero?.image
        ? `<img src="${escapeHTML(data.hero.image)}" alt="">`
        : '<span class="media-slot__label">HERO VIEW · 1600 × 900 px</span>';

      setText("[data-ai-challenge-title]", data.challenge?.title);
      setText("[data-ai-challenge-description]", data.challenge?.description);
      const challengeSection = one("[data-ai-section='challenge']");
      if (challengeSection) challengeSection.hidden = !(data.challenge?.title || data.challenge?.description);

      setText("[data-ai-solution-title]", data.solution?.title);
      setText("[data-ai-solution-description]", data.solution?.description);
      const solutionMedia = one("[data-ai-solution-media]");
      if (solutionMedia) solutionMedia.innerHTML = mediaHTML(data.solution?.image, "SOLUTION OVERVIEW", data.solution?.ratio);
      const solutionSection = one("[data-ai-section='solution']");
      if (solutionSection) solutionSection.hidden = !(data.solution?.title || data.solution?.description || data.solution?.image);

      renderItems("[data-ai-features]", data.features, "feature");
      renderResults(data.results);
      renderApplication(data.application);

      const prev = one("[data-ai-prev]");
      const next = one("[data-ai-next]");
      if (prev && data.navigation?.previous) {
        prev.href = data.navigation.previous.url;
        prev.querySelector("span").textContent = data.navigation.previous.title;
      }
      if (next && data.navigation?.next) {
        next.href = data.navigation.next.url;
        next.querySelector("span").textContent = data.navigation.next.title;
      }
    })
    .catch(() => {
      const main = one(".project-detail");
      if (main) main.innerHTML = '<section class="project-section"><p class="ai-projects-error">Project data is unavailable.</p></section>';
    });
})();
