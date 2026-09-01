import Link from "next/link";

import { AccessAxes } from "@/components/home/AccessAxes";
import { PurposeBlocks } from "@/components/home/PurposeBlocks";
import { SynthesisRail } from "@/components/home/SynthesisRail";
import type { CorpusCounts } from "@/lib/home/corpusCounts";
import type { CountrySynthesis } from "@/lib/home/countrySynthesis";
import type { HubModule } from "@/lib/hubs/moduleAvailability";
import { ACCESS_MODE_LABELS, type AccessMode } from "@/lib/hubs/moduleRegistry";
import { getLocalizedRoute, type PageType } from "@/lib/routing";
import type { Language } from "@/types/shared";
import { ChapterHeading } from "@/components/pages/ChapterHeading";

interface AboutPageContentProps {
  language: Language;
  counts: CorpusCounts;
  modulesByAxis: Record<AccessMode, HubModule[]>;
  syntheses: CountrySynthesis[];
}

/**
 * /[lang]/about content — editorial family (charter §4/§7, FR107). Gains
 * chapter anatomy across its top-level sections; the prose carries no reading
 * measure and fills the page box it shares with its title.
 * Institution/region group labels (formerly H4) are plain text: H3 is the
 * deepest heading this long-form exception allows.
 */
// @req REQ-091 @req REQ-132
export default function AboutPageContent({
  language,
  counts,
  modulesByAxis,
  syntheses,
}: AboutPageContentProps) {
  const content = {
    fr: {
      title: "À propos",
      overview: {
        eyebrow: "Le projet",
        lead: "EthniAfrica est un atlas éditorial en français consacré aux peuples, aux langues, aux familles linguistiques et aux pays d’Afrique.",
        body: "Le corpus relie ces quatre types de fiches pour permettre de les situer sans les confondre. Il se construit progressivement, à partir d’informations documentées et rendues accessibles dans un même espace de consultation.",
      },
      contentFamilies: {
        title: "Ce que contient EthniAfrica",
        intro:
          "Quatre objets distincts structurent le corpus. Chaque fiche peut renvoyer vers les autres lorsque la relation est documentée.",
        items: [
          {
            title: "Peuples",
            description:
              "Des fiches consacrées aux peuples, à leurs appellations et aux relations documentées dans le corpus.",
            accentClass: "afh-accent-ocre",
            page: "peoples" as PageType,
            linkLabel: "Parcourir les peuples",
          },
          {
            title: "Langues",
            description:
              "Les langues sont présentées comme des objets propres et reliées aux peuples et aux familles concernées.",
            accentClass: "afh-accent-perv",
          },
          {
            title: "Familles linguistiques",
            description:
              "Les regroupements linguistiques disposent de leurs propres fiches et ne sont pas assimilés à des peuples.",
            accentClass: "afh-accent-terre",
            page: "families" as PageType,
            linkLabel: "Parcourir les familles",
          },
          {
            title: "Pays",
            description:
              "Les fiches pays donnent le cadre territorial dans lequel le corpus situe ses autres entrées.",
            accentClass: "afh-accent-teal",
            page: "countries" as PageType,
            linkLabel: "Parcourir les pays",
          },
        ],
      },
      accessModes: {
        title: "Trois manières d’entrer dans l’atlas",
        intro:
          "Le même corpus se parcourt selon l’intention du moment : chercher une fiche, approfondir une question ou mettre ses repères à l’épreuve.",
        items: [
          {
            id: "explorer" as AccessMode,
            description:
              "Retrouver une fiche et parcourir le corpus par peuple, famille linguistique, pays ou appellation.",
            accentClass: "afh-accent-ocre",
          },
          {
            id: "comprendre" as AccessMode,
            description:
              "Suivre les sujets qui traversent plusieurs fiches et replacer les informations dans leur contexte.",
            accentClass: "afh-accent-teal",
          },
          {
            id: "jouer" as AccessMode,
            description:
              "Interroger ses repères grâce aux jeux construits à partir du corpus.",
            accentClass: "afh-accent-perv",
          },
        ],
      },
      doctrine: {
        title: "À propos et Doctrine : deux rôles distincts",
        project:
          "La page À propos présente le projet, le contenu du corpus et les façons de le parcourir.",
        method:
          "La Doctrine explique comment les affirmations sont établies, comment les sources sont évaluées et comment les choix éditoriaux sont signalés.",
        linkLabel: "Consulter la Doctrine éditoriale",
      },
      sources: {
        title: "Sources",
        intro: "Bibliographie complète — Populations & Ethnies d'Afrique",
        international: {
          title: "Sources internationales (principales)",
          un: {
            title: "ONU — Nations Unies",
            item1: {
              name: "United Nations, Department of Economic and Social Affairs, Population Division.",
              description: "World Population Prospects 2024 / 2025 (WPP)",
              url: "https://population.un.org/wpp/",
            },
            item2: {
              name: "United Nations Statistical Division (UNData)",
              url: "https://data.un.org/",
            },
          },
          cia: {
            title: "CIA — The World Factbook",
            description:
              "Source centrale pour la répartition ethnique par pays (quand disponible).",
            item1: {
              name: "CIA — Ethnic Groups (country comparison)",
              url: "https://www.cia.gov/the-world-factbook/field/ethnic-groups/",
            },
            item2: {
              name: "CIA — Country Profiles",
              description: "(Exemple : Afrique du Sud)",
              url: "https://www.cia.gov/the-world-factbook/countries/south-africa/",
            },
          },
          worldBank: {
            title: "Banque Mondiale — World Bank",
            item1: {
              name: "The World Bank — World Development Indicators",
              url: "https://data.worldbank.org/",
            },
            item2: {
              name: "The World Bank — Population, total",
              url: "https://data.worldbank.org/indicator/SP.POP.TOTL",
            },
          },
          unesco: {
            title: "UNESCO / Institut de statistique",
            item1: {
              name: "UNESCO Institute for Statistics",
              url: "https://uis.unesco.org/",
            },
          },
        },
        regional: {
          title: "Sources par région (instituts officiels africains)",
          northAfrica: {
            title: "Afrique du Nord",
            countries: {
              algeria: {
                name: "Algérie",
                item: {
                  name: "Office National des Statistiques (ONS), Algérie",
                  url: "http://www.ons.dz/",
                },
              },
              morocco: {
                name: "Maroc",
                item: {
                  name: "Haut-Commissariat au Plan (HCP)",
                  url: "https://www.hcp.ma/",
                },
              },
              tunisia: {
                name: "Tunisie",
                item: {
                  name: "Institut National de la Statistique (INS)",
                  url: "http://www.ins.tn/",
                },
              },
              egypt: {
                name: "Égypte",
                item: {
                  name: "Central Agency for Public Mobilization and Statistics (CAPMAS)",
                  url: "https://www.capmas.gov.eg/",
                },
              },
              libya: {
                name: "Libye",
                item: {
                  name: "Pas d'institut fonctionnel → données ONU & CIA",
                },
              },
              sudan: {
                name: "Soudan",
                item: {
                  name: "Central Bureau of Statistics, Sudan",
                  url: "http://cbs.gov.sd/",
                },
              },
              mauritania: {
                name: "Mauritanie",
                item: {
                  name: "Office National de la Statistique (ONS Mauritanie)",
                  url: "http://www.ons.mr/",
                },
              },
              westernSahara: {
                name: "Sahara Occidental",
                item: {
                  name: "Données via ONU + rapports académiques (Hassaniennes)",
                },
              },
            },
          },
          westAfrica: {
            title: "Afrique de l'Ouest",
            countries: {
              benin: {
                name: "Bénin",
                item: {
                  name: "Institut National de la Statistique et de la Démographie (INStaD)",
                  url: "https://instad.bj/",
                },
              },
              burkinaFaso: {
                name: "Burkina Faso",
                item: {
                  name: "Institut National de la Statistique et de la Démographie (INSD)",
                  url: "http://www.insd.bf/",
                },
              },
              caboVerde: {
                name: "Cabo Verde",
                item: {
                  name: "Instituto Nacional de Estatística (INE CV)",
                  url: "https://ine.cv/",
                },
              },
              coteIvoire: {
                name: "Côte d'Ivoire",
                item: {
                  name: "Institut National de la Statistique (INS Côte d'Ivoire)",
                  url: "https://www.ins.ci/",
                },
              },
              gambia: {
                name: "Gambie",
                item: {
                  name: "Gambia Bureau of Statistics",
                  url: "https://www.gbosdata.org/",
                },
              },
              ghana: {
                name: "Ghana",
                item: {
                  name: "Ghana Statistical Service",
                  url: "https://statsghana.gov.gh/",
                },
              },
              guinea: {
                name: "Guinée",
                item: {
                  name: "Institut National de la Statistique (INS Guinée)",
                  url: "https://www.stat-guinee.org/",
                },
              },
              guineaBissau: {
                name: "Guinée-Bissau",
                item: {
                  name: "Instituto Nacional de Estatística da Guiné-Bissau",
                  description: "(pas de site fonctionnel → données ONU & CIA)",
                },
              },
              liberia: {
                name: "Liberia",
                item: {
                  name: "Liberia Institute of Statistics & Geo-Information Services (LISGIS)",
                  url: "https://lisgis.gov.lr/",
                },
              },
              mali: {
                name: "Mali",
                item: {
                  name: "Institut National de la Statistique (INSTAT Mali)",
                  url: "https://www.instat-mali.org/",
                },
              },
              niger: {
                name: "Niger",
                item: {
                  name: "Institut National de la Statistique (INS Niger)",
                  url: "https://www.stat-niger.org/",
                },
              },
              nigeria: {
                name: "Nigéria",
                item: {
                  name: "National Bureau of Statistics (NBS Nigeria)",
                  url: "https://www.nigerianstat.gov.ng/",
                },
              },
              senegal: {
                name: "Sénégal",
                item: {
                  name: "Agence Nationale de la Statistique et de la Démographie (ANSD)",
                  url: "https://www.ansd.sn/",
                },
              },
              sierraLeone: {
                name: "Sierra Leone",
                item: {
                  name: "Statistics Sierra Leone",
                  url: "https://www.statistics.sl/",
                },
              },
              togo: {
                name: "Togo",
                item: {
                  name: "Institut National de la Statistique et des Études Économiques et Démographiques (INSEED)",
                  url: "https://inseed.tg/",
                },
              },
            },
          },
          centralAfrica: {
            title: "Afrique Centrale",
            countries: {
              cameroon: {
                name: "Cameroun",
                item: {
                  name: "Institut National de la Statistique (INS Cameroun)",
                  url: "https://www.statistics-cameroon.org/",
                },
              },
              centralAfricanRepublic: {
                name: "République Centrafricaine",
                item: {
                  name: "Institut Centrafricain de Statistique et des Études Économiques et Sociales (ICASEES)",
                  url: "https://www.icasees.org/",
                },
              },
              chad: {
                name: "Tchad",
                item: {
                  name: "Institut National de la Statistique du Tchad (INSEED Tchad)",
                  url: "http://www.inseed-td.net/",
                },
              },
              congo: {
                name: "Congo (Brazzaville)",
                item: {
                  name: "Centre National de la Statistique et des Études Économiques (CNSEE)",
                  url: "https://cnsee.cg/",
                },
              },
              drc: {
                name: "RDC",
                item: {
                  name: "Institut National de la Statistique (INS RDC)",
                  url: "https://ins-rdc.org/",
                },
              },
              gabon: {
                name: "Gabon",
                item: {
                  name: "Direction Générale de la Statistique (DGS)",
                  url: "https://dge-gabon.org/",
                },
              },
              equatorialGuinea: {
                name: "Guinée équatoriale",
                item: {
                  name: "Données CIA + ONU",
                },
              },
              saoTome: {
                name: "São Tomé-et-Principe",
                item: {
                  name: "Instituto Nacional de Estatística (INE STP)",
                  url: "https://www.ine.st/",
                },
              },
            },
          },
          eastAfrica: {
            title: "Afrique de l'Est",
            countries: {
              ethiopia: {
                name: "Éthiopie",
                item: {
                  name: "Central Statistical Agency (CSA)",
                  url: "https://www.statsethiopia.gov.et/",
                },
              },
              kenya: {
                name: "Kenya",
                item: {
                  name: "Kenya National Bureau of Statistics",
                  url: "https://www.knbs.or.ke/",
                },
              },
              uganda: {
                name: "Ouganda",
                item: {
                  name: "Uganda Bureau of Statistics",
                  url: "https://www.ubos.org/",
                },
              },
              tanzania: {
                name: "Tanzanie",
                item: {
                  name: "National Bureau of Statistics Tanzania",
                  url: "https://www.nbs.go.tz/",
                },
              },
              rwanda: {
                name: "Rwanda",
                item: {
                  name: "National Institute of Statistics of Rwanda",
                  url: "https://www.statistics.gov.rw/",
                },
              },
              burundi: {
                name: "Burundi",
                item: {
                  name: "Institut de Statistiques et d'Études Économiques du Burundi (ISTEEBU)",
                  url: "https://www.isteebu.bi/",
                },
              },
              somalia: {
                name: "Somalie",
                item: {
                  name: "Données ONU + CIA",
                },
              },
              djibouti: {
                name: "Djibouti",
                item: {
                  name: "Institut de la Statistique de Djibouti",
                  url: "https://www.stat.dj/",
                },
              },
              eritrea: {
                name: "Érythrée",
                item: {
                  name: "Données ONU + CIA (pas de statistiques publiques)",
                },
              },
              madagascar: {
                name: "Madagascar",
                item: {
                  name: "Institut National de la Statistique (INSTAT Madagascar)",
                  url: "https://www.instat.mg/",
                },
              },
              malawi: {
                name: "Malawi",
                item: {
                  name: "National Statistical Office",
                  url: "https://www.nsomalawi.mw/",
                },
              },
              mozambique: {
                name: "Mozambique",
                item: {
                  name: "Instituto Nacional de Estatística",
                  url: "http://www.ine.gov.mz/",
                },
              },
              mauritius: {
                name: "Maurice",
                item: {
                  name: "Statistics Mauritius",
                  url: "https://statsmauritius.govmu.org/",
                },
              },
              seychelles: {
                name: "Seychelles",
                item: {
                  name: "National Bureau of Statistics Seychelles",
                  url: "https://www.nbs.gov.sc/",
                },
              },
              comoros: {
                name: "Comores",
                item: {
                  name: "Centre National de la Statistique et des Études Économiques",
                  url: "https://www.comstat.org/",
                },
              },
              southSudan: {
                name: "Soudan du Sud",
                item: {
                  name: "Données ONU + CIA",
                },
              },
            },
          },
          southernAfrica: {
            title: "Afrique Australe",
            countries: {
              southAfrica: {
                name: "Afrique du Sud",
                item: {
                  name: "Statistics South Africa (Stats SA)",
                  url: "https://www.statssa.gov.za/",
                },
              },
              angola: {
                name: "Angola",
                item: {
                  name: "Instituto Nacional de Estatística",
                  url: "https://www.ine.gov.ao/",
                },
              },
              namibia: {
                name: "Namibie",
                item: {
                  name: "Namibia Statistics Agency",
                  url: "https://nsa.org.na/",
                },
              },
              botswana: {
                name: "Botswana",
                item: {
                  name: "Statistics Botswana",
                  url: "https://www.statsbots.org.bw/",
                },
              },
              zimbabwe: {
                name: "Zimbabwe",
                item: {
                  name: "Zimbabwe National Statistics Agency (ZIMSTAT)",
                  url: "https://www.zimstat.org.zw/",
                },
              },
              zambia: {
                name: "Zambie",
                item: {
                  name: "Zambia Statistics Agency (ZamStats)",
                  url: "https://www.zamstats.gov.zm/",
                },
              },
              lesotho: {
                name: "Lesotho",
                item: {
                  name: "Bureau of Statistics Lesotho",
                  url: "https://www.bos.gov.ls/",
                },
              },
              eswatini: {
                name: "Eswatini",
                item: {
                  name: "Eswatini Central Statistical Office",
                  url: "https://www.gov.sz/",
                },
              },
            },
          },
        },
        academic: {
          title: "Sources académiques & linguistiques",
          ethnologue: {
            name: "Ethnologue — Languages of the World",
            description: "Pour les correspondances ethnies ↔ langues",
            url: "https://www.ethnologue.com/",
          },
          joshuaProject: {
            name: "Joshua Project",
            description:
              "Pour diversité ethnolinguistique (à utiliser avec prudence car orientation religieuse)",
            url: "https://joshuaproject.net/",
          },
          journals: {
            title: "African Studies Journals",
            items: [
              "Journal of African History — Cambridge University Press",
              "African Studies Review — Cambridge",
              "Cahiers d'Études Africaines — EHESS",
              "Journal of Modern African Studies",
            ],
          },
          unesco: {
            name: "UNESCO — General History of Africa (8 volumes)",
            url: "https://unesdoc.unesco.org/ark:/48223/pf0000109309",
          },
        },
        complementary: {
          title: "Sources complémentaires (démographie & géopolitique)",
          worldometer: {
            name: "Worldometer (estimations population)",
            url: "https://www.worldometers.info/world-population/",
          },
          africanUnion: {
            name: "African Union (AU) — Membership & Data",
            url: "https://au.int/",
          },
          pewResearch: {
            name: "Pew Research Center (Religion & démographie)",
            url: "https://www.pewresearch.org/",
          },
        },
      },
    },
  };

  const t = content[language];

  // Helper function to render source link
  const renderSourceLink = (
    name: string,
    url?: string,
    description?: string
  ) => {
    if (url) {
      return (
        <li className="ml-4">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-primary"
          >
            {name}
          </a>
          {description && (
            <span className="text-muted-foreground ml-2">{description}</span>
          )}
        </li>
      );
    }
    return (
      <li className="ml-4">
        {name}
        {description && (
          <span className="text-muted-foreground ml-2">{description}</span>
        )}
      </li>
    );
  };

  // Helper function to render country sources
  const renderCountrySources = (
    countries: Record<
      string,
      {
        name: string;
        item: { name: string; url?: string; description?: string };
      }
    >
  ) => {
    return Object.entries(countries).map(([key, country]) => (
      <div key={key} className="mb-3">
        <strong className="font-semibold">{country.name}</strong>
        <ul className="list-disc mt-1">
          {renderSourceLink(
            country.item.name,
            country.item.url,
            country.item.description
          )}
        </ul>
      </div>
    ));
  };

  return (
    <div className="mx-auto space-y-afh-6xl text-afh-text">
      <header
        data-testid="about-overview"
        className="grid gap-afh-xl border-b border-afh-border pb-afh-2xl min-[1240px]:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] min-[1240px]:items-end min-[1240px]:gap-afh-5xl"
      >
        <div className="space-y-afh-md">
          <p className="text-afh-eyebrow font-semibold uppercase tracking-wide text-afh-fg-muted">
            {t.overview.eyebrow}
          </p>
          <h1 className="font-afh-display text-afh-hero font-black leading-none">
            {t.title}
          </h1>
          <p className="text-afh-lead font-semibold leading-relaxed">
            {t.overview.lead}
          </p>
        </div>
        <p className="border-l-2 border-afh-gold pl-afh-md text-afh-small leading-relaxed text-afh-text-soft">
          {t.overview.body}
        </p>
      </header>

      <PurposeBlocks language={language} />

      <section className="space-y-afh-xl" aria-labelledby="about-content-title">
        <div className="space-y-afh-md">
          <ChapterHeading
            id="about-content-title"
            stepLabel="01 · Le corpus"
            heading={t.contentFamilies.title}
          />
          <p className="text-afh-text-soft">{t.contentFamilies.intro}</p>
        </div>
        <ul
          data-testid="about-content-families"
          className="grid grid-cols-1 gap-afh-md min-[720px]:grid-cols-2 min-[1240px]:grid-cols-4"
          role="list"
        >
          {t.contentFamilies.items.map((family) => (
            <li
              key={family.title}
              className={`${family.accentClass} flex min-h-full flex-col border-t-2 border-[var(--accent)] bg-afh-bg-warm px-afh-md py-afh-lg`}
            >
              <h3 className="font-afh-display text-afh-h3 font-black">
                {family.title}
              </h3>
              <p className="mt-afh-sm flex-1 text-afh-small leading-relaxed text-afh-text-soft">
                {family.description}
              </p>
              {family.page && family.linkLabel ? (
                <Link
                  href={getLocalizedRoute(language, family.page)}
                  className="mt-afh-md inline-flex min-h-[44px] items-center border-t border-afh-border pt-afh-sm text-afh-small font-bold text-[var(--accent-ink)] underline decoration-[var(--accent)] underline-offset-4"
                >
                  {family.linkLabel}
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <SynthesisRail language={language} syntheses={syntheses} />

      <section
        className="about-axes-section space-y-afh-2xl"
        aria-labelledby="about-access-title"
      >
        <div className="mx-auto max-w-[1140px] space-y-afh-xl">
          <div className="space-y-afh-md">
            <ChapterHeading
              id="about-access-title"
              stepLabel="02 · Les accès"
              heading={t.accessModes.title}
            />
            <p className="text-afh-text-soft">{t.accessModes.intro}</p>
          </div>
          <ul
            data-testid="about-access-mode-list"
            className="grid grid-cols-1 gap-afh-md min-[720px]:grid-cols-3"
            role="list"
          >
            {t.accessModes.items.map((mode) => (
              <li
                key={mode.id}
                className={`${mode.accentClass} border-l-2 border-[var(--accent)] pl-afh-md text-afh-small leading-relaxed text-afh-text-soft`}
              >
                <p className="font-bold text-afh-text">
                  {ACCESS_MODE_LABELS[mode.id]}
                </p>
                <p className="mt-afh-xs">{mode.description}</p>
              </li>
            ))}
          </ul>
        </div>
        <AccessAxes
          language={language}
          counts={counts}
          modulesByAxis={modulesByAxis}
        />
        <style>{`
          .about-axes-section {
            background: var(--afh-bg);
            padding: 30px 20px 44px;
            width: 100vw;
            margin-left: calc(50% - 50vw);
            margin-right: calc(50% - 50vw);
          }
          @media (min-width: 720px) {
            .about-axes-section { padding: 40px 24px 60px; }
          }
        `}</style>
      </section>

      <section
        data-testid="about-doctrine-distinction"
        className="grid gap-afh-xl bg-afh-bg-warm p-afh-lg min-[720px]:p-afh-xl min-[1240px]:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] min-[1240px]:items-start min-[1240px]:gap-afh-5xl"
        aria-labelledby="about-doctrine-title"
      >
        <ChapterHeading
          id="about-doctrine-title"
          stepLabel="03 · La méthode"
          heading={t.doctrine.title}
        />
        <div className="space-y-afh-md text-afh-small leading-relaxed">
          <p>{t.doctrine.project}</p>
          <p className="font-semibold">{t.doctrine.method}</p>
          <Link
            href={getLocalizedRoute(language, "doctrine")}
            className="inline-flex min-h-[44px] items-center border-b-2 border-afh-gold font-bold text-afh-text no-underline"
          >
            {t.doctrine.linkLabel}
          </Link>
        </div>
      </section>

      {/* Section Sources */}
      <section className="space-y-afh-xl">
        <div>
          <ChapterHeading stepLabel="04 · Sources" heading={t.sources.title} />
          <p className="mt-afh-sm text-afh-small italic text-afh-text-soft">
            {t.sources.intro}
          </p>
        </div>

        {/* International Sources */}
        <div className="space-y-4">
          <h3 className="text-afh-h2 font-semibold">
            {t.sources.international.title}
          </h3>

          {/* UN */}
          <div className="ml-4 space-y-2">
            <p className="font-semibold">{t.sources.international.un.title}</p>
            <ul className="list-disc space-y-1">
              {renderSourceLink(
                t.sources.international.un.item1.name,
                t.sources.international.un.item1.url,
                t.sources.international.un.item1.description
              )}
              {renderSourceLink(
                t.sources.international.un.item2.name,
                t.sources.international.un.item2.url
              )}
            </ul>
          </div>

          {/* CIA */}
          <div className="ml-4 space-y-2">
            <p className="font-semibold">{t.sources.international.cia.title}</p>
            <p className="text-afh-small text-muted-foreground italic">
              {t.sources.international.cia.description}
            </p>
            <ul className="list-disc space-y-1">
              {renderSourceLink(
                t.sources.international.cia.item1.name,
                t.sources.international.cia.item1.url
              )}
              {renderSourceLink(
                t.sources.international.cia.item2.name,
                t.sources.international.cia.item2.url,
                t.sources.international.cia.item2.description
              )}
            </ul>
          </div>

          {/* World Bank */}
          <div className="ml-4 space-y-2">
            <p className="font-semibold">
              {t.sources.international.worldBank.title}
            </p>
            <ul className="list-disc space-y-1">
              {renderSourceLink(
                t.sources.international.worldBank.item1.name,
                t.sources.international.worldBank.item1.url
              )}
              {renderSourceLink(
                t.sources.international.worldBank.item2.name,
                t.sources.international.worldBank.item2.url
              )}
            </ul>
          </div>

          {/* UNESCO */}
          <div className="ml-4 space-y-2">
            <p className="font-semibold">
              {t.sources.international.unesco.title}
            </p>
            <ul className="list-disc space-y-1">
              {renderSourceLink(
                t.sources.international.unesco.item1.name,
                t.sources.international.unesco.item1.url
              )}
            </ul>
          </div>
        </div>

        {/* Regional Sources */}
        <div className="space-y-6">
          <h3 className="text-afh-h2 font-semibold">
            {t.sources.regional.title}
          </h3>

          {/* North Africa */}
          <div className="ml-4 space-y-3">
            <p className="text-afh-h3 font-semibold">
              {t.sources.regional.northAfrica.title}
            </p>
            {renderCountrySources(t.sources.regional.northAfrica.countries)}
          </div>

          {/* West Africa */}
          <div className="ml-4 space-y-3">
            <p className="text-afh-h3 font-semibold">
              {t.sources.regional.westAfrica.title}
            </p>
            {renderCountrySources(t.sources.regional.westAfrica.countries)}
          </div>

          {/* Central Africa */}
          <div className="ml-4 space-y-3">
            <p className="text-afh-h3 font-semibold">
              {t.sources.regional.centralAfrica.title}
            </p>
            {renderCountrySources(t.sources.regional.centralAfrica.countries)}
          </div>

          {/* East Africa */}
          <div className="ml-4 space-y-3">
            <p className="text-afh-h3 font-semibold">
              {t.sources.regional.eastAfrica.title}
            </p>
            {renderCountrySources(t.sources.regional.eastAfrica.countries)}
          </div>

          {/* Southern Africa */}
          <div className="ml-4 space-y-3">
            <p className="text-afh-h3 font-semibold">
              {t.sources.regional.southernAfrica.title}
            </p>
            {renderCountrySources(t.sources.regional.southernAfrica.countries)}
          </div>
        </div>

        {/* Academic Sources */}
        <div className="space-y-4">
          <h3 className="text-afh-h2 font-semibold">
            {t.sources.academic.title}
          </h3>

          <div className="ml-4 space-y-3">
            {renderSourceLink(
              t.sources.academic.ethnologue.name,
              t.sources.academic.ethnologue.url,
              t.sources.academic.ethnologue.description
            )}

            {renderSourceLink(
              t.sources.academic.joshuaProject.name,
              t.sources.academic.joshuaProject.url,
              t.sources.academic.joshuaProject.description
            )}

            <div>
              <p className="font-semibold mb-2">
                {t.sources.academic.journals.title}
              </p>
              <ul className="list-disc space-y-1">
                {t.sources.academic.journals.items.map((journal, idx) => (
                  <li key={idx} className="ml-4">
                    {journal}
                  </li>
                ))}
              </ul>
            </div>

            {renderSourceLink(
              t.sources.academic.unesco.name,
              t.sources.academic.unesco.url
            )}
          </div>
        </div>

        {/* Complementary Sources */}
        <div className="space-y-4">
          <h3 className="text-afh-h2 font-semibold">
            {t.sources.complementary.title}
          </h3>

          <ul className="list-disc space-y-1 ml-4">
            {renderSourceLink(
              t.sources.complementary.worldometer.name,
              t.sources.complementary.worldometer.url
            )}
            {renderSourceLink(
              t.sources.complementary.africanUnion.name,
              t.sources.complementary.africanUnion.url
            )}
            {renderSourceLink(
              t.sources.complementary.pewResearch.name,
              t.sources.complementary.pewResearch.url
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
