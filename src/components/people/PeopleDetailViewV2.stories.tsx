import type { Meta, StoryObj } from "@storybook/react";
import { AutonymExonymHeading } from "@/components/ui/AutonymExonymHeading";
import { PeopleHero } from "./PeopleHero";
import { PeopleOriginBlock } from "./PeopleOriginBlock";
import { PeopleLanguageSection } from "./PeopleLanguageSection";
import { PeopleHistoryTimeline } from "./PeopleHistoryTimeline";
import { PeopleCultureGrid } from "./PeopleCultureGrid";
import { PeopleRelatedPeoplesSection } from "./PeopleRelatedPeoplesSection";
import { PeopleCountriesSection } from "./PeopleCountriesSection";
import { PeopleSourcesFooter } from "./PeopleSourcesFooter";
import type {
  PeopleHeroData,
  PeopleOriginData,
  PeopleLanguageData,
  PeopleHistoryData,
  PeopleCultureData,
  PeopleRelatedData,
  PeopleCountriesData,
} from "@/lib/peopleDataTransformer";

// ==========================================
// Viewport config — 430 / 720 / 1200 px
// ==========================================

const viewports = {
  mobile430: {
    name: "Mobile 430 px",
    styles: { width: "430px", height: "900px" },
  },
  tablet720: {
    name: "Tablet 720 px",
    styles: { width: "720px", height: "1024px" },
  },
  desktop1200: {
    name: "Desktop 1200 px",
    styles: { width: "1200px", height: "900px" },
  },
};

// ==========================================
// Fixtures — Peuple Yoruba (representative)
// ==========================================

const yorubaHero: PeopleHeroData = {
  peopleId: "PPL_YORUBA",
  nameMain: "Yoruba",
  selfAppellation: "Ọmọ Oòduà · Yorùbá",
  exonyms: ["Yariba", "Ioruba", "Yaruba"],
  languageFamilyId: "FLG_NIGER_CONGO",
  languageFamilyName: "Niger-Congo",
  currentCountries: ["NGA", "BEN", "TGO", "GHA"],
  classificationStatus: null,
};

const origin: PeopleOriginData = {
  ancientOrigins:
    "Peuple originaire d'Ile-Ife (Nigeria actuel), berceau de la civilisation yoruba.",
  formationPeriod: "VIIe–IXe siècle",
  migrationRoutes: [
    "Expansion depuis Ile-Ife vers Oyo (nord-ouest)",
    "Migrations vers la côte — Lagos, Badagry",
    "Diaspora atlantique (XVIIe–XIXe siècle)",
  ],
  historicalSettlementZones: ["Île-Ifẹ̀", "Oyo", "Lagos", "Ibadan", "Kétou"],
  externalInfluences:
    "Contacts avec les Hausa, les Fulani et l'empire du Mali.",
};

const language: PeopleLanguageData = {
  mainLanguage: "Yoruba (Yorùbá)",
  isoCodes: ["yor"],
  dialects: ["Ìjẹ̀bú", "Ẹ̀gbá", "Ẹ̀kìtì", "Ọ̀yọ́", "Ìfẹ̀"],
  vehicularRole:
    "Langue véhiculaire au Nigeria du Sud-Ouest ; enseignée à l'université.",
};

const history: PeopleHistoryData = {
  kingdomsOrChiefdoms:
    "Empire d'Oyo (XIVe–XIXe siècle), cités-états d'Ifẹ̀ et Ọ̀yọ́.",
  relationsWithNeighbors:
    "Relations commerciales avec les Hausa au nord et les Igbo à l'est.",
  conflictsOrAlliances:
    "Guerres civiles de l'empire d'Oyo (XIXe siècle) ; résistance à la colonisation britannique.",
  diaspora:
    "Forte communauté au Brésil (Candomblé), Cuba (Santería), Haïti (Vodou).",
};

const culture: PeopleCultureData = {
  supremeDeity: "Olódùmarè",
  intermediates: ["Obàtálá", "Ṣàngó", "Ọ̀ṣun", "Ògún", "Yemọja"],
  initiation: "Culte Ògún (initiation masculine par le travail du fer)",
  funerary: "Cérémonie Ẹẹgúngún (masques ancestraux)",
  symbols: ["Àdìrẹ cloth", "Ìlẹkẹ̀ beads", "Ẹẹgúngún mask"],
  music: "Dundun (talking drum), bata, sekere",
  gastronomy: "Egusi soup, amala, jollof rice",
  christianityPercentage: 45,
  islamPercentage: 50,
  syncretism:
    "Pratique simultanée de l'Islam/Christianisme et de cultes traditionnels (Ifá).",
};

const relatedPeoples: PeopleRelatedData = {
  ethnicities: ["Ìjẹ̀bú", "Ẹ̀gbá", "Ọ̀yọ́", "Ẹ̀kìtì", "Ìgbómìnà"],
  politicalSystem: "Monarchie traditionnelle sous un Oba (roi sacré)",
  clanOrganization:
    "Clans patrilinéaires (idile) organisés en quartiers (àdúgbò)",
  ageClassSystems: "Grades d'âge (ẹgbẹ) structurant la vie sociale et rituelle",
};

