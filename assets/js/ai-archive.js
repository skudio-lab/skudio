(() => {
  const root = document.querySelector("[data-ai-projects]");
  if (!root) return;

  const escapeHTML = (value = "") => String(value).replace(/[&<>"]/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character]);

  const renderProject = project => {
    const media = project.image
      ? `<img src="${escapeHTML(project.image)}" alt="">`
      : `<span class="media-slot__label">${escapeHTML(project.imageLabel)}</span>`;
    const features = (project.features || []).map(feature => `<li>${escapeHTML(feature)}</li>`).join("");
    return `<article class="ai-project">
      <a class="ai-project__visual" href="${escapeHTML(project.url || "#")}"><figure class="media-slot ai-project__media">${media}</figure></a>
      <div class="ai-project__content">
        <div class="ai-project__heading"><span>${escapeHTML(project.sequence)}</span><p>${escapeHTML(project.category)}</p><h3 class="display-serif">${escapeHTML(project.title)}</h3></div>
        <p class="ai-project__summary">${escapeHTML(project.summary)}</p>
        <ul class="ai-project__features">${features}</ul>
        ${project.url ? `<a class="editorial-link" href="${escapeHTML(project.url)}">View Project</a>` : ""}
      </div>
    </article>`;
  };

  fetch("data/ai-projects.json", { cache: "no-store" })
    .then(response => response.ok ? response.json() : Promise.reject(new Error("AI project data unavailable")))
    .then(data => { root.innerHTML = (data.projects || []).map(renderProject).join(""); })
    .catch(() => { root.innerHTML = '<p class="ai-projects-error">AI project data is unavailable.</p>'; });
})();
