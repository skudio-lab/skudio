(() => {
  const projects = window.ID_PROJECTS || [];
  const slug = document.body.dataset.project;
  const index = projects.findIndex((item) => item.slug === slug);
  const setText = (selector, value) => {
    document.querySelectorAll(selector).forEach((node) => { node.textContent = value; });
  };

  if (index < 0) {
    setText("[data-project-title]", "Project unavailable");
    return;
  }

  const current = projects[index];
  const railIndex = document.querySelector('.rail-index');
  if (railIndex) {
    const sequence = document.createElement('span');
    sequence.setAttribute('data-project-sequence', '');
    railIndex.replaceChildren(sequence, ` / ${String(projects.length).padStart(2, '0')}`);
  }
  const previous = projects[(index - 1 + projects.length) % projects.length];
  const next = projects[(index + 1) % projects.length];

  setText("[data-project-title]", current.title);
  setText("[data-project-sequence]", current.sequence);
  setText("[data-project-brand]", current.brand);
  setText("[data-project-category]", current.category);
  setText("[data-project-year]", current.year);
  setText("[data-project-role]", current.role);
  setText("[data-prev-title]", previous.title);
  setText("[data-next-title]", next.title);

  const previousLink = document.querySelector("[data-prev-link]");
  const nextLink = document.querySelector("[data-next-link]");
  if (previousLink) previousLink.href = `${previous.slug}.html`;
  if (nextLink) nextLink.href = `${next.slug}.html`;
})();