const countries: PeopleCountriesData = {
  totalPopulation: 50000000,
  totalPopulationFormatted: "50M",
  referenceYear: 2025,
  distributions: [
    {
      country: "NGA",
      population: 45000000,
      populationFormatted: "45M",
      percentage: 90,
    },
    {
      country: "BEN",
      population: 2500000,
      populationFormatted: "2.5M",
      percentage: 5,
    },
    {
      country: "TGO",
      population: 1500000,
      populationFormatted: "1.5M",
      percentage: 3,
    },
    {
      country: "GHA",
      population: 1000000,
      populationFormatted: "1M",
      percentage: 2,
    },
  ],
  source: "SIL Ethnologue 2025 · UNFPA 2024",
};

// ==========================================
// Meta — use AutonymExonymHeading as root component
// (each story renders arbitrary section components via render())
// ==========================================

const meta: Meta<typeof AutonymExonymHeading> = {
  title: "People/FicheSections",
  component: AutonymExonymHeading,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    viewport: { viewports },
    a11y: { config: { rules: [{ id: "color-contrast", enabled: true }] } },
  },
};

export default meta;
type Story = StoryObj<typeof AutonymExonymHeading>;

// ==========================================
// Wrapper helpers
// ==========================================

function HeroBg({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background:
          "linear-gradient(165deg, #2b5f7a 0%, #1b3d52 50%, #0f2535 100%)",
        padding: "24px",
        borderRadius: "20px",
        margin: "12px",
      }}
    >
      {children}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "var(--country-card, #fff)",
        border: "1px solid var(--country-border, #e8dfd3)",
        borderRadius: "16px",
        padding: "18px",
        maxWidth: "800px",
        margin: "12px auto",
      }}
    >
      {children}
    </div>
  );
}

// ==========================================
// AutonymExonymHeading — 430 / 720 / 1200
// ==========================================

export const AutonymHeading_Mobile: Story = {
  name: "AutonymExonymHeading — 430px",
  parameters: { viewport: { defaultViewport: "mobile430" } },
  render: () => (
    <HeroBg>
      <AutonymExonymHeading
        nameMain="Yoruba"
        autonym="Ọmọ Oòduà · Yorùbá"
        exonyms={["Yariba", "Ioruba", "Yaruba"]}
        variant="people-hero"
      />
    </HeroBg>
  ),
};

export const AutonymHeading_Tablet: Story = {
  name: "AutonymExonymHeading — 720px",
  parameters: { viewport: { defaultViewport: "tablet720" } },
  render: AutonymHeading_Mobile.render,
};

export const AutonymHeading_Desktop: Story = {
  name: "AutonymExonymHeading — 1200px",
  parameters: { viewport: { defaultViewport: "desktop1200" } },
  render: AutonymHeading_Mobile.render,
};

// ==========================================
// PeopleHero — 430 / 720 / 1200
// ==========================================

export const Hero_Mobile: Story = {
  name: "PeopleHero — 430px",
  parameters: { viewport: { defaultViewport: "mobile430" } },
  render: () => (
    <div style={{ background: "hsl(35,35%,97%)", minHeight: "100vh" }}>
      <PeopleHero
        data={yorubaHero}
        onBack={() => {}}
        onFlagCtaClick={() => {}}
        confidenceScore={null}
        sourceCount={null}
        lastHumanAuditAt={null}
      />
    </div>
  ),
};

export const Hero_Tablet: Story = {
  name: "PeopleHero — 720px",
  parameters: { viewport: { defaultViewport: "tablet720" } },
  render: Hero_Mobile.render,
};

export const Hero_Desktop: Story = {
  name: "PeopleHero — 1200px",
  parameters: { viewport: { defaultViewport: "desktop1200" } },
  render: Hero_Mobile.render,
};

// ==========================================
// PeopleOriginBlock — 430 / 720 / 1200
// ==========================================

export const Origin_Mobile: Story = {
  name: "PeopleOriginBlock — 430px",
  parameters: { viewport: { defaultViewport: "mobile430" } },
  render: () => (
    <Card>
      <PeopleOriginBlock data={origin} />
    </Card>
  ),
};

export const Origin_Tablet: Story = {
  name: "PeopleOriginBlock — 720px",
  parameters: { viewport: { defaultViewport: "tablet720" } },
  render: Origin_Mobile.render,
};

export const Origin_Desktop: Story = {
  name: "PeopleOriginBlock — 1200px",
  parameters: { viewport: { defaultViewport: "desktop1200" } },
  render: Origin_Mobile.render,
};

export const Origin_Empty: Story = {
  name: "PeopleOriginBlock — empty (calm omission, UX-DR31)",
  render: () => {
    const empty: PeopleOriginData = {
      migrationRoutes: [],
      historicalSettlementZones: [],
    };
    return (
      <div style={{ padding: "24px" }}>
        <p
          style={{
            color: "#999",
            fontSize: "12px",
            marginBottom: "8px",
            fontStyle: "italic",
          }}
        >
          Section sans données — elle s&apos;omit silencieusement (retourne
          null).
        </p>
        <PeopleOriginBlock data={empty} />
      </div>
    );
  },
};

