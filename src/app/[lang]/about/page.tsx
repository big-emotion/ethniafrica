"use client";

import { useParams } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { PageLayout } from "@/components/layout/PageLayout";
import { useEffect } from "react";
import { Language } from "@/types/shared";
import Link from "next/link";
import { ATTRIBUTION_STRING } from "@/lib/brand";

export default function AboutPage() {
  const params = useParams();
  const lang = params?.lang as string;
  const { language, setLanguage } = useLanguage();

  // Sync language from URL param
  useEffect(() => {
    if (lang && ["fr"].includes(lang) && lang !== language) {
      setLanguage(lang as Language);
    }
  }, [lang, language, setLanguage]);

  const content = {
    fr: {
      title: "À propos",
      navigation: {
        title: "Navigation",
        about: "À propos du projet",
        sources: "Sources",
      },
      about: {
        title: "À propos du projet",
        text1: (
          <>
            Le <strong>Dictionnaire des Ethnies d&apos;Afrique</strong> est un
            projet personnel dont l&apos;objectif est de{" "}
            <strong>
              rendre accessibles et claires les informations sur les peuples
              d&apos;Afrique
            </strong>
            .
          </>
        ),
        text2: (
          <>
            Avant les nations et les États, il y avait des ethnies, des peuples
            et des royaumes. L&apos;histoire et les frontières les ont parfois
            effacés, mais ces peuples existent toujours et continuent de
            transmettre leurs langues, leurs cultures et leurs traditions.
          </>
        ),
        text3:
          "Aujourd'hui, je collecte progressivement les informations disponibles pour les organiser dans ce dictionnaire.",
        text4: (
          <>
            Le travail est long, car il est{" "}
            <strong>
              difficile de trouver des données fiables sur l&apos;Afrique
            </strong>
            , mais le but est de centraliser ce savoir et de le rendre simple à
            consulter.
          </>
        ),
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
      footer: ATTRIBUTION_STRING,
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
    <PageLayout
      language={language}
      onLanguageChange={setLanguage}
      hideHeader={true}
    >
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-3xl font-display font-bold">{t.title}</h1>

        {/* Section About */}
        <section className="space-y-4">
          <h2 className="text-2xl font-display font-bold">{t.about.title}</h2>
          <p>{t.about.text1}</p>
          <p>{t.about.text2}</p>
          <p>{t.about.text3}</p>
          <p>{t.about.text4}</p>
        </section>

        {/* Section Sources */}
        <section className="space-y-6">
          <div>
            <h2 className="text-2xl font-display font-bold mb-2">
              {t.sources.title}
            </h2>
            <p className="text-muted-foreground italic">{t.sources.intro}</p>
          </div>

          {/* International Sources */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">
              {t.sources.international.title}
            </h3>

            {/* UN */}
            <div className="ml-4 space-y-2">
              <h4 className="font-semibold">
                {t.sources.international.un.title}
              </h4>
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
              <h4 className="font-semibold">
                {t.sources.international.cia.title}
              </h4>
              <p className="text-sm text-muted-foreground italic">
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
              <h4 className="font-semibold">
                {t.sources.international.worldBank.title}
              </h4>
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
              <h4 className="font-semibold">
                {t.sources.international.unesco.title}
              </h4>
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
            <h3 className="text-xl font-semibold">
              {t.sources.regional.title}
            </h3>

            {/* North Africa */}
            <div className="ml-4 space-y-3">
              <h4 className="text-lg font-semibold">
                {t.sources.regional.northAfrica.title}
              </h4>
              {renderCountrySources(t.sources.regional.northAfrica.countries)}
            </div>

            {/* West Africa */}
            <div className="ml-4 space-y-3">
              <h4 className="text-lg font-semibold">
                {t.sources.regional.westAfrica.title}
              </h4>
              {renderCountrySources(t.sources.regional.westAfrica.countries)}
            </div>

            {/* Central Africa */}
            <div className="ml-4 space-y-3">
              <h4 className="text-lg font-semibold">
                {t.sources.regional.centralAfrica.title}
              </h4>
              {renderCountrySources(t.sources.regional.centralAfrica.countries)}
            </div>

            {/* East Africa */}
            <div className="ml-4 space-y-3">
              <h4 className="text-lg font-semibold">
                {t.sources.regional.eastAfrica.title}
              </h4>
              {renderCountrySources(t.sources.regional.eastAfrica.countries)}
            </div>

            {/* Southern Africa */}
            <div className="ml-4 space-y-3">
              <h4 className="text-lg font-semibold">
                {t.sources.regional.southernAfrica.title}
              </h4>
              {renderCountrySources(
                t.sources.regional.southernAfrica.countries
              )}
            </div>
          </div>

          {/* Academic Sources */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold">
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
                <h4 className="font-semibold mb-2">
                  {t.sources.academic.journals.title}
                </h4>
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
            <h3 className="text-xl font-semibold">
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
    </PageLayout>
  );
}
