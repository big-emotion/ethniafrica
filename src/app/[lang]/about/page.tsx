"use client";

import { useParams } from "next/navigation";
import { useLanguage } from "@/hooks/use-language";
import { PageLayout } from "@/components/layout/PageLayout";
import { useEffect } from "react";
import { Language } from "@/types/shared";
import Link from "next/link";

export default function AboutPage() {
  const params = useParams();
  const lang = params?.lang as string;
  const { language, setLanguage } = useLanguage();

  // Sync language from URL param
  useEffect(() => {
    if (lang && ["en", "fr", "es", "pt"].includes(lang) && lang !== language) {
      setLanguage(lang as Language);
    }
  }, [lang, language, setLanguage]);

  const content = {
    en: {
      title: "About",
      navigation: {
        title: "Navigation",
        about: "About the project",
        sources: "Sources",
      },
      about: {
        title: "About the project",
        text1: (
          <>
            The <strong>Dictionary of African Ethnic Groups</strong> is a
            personal project whose goal is to{" "}
            <strong>make knowledge about Africa clear and accessible</strong>.
          </>
        ),
        text2: (
          <>
            Before modern nations and states, there were{" "}
            <strong>ethnic groups, peoples, and kingdoms</strong>. History and
            borders have sometimes erased them, yet these peoples still exist
            today — carrying their languages, cultures, and traditions.
          </>
        ),
        text3:
          "I am currently collecting and organizing available information to include it in this dictionary.",
        text4: (
          <>
            The work is long and challenging because it is{" "}
            <strong>difficult to find reliable data about Africa</strong>, but
            the goal is to bring this knowledge together and make it easy to
            explore.
          </>
        ),
      },
      sources: {
        title: "Sources",
        intro: "Complete bibliography — African Populations & Ethnic Groups",
        international: {
          title: "International Sources (Main)",
          un: {
            title: "UN — United Nations",
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
              "Central source for ethnic distribution by country (when available).",
            item1: {
              name: "CIA — Ethnic Groups (country comparison)",
              url: "https://www.cia.gov/the-world-factbook/field/ethnic-groups/",
            },
            item2: {
              name: "CIA — Country Profiles",
              description: "(Example: South Africa)",
              url: "https://www.cia.gov/the-world-factbook/countries/south-africa/",
            },
          },
          worldBank: {
            title: "World Bank",
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
            title: "UNESCO / Statistics Institute",
            item1: {
              name: "UNESCO Institute for Statistics",
              url: "https://uis.unesco.org/",
            },
          },
        },
        regional: {
          title: "Sources by Region (Official African Institutes)",
          northAfrica: {
            title: "North Africa",
            countries: {
              algeria: {
                name: "Algeria",
                item: {
                  name: "Office National des Statistiques (ONS), Algérie",
                  url: "http://www.ons.dz/",
                },
              },
              morocco: {
                name: "Morocco",
                item: {
                  name: "Haut-Commissariat au Plan (HCP)",
                  url: "https://www.hcp.ma/",
                },
              },
              tunisia: {
                name: "Tunisia",
                item: {
                  name: "Institut National de la Statistique (INS)",
                  url: "http://www.ins.tn/",
                },
              },
              egypt: {
                name: "Egypt",
                item: {
                  name: "Central Agency for Public Mobilization and Statistics (CAPMAS)",
                  url: "https://www.capmas.gov.eg/",
                },
              },
              libya: {
                name: "Libya",
                item: {
                  name: "No functional institute → UN & CIA data",
                },
              },
              sudan: {
                name: "Sudan",
                item: {
                  name: "Central Bureau of Statistics, Sudan",
                  url: "http://cbs.gov.sd/",
                },
              },
              mauritania: {
                name: "Mauritania",
                item: {
                  name: "Office National de la Statistique (ONS Mauritanie)",
                  url: "http://www.ons.mr/",
                },
              },
              westernSahara: {
                name: "Western Sahara",
                item: {
                  name: "Data via UN + academic reports (Hassaniennes)",
                },
              },
            },
          },
          westAfrica: {
            title: "West Africa",
            countries: {
              benin: {
                name: "Benin",
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
                name: "Gambia",
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
                name: "Guinea",
                item: {
                  name: "Institut National de la Statistique (INS Guinée)",
                  url: "https://www.stat-guinee.org/",
                },
              },
              guineaBissau: {
                name: "Guinea-Bissau",
                item: {
                  name: "Instituto Nacional de Estatística da Guiné-Bissau",
                  description: "(no functional website → UN & CIA data)",
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
                name: "Nigeria",
                item: {
                  name: "National Bureau of Statistics (NBS Nigeria)",
                  url: "https://www.nigerianstat.gov.ng/",
                },
              },
              senegal: {
                name: "Senegal",
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
            title: "Central Africa",
            countries: {
              cameroon: {
                name: "Cameroon",
                item: {
                  name: "Institut National de la Statistique (INS Cameroun)",
                  url: "https://www.statistics-cameroon.org/",
                },
              },
              centralAfricanRepublic: {
                name: "Central African Republic",
                item: {
                  name: "Institut Centrafricain de Statistique et des Études Économiques et Sociales (ICASEES)",
                  url: "https://www.icasees.org/",
                },
              },
              chad: {
                name: "Chad",
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
                name: "DRC",
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
                name: "Equatorial Guinea",
                item: {
                  name: "CIA + UN data",
                },
              },
              saoTome: {
                name: "São Tomé and Príncipe",
                item: {
                  name: "Instituto Nacional de Estatística (INE STP)",
                  url: "https://www.ine.st/",
                },
              },
            },
          },
          eastAfrica: {
            title: "East Africa",
            countries: {
              ethiopia: {
                name: "Ethiopia",
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
                name: "Uganda",
                item: {
                  name: "Uganda Bureau of Statistics",
                  url: "https://www.ubos.org/",
                },
              },
              tanzania: {
                name: "Tanzania",
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
                name: "Somalia",
                item: {
                  name: "UN + CIA data",
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
                name: "Eritrea",
                item: {
                  name: "UN + CIA data (no public statistics)",
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
                name: "Mauritius",
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
                name: "Comoros",
                item: {
                  name: "Centre National de la Statistique et des Études Économiques",
                  url: "https://www.comstat.org/",
                },
              },
              southSudan: {
                name: "South Sudan",
                item: {
                  name: "UN + CIA data",
                },
              },
            },
          },
          southernAfrica: {
            title: "Southern Africa",
            countries: {
              southAfrica: {
                name: "South Africa",
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
                name: "Namibia",
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
                name: "Zambia",
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
          title: "Academic & Linguistic Sources",
          ethnologue: {
            name: "Ethnologue — Languages of the World",
            description: "For ethnicity ↔ language correspondences",
            url: "https://www.ethnologue.com/",
          },
          joshuaProject: {
            name: "Joshua Project",
            description:
              "For ethnolinguistic diversity (use with caution due to religious orientation)",
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
          title: "Complementary Sources (Demographics & Geopolitics)",
          worldometer: {
            name: "Worldometer (population estimates)",
            url: "https://www.worldometers.info/world-population/",
          },
          africanUnion: {
            name: "African Union (AU) — Membership & Data",
            url: "https://au.int/",
          },
          pewResearch: {
            name: "Pew Research Center (Religion & demography)",
            url: "https://www.pewresearch.org/",
          },
        },
      },
      footer: "Made with emotion for Africa",
    },
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
      footer: "Fait avec émotion pour l'Afrique",
    },
    es: {
      title: "Acerca de",
      navigation: {
        title: "Navegación",
        about: "Acerca del proyecto",
        sources: "Fuentes",
      },
      about: {
        title: "Acerca del proyecto",
        text1: (
          <>
            El <strong>Diccionario de los Pueblos de África</strong> es un
            proyecto personal cuyo objetivo es{" "}
            <strong>
              hacer que el conocimiento sobre África sea más claro y accesible
            </strong>
            .
          </>
        ),
        text2: (
          <>
            Antes de la creación de las naciones y los estados modernos,
            existían <strong>etnias, pueblos y reinos</strong>. La historia y
            las fronteras a veces los han borrado, pero estos pueblos siguen
            existiendo, transmitiendo sus lenguas, culturas y tradiciones.
          </>
        ),
        text3:
          "Actualmente estoy recopilando y organizando la información disponible para incluirla en este diccionario.",
        text4: (
          <>
            Es un trabajo largo y complejo, ya que es{" "}
            <strong>difícil encontrar datos fiables sobre África</strong>, pero
            la meta es reunir este conocimiento y presentarlo de forma sencilla.
          </>
        ),
      },
      sources: {
        title: "Fuentes",
        intro: "Bibliografía completa — Poblaciones y Etnias de África",
        international: {
          title: "Fuentes internacionales (principales)",
          un: {
            title: "ONU — Naciones Unidas",
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
              "Fuente central para la distribución étnica por país (cuando está disponible).",
            item1: {
              name: "CIA — Ethnic Groups (country comparison)",
              url: "https://www.cia.gov/the-world-factbook/field/ethnic-groups/",
            },
            item2: {
              name: "CIA — Country Profiles",
              description: "(Ejemplo: Sudáfrica)",
              url: "https://www.cia.gov/the-world-factbook/countries/south-africa/",
            },
          },
          worldBank: {
            title: "Banco Mundial",
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
            title: "UNESCO / Instituto de Estadística",
            item1: {
              name: "UNESCO Institute for Statistics",
              url: "https://uis.unesco.org/",
            },
          },
        },
        regional: {
          title: "Fuentes por región (institutos oficiales africanos)",
          northAfrica: {
            title: "África del Norte",
            countries: {
              algeria: {
                name: "Argelia",
                item: {
                  name: "Office National des Statistiques (ONS), Algérie",
                  url: "http://www.ons.dz/",
                },
              },
              morocco: {
                name: "Marruecos",
                item: {
                  name: "Haut-Commissariat au Plan (HCP)",
                  url: "https://www.hcp.ma/",
                },
              },
              tunisia: {
                name: "Túnez",
                item: {
                  name: "Institut National de la Statistique (INS)",
                  url: "http://www.ins.tn/",
                },
              },
              egypt: {
                name: "Egipto",
                item: {
                  name: "Central Agency for Public Mobilization and Statistics (CAPMAS)",
                  url: "https://www.capmas.gov.eg/",
                },
              },
              libya: {
                name: "Libia",
                item: { name: "No hay instituto funcional → datos ONU y CIA" },
              },
              sudan: {
                name: "Sudán",
                item: {
                  name: "Central Bureau of Statistics, Sudan",
                  url: "http://cbs.gov.sd/",
                },
              },
              mauritania: {
                name: "Mauritania",
                item: {
                  name: "Office National de la Statistique (ONS Mauritanie)",
                  url: "http://www.ons.mr/",
                },
              },
              westernSahara: {
                name: "Sahara Occidental",
                item: {
                  name: "Datos vía ONU + informes académicos (Hassaniennes)",
                },
              },
            },
          },
          westAfrica: {
            title: "África Occidental",
            countries: {
              benin: {
                name: "Benín",
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
                name: "Costa de Marfil",
                item: {
                  name: "Institut National de la Statistique (INS Côte d'Ivoire)",
                  url: "https://www.ins.ci/",
                },
              },
              gambia: {
                name: "Gambia",
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
                name: "Guinea",
                item: {
                  name: "Institut National de la Statistique (INS Guinée)",
                  url: "https://www.stat-guinee.org/",
                },
              },
              guineaBissau: {
                name: "Guinea-Bisáu",
                item: {
                  name: "Instituto Nacional de Estatística da Guiné-Bissau",
                  description: "(no hay sitio web funcional → datos ONU y CIA)",
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
                name: "Níger",
                item: {
                  name: "Institut National de la Statistique (INS Niger)",
                  url: "https://www.stat-niger.org/",
                },
              },
              nigeria: {
                name: "Nigeria",
                item: {
                  name: "National Bureau of Statistics (NBS Nigeria)",
                  url: "https://www.nigerianstat.gov.ng/",
                },
              },
              senegal: {
                name: "Senegal",
                item: {
                  name: "Agence Nationale de la Statistique et de la Démographie (ANSD)",
                  url: "https://www.ansd.sn/",
                },
              },
              sierraLeone: {
                name: "Sierra Leona",
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
            title: "África Central",
            countries: {
              cameroon: {
                name: "Camerún",
                item: {
                  name: "Institut National de la Statistique (INS Cameroun)",
                  url: "https://www.statistics-cameroon.org/",
                },
              },
              centralAfricanRepublic: {
                name: "República Centroafricana",
                item: {
                  name: "Institut Centrafricain de Statistique et des Études Économiques et Sociales (ICASEES)",
                  url: "https://www.icasees.org/",
                },
              },
              chad: {
                name: "Chad",
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
                name: "Gabón",
                item: {
                  name: "Direction Générale de la Statistique (DGS)",
                  url: "https://dge-gabon.org/",
                },
              },
              equatorialGuinea: {
                name: "Guinea Ecuatorial",
                item: { name: "Datos CIA + ONU" },
              },
              saoTome: {
                name: "Santo Tomé y Príncipe",
                item: {
                  name: "Instituto Nacional de Estatística (INE STP)",
                  url: "https://www.ine.st/",
                },
              },
            },
          },
          eastAfrica: {
            title: "África del Este",
            countries: {
              ethiopia: {
                name: "Etiopía",
                item: {
                  name: "Central Statistical Agency (CSA)",
                  url: "https://www.statsethiopia.gov.et/",
                },
              },
              kenya: {
                name: "Kenia",
                item: {
                  name: "Kenya National Bureau of Statistics",
                  url: "https://www.knbs.or.ke/",
                },
              },
              uganda: {
                name: "Uganda",
                item: {
                  name: "Uganda Bureau of Statistics",
                  url: "https://www.ubos.org/",
                },
              },
              tanzania: {
                name: "Tanzania",
                item: {
                  name: "National Bureau of Statistics Tanzania",
                  url: "https://www.nbs.go.tz/",
                },
              },
              rwanda: {
                name: "Ruanda",
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
              somalia: { name: "Somalia", item: { name: "Datos ONU + CIA" } },
              djibouti: {
                name: "Yibuti",
                item: {
                  name: "Institut de la Statistique de Djibouti",
                  url: "https://www.stat.dj/",
                },
              },
              eritrea: {
                name: "Eritrea",
                item: {
                  name: "Datos ONU + CIA (no hay estadísticas públicas)",
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
                name: "Malaui",
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
                name: "Mauricio",
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
                name: "Comoras",
                item: {
                  name: "Centre National de la Statistique et des Études Économiques",
                  url: "https://www.comstat.org/",
                },
              },
              southSudan: {
                name: "Sudán del Sur",
                item: { name: "Datos ONU + CIA" },
              },
            },
          },
          southernAfrica: {
            title: "África Austral",
            countries: {
              southAfrica: {
                name: "Sudáfrica",
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
                name: "Namibia",
                item: {
                  name: "Namibia Statistics Agency",
                  url: "https://nsa.org.na/",
                },
              },
              botswana: {
                name: "Botsuana",
                item: {
                  name: "Statistics Botswana",
                  url: "https://www.statsbots.org.bw/",
                },
              },
              zimbabwe: {
                name: "Zimbabue",
                item: {
                  name: "Zimbabwe National Statistics Agency (ZIMSTAT)",
                  url: "https://www.zimstat.org.zw/",
                },
              },
              zambia: {
                name: "Zambia",
                item: {
                  name: "Zambia Statistics Agency (ZamStats)",
                  url: "https://www.zamstats.gov.zm/",
                },
              },
              lesotho: {
                name: "Lesoto",
                item: {
                  name: "Bureau of Statistics Lesotho",
                  url: "https://www.bos.gov.ls/",
                },
              },
              eswatini: {
                name: "Esuatini",
                item: {
                  name: "Eswatini Central Statistical Office",
                  url: "https://www.gov.sz/",
                },
              },
            },
          },
        },
        academic: {
          title: "Fuentes académicas y lingüísticas",
          ethnologue: {
            name: "Ethnologue — Languages of the World",
            description: "Para correspondencias etnias ↔ lenguas",
            url: "https://www.ethnologue.com/",
          },
          joshuaProject: {
            name: "Joshua Project",
            description:
              "Para diversidad etnolingüística (usar con precaución debido a orientación religiosa)",
            url: "https://joshuaproject.net/",
          },
          journals: {
            title: "Revistas de Estudios Africanos",
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
          title: "Fuentes complementarias (demografía y geopolítica)",
          worldometer: {
            name: "Worldometer (estimaciones de población)",
            url: "https://www.worldometers.info/world-population/",
          },
          africanUnion: {
            name: "African Union (AU) — Membership & Data",
            url: "https://au.int/",
          },
          pewResearch: {
            name: "Pew Research Center (Religión y demografía)",
            url: "https://www.pewresearch.org/",
          },
        },
      },
      footer: "Hecho con emoción para África",
    },
    pt: {
      title: "Sobre",
      navigation: {
        title: "Navegação",
        about: "Sobre o projeto",
        sources: "Fontes",
      },
      about: {
        title: "Sobre o projeto",
        text1: (
          <>
            O <strong>Dicionário dos Povos da África</strong> é um projeto
            pessoal com o objetivo de{" "}
            <strong>
              tornar o conhecimento sobre a África mais claro e acessível
            </strong>
            .
          </>
        ),
        text2: (
          <>
            Antes da criação das nações e dos estados modernos, existiam{" "}
            <strong>etnias, povos e reinos</strong>. A história e as fronteiras,
            por vezes, os apagaram, mas esses povos ainda existem, preservando
            suas línguas, culturas e tradições.
          </>
        ),
        text3:
          "Atualmente, estou coletando e organizando informações disponíveis para incluí-las neste dicionário.",
        text4: (
          <>
            É um trabalho demorado, pois é{" "}
            <strong>difícil encontrar dados confiáveis sobre a África</strong>,
            mas a meta é reunir esse conhecimento e torná-lo fácil de explorar.
          </>
        ),
      },
      sources: {
        title: "Fontes",
        intro: "Bibliografia completa — Populações e Etnias da África",
        international: {
          title: "Fontes internacionais (principais)",
          un: {
            title: "ONU — Nações Unidas",
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
              "Fonte central para distribuição étnica por país (quando disponível).",
            item1: {
              name: "CIA — Ethnic Groups (country comparison)",
              url: "https://www.cia.gov/the-world-factbook/field/ethnic-groups/",
            },
            item2: {
              name: "CIA — Country Profiles",
              description: "(Exemplo: África do Sul)",
              url: "https://www.cia.gov/the-world-factbook/countries/south-africa/",
            },
          },
          worldBank: {
            title: "Banco Mundial",
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
            title: "UNESCO / Instituto de Estatística",
            item1: {
              name: "UNESCO Institute for Statistics",
              url: "https://uis.unesco.org/",
            },
          },
        },
        regional: {
          title: "Fontes por região (institutos oficiais africanos)",
          northAfrica: {
            title: "África do Norte",
            countries: {
              algeria: {
                name: "Argélia",
                item: {
                  name: "Office National des Statistiques (ONS), Algérie",
                  url: "http://www.ons.dz/",
                },
              },
              morocco: {
                name: "Marrocos",
                item: {
                  name: "Haut-Commissariat au Plan (HCP)",
                  url: "https://www.hcp.ma/",
                },
              },
              tunisia: {
                name: "Tunísia",
                item: {
                  name: "Institut National de la Statistique (INS)",
                  url: "http://www.ins.tn/",
                },
              },
              egypt: {
                name: "Egito",
                item: {
                  name: "Central Agency for Public Mobilization and Statistics (CAPMAS)",
                  url: "https://www.capmas.gov.eg/",
                },
              },
              libya: {
                name: "Líbia",
                item: { name: "Não há instituto funcional → dados ONU e CIA" },
              },
              sudan: {
                name: "Sudão",
                item: {
                  name: "Central Bureau of Statistics, Sudan",
                  url: "http://cbs.gov.sd/",
                },
              },
              mauritania: {
                name: "Mauritânia",
                item: {
                  name: "Office National de la Statistique (ONS Mauritanie)",
                  url: "http://www.ons.mr/",
                },
              },
              westernSahara: {
                name: "Saara Ocidental",
                item: {
                  name: "Dados via ONU + relatórios acadêmicos (Hassaniennes)",
                },
              },
            },
          },
          westAfrica: {
            title: "África Ocidental",
            countries: {
              benin: {
                name: "Benim",
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
                name: "Costa do Marfim",
                item: {
                  name: "Institut National de la Statistique (INS Côte d'Ivoire)",
                  url: "https://www.ins.ci/",
                },
              },
              gambia: {
                name: "Gâmbia",
                item: {
                  name: "Gambia Bureau of Statistics",
                  url: "https://www.gbosdata.org/",
                },
              },
              ghana: {
                name: "Gana",
                item: {
                  name: "Ghana Statistical Service",
                  url: "https://statsghana.gov.gh/",
                },
              },
              guinea: {
                name: "Guiné",
                item: {
                  name: "Institut National de la Statistique (INS Guinée)",
                  url: "https://www.stat-guinee.org/",
                },
              },
              guineaBissau: {
                name: "Guiné-Bissau",
                item: {
                  name: "Instituto Nacional de Estatística da Guiné-Bissau",
                  description: "(não há site funcional → dados ONU e CIA)",
                },
              },
              liberia: {
                name: "Libéria",
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
                name: "Níger",
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
                name: "Senegal",
                item: {
                  name: "Agence Nationale de la Statistique et de la Démographie (ANSD)",
                  url: "https://www.ansd.sn/",
                },
              },
              sierraLeone: {
                name: "Serra Leoa",
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
            title: "África Central",
            countries: {
              cameroon: {
                name: "Camarões",
                item: {
                  name: "Institut National de la Statistique (INS Cameroun)",
                  url: "https://www.statistics-cameroon.org/",
                },
              },
              centralAfricanRepublic: {
                name: "República Centro-Africana",
                item: {
                  name: "Institut Centrafricain de Statistique et des Études Économiques et Sociales (ICASEES)",
                  url: "https://www.icasees.org/",
                },
              },
              chad: {
                name: "Chade",
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
                name: "Gabão",
                item: {
                  name: "Direction Générale de la Statistique (DGS)",
                  url: "https://dge-gabon.org/",
                },
              },
              equatorialGuinea: {
                name: "Guiné Equatorial",
                item: { name: "Dados CIA + ONU" },
              },
              saoTome: {
                name: "São Tomé e Príncipe",
                item: {
                  name: "Instituto Nacional de Estatística (INE STP)",
                  url: "https://www.ine.st/",
                },
              },
            },
          },
          eastAfrica: {
            title: "África Oriental",
            countries: {
              ethiopia: {
                name: "Etiópia",
                item: {
                  name: "Central Statistical Agency (CSA)",
                  url: "https://www.statsethiopia.gov.et/",
                },
              },
              kenya: {
                name: "Quênia",
                item: {
                  name: "Kenya National Bureau of Statistics",
                  url: "https://www.knbs.or.ke/",
                },
              },
              uganda: {
                name: "Uganda",
                item: {
                  name: "Uganda Bureau of Statistics",
                  url: "https://www.ubos.org/",
                },
              },
              tanzania: {
                name: "Tanzânia",
                item: {
                  name: "National Bureau of Statistics Tanzania",
                  url: "https://www.nbs.go.tz/",
                },
              },
              rwanda: {
                name: "Ruanda",
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
              somalia: { name: "Somália", item: { name: "Dados ONU + CIA" } },
              djibouti: {
                name: "Djibuti",
                item: {
                  name: "Institut de la Statistique de Djibouti",
                  url: "https://www.stat.dj/",
                },
              },
              eritrea: {
                name: "Eritreia",
                item: {
                  name: "Dados ONU + CIA (não há estatísticas públicas)",
                },
              },
              madagascar: {
                name: "Madagáscar",
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
                name: "Moçambique",
                item: {
                  name: "Instituto Nacional de Estatística",
                  url: "http://www.ine.gov.mz/",
                },
              },
              mauritius: {
                name: "Maurício",
                item: {
                  name: "Statistics Mauritius",
                  url: "https://statsmauritius.govmu.org/",
                },
              },
              seychelles: {
                name: "Seicheles",
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
                name: "Sudão do Sul",
                item: { name: "Dados ONU + CIA" },
              },
            },
          },
          southernAfrica: {
            title: "África Austral",
            countries: {
              southAfrica: {
                name: "África do Sul",
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
                name: "Namíbia",
                item: {
                  name: "Namibia Statistics Agency",
                  url: "https://nsa.org.na/",
                },
              },
              botswana: {
                name: "Botsuana",
                item: {
                  name: "Statistics Botswana",
                  url: "https://www.statsbots.org.bw/",
                },
              },
              zimbabwe: {
                name: "Zimbábue",
                item: {
                  name: "Zimbabwe National Statistics Agency (ZIMSTAT)",
                  url: "https://www.zimstat.org.zw/",
                },
              },
              zambia: {
                name: "Zâmbia",
                item: {
                  name: "Zambia Statistics Agency (ZamStats)",
                  url: "https://www.zamstats.gov.zm/",
                },
              },
              lesotho: {
                name: "Lesoto",
                item: {
                  name: "Bureau of Statistics Lesotho",
                  url: "https://www.bos.gov.ls/",
                },
              },
              eswatini: {
                name: "Essuatíni",
                item: {
                  name: "Eswatini Central Statistical Office",
                  url: "https://www.gov.sz/",
                },
              },
            },
          },
        },
        academic: {
          title: "Fontes acadêmicas e linguísticas",
          ethnologue: {
            name: "Ethnologue — Languages of the World",
            description: "Para correspondências etnias ↔ línguas",
            url: "https://www.ethnologue.com/",
          },
          joshuaProject: {
            name: "Joshua Project",
            description:
              "Para diversidade etnolinguística (usar com cautela devido à orientação religiosa)",
            url: "https://joshuaproject.net/",
          },
          journals: {
            title: "Revistas de Estudos Africanos",
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
          title: "Fontes complementares (demografia e geopolítica)",
          worldometer: {
            name: "Worldometer (estimativas de população)",
            url: "https://www.worldometers.info/world-population/",
          },
          africanUnion: {
            name: "African Union (AU) — Membership & Data",
            url: "https://au.int/",
          },
          pewResearch: {
            name: "Pew Research Center (Religião e demografia)",
            url: "https://www.pewresearch.org/",
          },
        },
      },
      footer: "Feito com emoção para a África",
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