// ==========================================
// PeopleLanguageSection — 430 / 720 / 1200
// ==========================================

export const Language_Mobile: Story = {
  name: "PeopleLanguageSection — 430px",
  parameters: { viewport: { defaultViewport: "mobile430" } },
  render: () => (
    <Card>
      <PeopleLanguageSection data={language} />
    </Card>
  ),
};

export const Language_Tablet: Story = {
  name: "PeopleLanguageSection — 720px",
  parameters: { viewport: { defaultViewport: "tablet720" } },
  render: Language_Mobile.render,
};

export const Language_Desktop: Story = {
  name: "PeopleLanguageSection — 1200px",
  parameters: { viewport: { defaultViewport: "desktop1200" } },
  render: Language_Mobile.render,
};

// ==========================================
// PeopleHistoryTimeline — 430 / 720 / 1200
// ==========================================

export const History_Mobile: Story = {
  name: "PeopleHistoryTimeline — 430px",
  parameters: { viewport: { defaultViewport: "mobile430" } },
  render: () => (
    <Card>
      <PeopleHistoryTimeline data={history} />
    </Card>
  ),
};

export const History_Tablet: Story = {
  name: "PeopleHistoryTimeline — 720px",
  parameters: { viewport: { defaultViewport: "tablet720" } },
  render: History_Mobile.render,
};

export const History_Desktop: Story = {
  name: "PeopleHistoryTimeline — 1200px",
  parameters: { viewport: { defaultViewport: "desktop1200" } },
  render: History_Mobile.render,
};

// ==========================================
// PeopleCultureGrid — 430 / 720 / 1200
// ==========================================

export const Culture_Mobile: Story = {
  name: "PeopleCultureGrid — 430px",
  parameters: { viewport: { defaultViewport: "mobile430" } },
  render: () => (
    <Card>
      <PeopleCultureGrid data={culture} />
    </Card>
  ),
};

export const Culture_Tablet: Story = {
  name: "PeopleCultureGrid — 720px",
  parameters: { viewport: { defaultViewport: "tablet720" } },
  render: Culture_Mobile.render,
};

export const Culture_Desktop: Story = {
  name: "PeopleCultureGrid — 1200px",
  parameters: { viewport: { defaultViewport: "desktop1200" } },
  render: Culture_Mobile.render,
};

// ==========================================
// PeopleRelatedPeoplesSection — 430 / 720 / 1200
// ==========================================

export const Related_Mobile: Story = {
  name: "PeopleRelatedPeoplesSection — 430px",
  parameters: { viewport: { defaultViewport: "mobile430" } },
  render: () => (
    <Card>
      <PeopleRelatedPeoplesSection data={relatedPeoples} />
    </Card>
  ),
};

export const Related_Tablet: Story = {
  name: "PeopleRelatedPeoplesSection — 720px",
  parameters: { viewport: { defaultViewport: "tablet720" } },
  render: Related_Mobile.render,
};

export const Related_Desktop: Story = {
  name: "PeopleRelatedPeoplesSection — 1200px",
  parameters: { viewport: { defaultViewport: "desktop1200" } },
  render: Related_Mobile.render,
};

// ==========================================
// PeopleCountriesSection — 430 / 720 / 1200
// ==========================================

export const Countries_Mobile: Story = {
  name: "PeopleCountriesSection — 430px",
  parameters: { viewport: { defaultViewport: "mobile430" } },
  render: () => (
    <Card>
      <PeopleCountriesSection data={countries} />
    </Card>
  ),
};

export const Countries_Tablet: Story = {
  name: "PeopleCountriesSection — 720px",
  parameters: { viewport: { defaultViewport: "tablet720" } },
  render: Countries_Mobile.render,
};

export const Countries_Desktop: Story = {
  name: "PeopleCountriesSection — 1200px",
  parameters: { viewport: { defaultViewport: "desktop1200" } },
  render: Countries_Mobile.render,
};

// ==========================================
// PeopleSourcesFooter — 430 / 720 / 1200
// ==========================================

export const Sources_Mobile: Story = {
  name: "PeopleSourcesFooter — 430px",
  parameters: { viewport: { defaultViewport: "mobile430" } },
  render: () => (
    <div style={{ padding: "12px" }}>
      <PeopleSourcesFooter sources="SIL Ethnologue 2025 · UNFPA 2024 · CIA World Factbook 2024 · UNESCO 2023" />
    </div>
  ),
};

export const Sources_Tablet: Story = {
  name: "PeopleSourcesFooter — 720px",
  parameters: { viewport: { defaultViewport: "tablet720" } },
  render: Sources_Mobile.render,
};

export const Sources_Desktop: Story = {
  name: "PeopleSourcesFooter — 1200px",
  parameters: { viewport: { defaultViewport: "desktop1200" } },
  render: Sources_Mobile.render,
};
