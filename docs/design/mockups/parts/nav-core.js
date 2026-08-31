/* ══════════════════════════════════════════════════════════════════
   LES TROIS POINTS D'ENTRÉE — même barre sur les trois fiches.

   Liste recopiée de src/lib/accessModeHubs.ts. Un module dont `page`
   vaut null sort en « Bientôt » : le menu ne propose jamais une route
   qui n'existe pas.
   ══════════════════════════════════════════════════════════════════ */
const MODULES = [
  { id: "pays",      title: "Les pays d'Afrique",             axis: "explorer",   accent: "ocre",  icon: "globe",   href: "/fr/explorer/pays" },
  { id: "peuples",   title: "Les peuples d'Afrique",          axis: "explorer",   accent: "teal",  icon: "users",   href: "/fr/explorer/peuples" },
  { id: "familles",  title: "L'arbre des familles",           axis: "explorer",   accent: "terre", icon: "network", href: "/fr/explorer/familles" },
  { id: "recherche", title: "Recherche libre",                axis: "explorer",   accent: "perv",  icon: "search",  href: "/fr/explorer/recherche" },
  { id: "noms",      title: "Noms & appellations",            axis: "explorer",   accent: "ocre",  icon: "tag",     href: "/fr/comprendre/noms" },
  { id: "doctrine",  title: "La doctrine éditoriale",         axis: "comprendre", accent: "teal",  icon: "book",    href: "/fr/comprendre/doctrine" },
  { id: "about",     title: "À propos du projet",             axis: "comprendre", accent: "terre", icon: "info",    href: "/fr/a-propos" },
  { id: "frise",     title: "Premiers repères de migrations", axis: "comprendre", accent: "perv",  icon: "history", href: "/fr/comprendre/migrations" },
  { id: "liens",     title: "Les liens invisibles",           axis: "jouer",      accent: "ocre",  icon: "link",    href: null },
  { id: "comparer",  title: "Comparer deux peuples",          axis: "jouer",      accent: "teal",  icon: "compare", href: "/fr/comparer" },
];

const ICONS = {
  users:   `<path d="M16 19v-1.5a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V19"/><circle cx="9" cy="7" r="3.2"/><path d="M22 19v-1.5a4 4 0 0 0-3-3.87"/><path d="M16 4.1a4 4 0 0 1 0 7.75"/>`,
  globe:   `<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18Z"/>`,
  network: `<circle cx="12" cy="5" r="2.6"/><circle cx="5.5" cy="18.5" r="2.6"/><circle cx="18.5" cy="18.5" r="2.6"/><path d="M12 7.6v4.9M10.4 13.6 7 16.6M13.6 13.6 17 16.6"/>`,
  search:  `<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>`,
  tag:     `<path d="M20.6 12.3 12.3 20.6a2 2 0 0 1-2.8 0l-6.1-6.1a2 2 0 0 1-.6-1.4V4.4A1.4 1.4 0 0 1 4.4 3h8.7c.5 0 1 .2 1.4.6l6.1 6.1a2 2 0 0 1 0 2.6Z"/><circle cx="7.6" cy="7.6" r="1.3" fill="currentColor"/>`,
  book:    `<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v18H6.5A2.5 2.5 0 0 0 4 22Z"/><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20"/>`,
  info:    `<circle cx="12" cy="12" r="9"/><path d="M12 16v-4.5"/><circle cx="12" cy="8.2" r=".9" fill="currentColor"/>`,
  history: `<path d="M3 12a9 9 0 1 0 2.6-6.4"/><path d="M3 4.5V9h4.5"/><path d="M12 7.5V12l3 2"/>`,
  link:    `<path d="M9.5 14.5a4 4 0 0 1 0-5.7l2.4-2.4a4 4 0 1 1 5.7 5.7l-1.2 1.2"/><path d="M14.5 9.5a4 4 0 0 1 0 5.7l-2.4 2.4a4 4 0 1 1-5.7-5.7l1.2-1.2"/>`,
  compare: `<circle cx="6" cy="6.5" r="2.6"/><circle cx="6" cy="17.5" r="2.6"/><circle cx="18" cy="12" r="2.6"/><path d="M8.6 7.6 15.6 11M8.6 16.4 15.6 13"/>`,
};
const icon = (name) =>
  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

const AXES = [
  { id: "explorer",   label: "Explorer",   accent: "ocre",
    blurb: "Quand on sait ce qu'on cherche — une entité, un nom, une entrée du corpus." },
  { id: "comprendre", label: "Comprendre", accent: "teal",
    blurb: "Quand on veut savoir d'où vient ce qu'on lit — méthode, sources, temps long." },
  { id: "jouer",      label: "Jouer",      accent: "perv",
    blurb: "Quand on veut que le corpus réponde — mise en regard, écarts, rapprochements." },
];

