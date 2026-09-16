(() => {
  const resolveHeroPath = (slug, value) => {
    if (/^(https?:|data:)/.test(value)) return value;
    if (value.startsWith("../assets/")) return value.slice(3);
    if (value.includes("/")) return value;
    return `assets/images/projects/${slug}/${value}`;
  };

  document.querySelectorAll(".archive-project__link").forEach(async (link) => {
    const match = link.getAttribute("href")?.match(/projects\/([^/]+)\.html$/);
    if (!match) return;
    const slug = match[1];
    try {
      const response = await fetch(`data/projects/${slug}.json`, { cache: "no-store" });
      if (!response.ok) return;
      const data = await response.json();
      if (!data.hero?.image) return;
      const figure = link.querySelector("figure");
      const image = document.createElement("img");
      image.src = resolveHeroPath(slug, data.hero.image);
      image.alt = data.hero.alt || `${data.title || slug} Hero View`;
      image.addEventListener("load", () => figure.replaceChildren(image), { once: true });
    } catch (_) {
      // Keep the existing placeholder when project data or its Hero image is unavailable.
    }
  });
})();
