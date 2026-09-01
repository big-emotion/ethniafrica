/* ══════════════════════════════════════════════════════════════════
   LES TROIS POINTS D'ENTRÉE — même barre sur les trois fiches.

   Liste recopiée de MODULE_DEFINITIONS (src/lib/hubs/moduleRegistry.ts),
   dans l'ordre de ce fichier : l'accent d'un module est sa position dans
   le registre, parcourue en boucle sur ocre · teal · terre · perv. Un
   module dont `href` vaut null sort en « Bientôt » : le menu ne propose
   jamais une route qui n'existe pas.
   ══════════════════════════════════════════════════════════════════ */
const MODULES = [
  { id: "pays",                 title: "Les pays d'Afrique",                  axis: "atlas",   accent: "ocre",  icon: "globe",    href: "/fr/atlas/pays" },
  { id: "peuples",              title: "Les peuples d'Afrique",               axis: "atlas",   accent: "teal",  icon: "users",    href: "/fr/atlas/peuples" },
  { id: "familles",             title: "L'arbre des familles",                axis: "atlas",   accent: "terre", icon: "network",  href: "/fr/atlas/familles" },
  { id: "recherche",            title: "Recherche libre",                     axis: "atlas",   accent: "perv",  icon: "search",   href: "/fr/atlas/recherche" },
  { id: "anecdotes",            title: "Anecdotes",                           axis: "dossiers", accent: "ocre",  icon: "bubble",   href: "/fr/dossiers/anecdotes" },
  { id: "noms",                 title: "Appellations",                        axis: "dossiers", accent: "teal",  icon: "tag",      href: "/fr/dossiers/appellations" },
  { id: "frise",                title: "Premiers repères de migrations",      axis: "dossiers", accent: "terre", icon: "history",  href: "/fr/dossiers/migrations" },
  { id: "regards-colonisation", title: "Regards : colonisation et résistances", axis: "dossiers", accent: "perv",  icon: "gaze",     href: "/fr/dossiers/regards/colonisation-et-resistances" },
  { id: "quiz",                 title: "Le quiz des parcours",                axis: "jeux",      accent: "ocre",  icon: "quiz",     href: "/fr/jeux/quiz" },
  { id: "mercator",             title: "La taille qu'on vous a cachée",       axis: "jeux",      accent: "teal",  icon: "truesize", href: "/fr/jeux/mercator" },
  { id: "doctrine",             title: "La doctrine éditoriale",              axis: "dossiers", accent: "terre", icon: "book",     href: "/fr/dossiers/doctrine" },
  { id: "about",                title: "À propos du projet",                  axis: "dossiers", accent: "perv",  icon: "info",     href: "/fr/about" },
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
  bubble:  `<path d="M20.5 11.8a7.5 7.5 0 0 1-10.9 6.7L4 20l1.8-5.4A7.5 7.5 0 1 1 20.5 11.8Z"/>`,
  gaze:    `<path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="3"/>`,
  quiz:    `<circle cx="12" cy="12" r="9"/><path d="M9.4 9.4a2.7 2.7 0 0 1 5.2.9c0 1.8-2.6 2.3-2.6 3.8"/><circle cx="12" cy="17.2" r=".9" fill="currentColor"/>`,
  truesize:`<path d="M3 9V4.5A1.5 1.5 0 0 1 4.5 3H9"/><path d="M15 3h4.5A1.5 1.5 0 0 1 21 4.5V9"/><path d="M21 15v4.5a1.5 1.5 0 0 1-1.5 1.5H15"/><path d="M9 21H4.5A1.5 1.5 0 0 1 3 19.5V15"/><rect x="8.5" y="8.5" width="7" height="7" rx="1"/>`,
};
const icon = (name) =>
  `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

/* `id` = AccessMode, `label` = ACCESS_MODE_LABELS : le libellé nominal vient
   de DEC-045 (ETNI-1614), l'identifiant `atlas`/`dossiers`/`jeux` aligné
   dessus par ETNI-1615 (REQ-138). */
const AXES = [
  { id: "atlas",     label: "L'atlas", accent: "ocre",
    blurb: "Quand on sait ce qu'on cherche — une entité, un nom, une entrée du corpus." },
  { id: "dossiers",  label: "Les dossiers",  accent: "teal",
    blurb: "Quand on veut savoir d'où vient ce qu'on lit — méthode, sources, temps long." },
  { id: "jeux",      label: "Les jeux",     accent: "perv",
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