/**
 * Monte la barre des trois axes, son panneau déployant et son tiroir
 * mobile. `currentModule` marque l'entrée d'où l'on vient : sur la
 * fiche pays, le module « Les pays d'Afrique » est signalé comme actif.
 */
function mountNav(currentModule) {
  const nav = document.getElementById("axis-nav");
  const panel = document.getElementById("megapanel");
  const drawer = document.getElementById("drawer");
  const scrim = document.getElementById("scrim");
  const burger = document.getElementById("burger");
  const shell = document.getElementById("navshell");

  const modulesOf = (axisId) => MODULES.filter((m) => m.axis === axisId);

  const moduleCard = (m) => {
    const soon = m.href === null;
    return `
    <a class="module-card afh-accent-${m.accent}" href="${m.href ?? "#"}"
       ${soon ? 'aria-disabled="true" tabindex="-1"' : ""}
       ${m.id === currentModule ? 'data-current="true" aria-current="page"' : ""}>
      <span class="mi">${icon(m.icon)}</span>
      <span style="min-width:0">
        <span class="mtitle">${m.title}</span>
        <span class="mroute">${soon ? "route non résolue" : m.href}</span>
        ${soon ? '<span class="state-chip chip-missing" style="margin-top:7px"><span class="dot"></span>Bientôt</span>' : ""}
      </span>
    </a>`;
  };

  nav.innerHTML = AXES.map((a) => `
    <button class="axis-trigger afh-accent-${a.accent}" type="button"
            data-axis="${a.id}" aria-expanded="false" aria-controls="megapanel">
      <span class="seed" aria-hidden="true"></span>${a.label}
      <span class="caret" aria-hidden="true">▾</span>
    </button>`).join("");

  let openAxis = null;

  const openPanel = (axisId) => {
    const axis = AXES.find((a) => a.id === axisId);
    openAxis = axisId;
    panel.className = `megapanel afh-accent-${axis.accent}`;
    panel.dataset.open = "true";
    panel.innerHTML = `
      <div class="megapanel-head"><h4>${axis.label}</h4><p>${axis.blurb}</p></div>
      <div class="module-grid">${modulesOf(axisId).map(moduleCard).join("")}</div>`;
    nav.querySelectorAll(".axis-trigger").forEach((b) =>
      b.setAttribute("aria-expanded", String(b.dataset.axis === axisId)));
  };

  const closePanel = () => {
    openAxis = null;
    panel.dataset.open = "false";
    panel.innerHTML = "";
    nav.querySelectorAll(".axis-trigger").forEach((b) => b.setAttribute("aria-expanded", "false"));
  };

  nav.addEventListener("click", (e) => {
    const btn = e.target.closest(".axis-trigger");
    if (!btn) return;
    btn.dataset.axis === openAxis ? closePanel() : openPanel(btn.dataset.axis);
  });

  nav.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    const btns = [...nav.querySelectorAll(".axis-trigger")];
    const i = btns.indexOf(document.activeElement);
    if (i === -1) return;
    e.preventDefault();
    const next = btns[(i + (e.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length];
    next.focus();
    if (openAxis) openPanel(next.dataset.axis);
  });

  document.getElementById("drawer-body").innerHTML = AXES.map((a) => {
    const mods = modulesOf(a.id);
    return `
    <div class="acc afh-accent-${a.accent}">
      <button class="acc-trigger" type="button" data-acc="${a.id}" aria-expanded="false" aria-controls="acc-${a.id}">
        <span class="seed" aria-hidden="true"></span>${a.label}
        <span class="count">${mods.length}</span><span class="caret" aria-hidden="true">▾</span>
      </button>
      <div class="acc-body" id="acc-${a.id}" data-open="false">${mods.map(moduleCard).join("")}</div>
    </div>`;
  }).join("");

  document.getElementById("drawer-body").addEventListener("click", (e) => {
    const btn = e.target.closest(".acc-trigger");
    if (!btn) return;
    const body = document.getElementById(`acc-${btn.dataset.acc}`);
    const open = body.dataset.open !== "true";
    body.dataset.open = String(open);
    btn.setAttribute("aria-expanded", String(open));
  });

  const openDrawer = () => {
    drawer.dataset.open = "true"; scrim.dataset.open = "true";
    burger.setAttribute("aria-expanded", "true");
    drawer.querySelector(".acc-trigger").focus();
  };
  const closeDrawer = () => {
    drawer.dataset.open = "false"; scrim.dataset.open = "false";
    burger.setAttribute("aria-expanded", "false");
    burger.focus();
  };
  burger.addEventListener("click", openDrawer);
  scrim.addEventListener("click", closeDrawer);
  document.getElementById("drawer-close").addEventListener("click", closeDrawer);

  shell.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (openAxis) {
      const trigger = nav.querySelector(`[data-axis="${openAxis}"]`);
      closePanel();
      trigger.focus();
    }
    if (drawer.dataset.open === "true") closeDrawer();
  });

  return { closePanel };
}
