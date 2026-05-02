import type { Meta, StoryObj } from "@storybook/react";
import { DemographicsChart } from "./DemographicsChart";

const meta: Meta<typeof DemographicsChart> = {
  title: "Charts/DemographicsChart",
  component: DemographicsChart,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
  argTypes: {
    type: {
      control: "select",
      options: ["byFamily", "byCountry", "peopleDistribution"],
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: "700px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof DemographicsChart>;

const familyData = [
  { name: "Bantu", value: 350000000, id: "FLG_BANTU" },
  { name: "Niger-Congo", value: 280000000, id: "FLG_NIGER_CONGO" },
  { name: "Afro-Asiatique", value: 200000000, id: "FLG_AFROASIATIQUE" },
  { name: "Nilotique", value: 90000000, id: "FLG_NILOTIQUE" },
  { name: "Khoïsan", value: 35000000, id: "FLG_KHOISAN" },
  { name: "Mandé", value: 30000000, id: "FLG_MANDE" },
  { name: "Sémitique", value: 25000000, id: "FLG_SEMITIQUE" },
];

const countryData = [
  { name: "NGA", value: 220000000 },
  { name: "ETH", value: 125000000 },
  { name: "EGY", value: 110000000 },
  { name: "COD", value: 100000000 },
  { name: "TZA", value: 65000000 },
  { name: "ZAF", value: 60000000 },
  { name: "KEN", value: 55000000 },
  { name: "UGA", value: 48000000 },
  { name: "GHA", value: 33000000 },
  { name: "MOZ", value: 32000000 },
];

const distributionData = [
  { name: "NGA", value: 50000000, percentage: 22.5 },
  { name: "BEN", value: 2200000, percentage: 12.3 },
  { name: "TGO", value: 900000, percentage: 10.8 },
  { name: "GHA", value: 500000, percentage: 1.5 },
  { name: "CMR", value: 200000, percentage: 0.8 },
];

export const ByFamily: Story = {
  args: {
    type: "byFamily",
    data: familyData,
    title: "Répartition par famille linguistique",
  },
};

export const ByCountry: Story = {
  args: {
    type: "byCountry",
    data: countryData,
    title: "Population par pays (Top 10)",
  },
};

export const PeopleDistribution: Story = {
  args: {
    type: "peopleDistribution",
    data: distributionData,
    title: "Distribution du peuple Yoruba par pays",
  },
};

export const EmptyState: Story = {
  args: {
    type: "byFamily",
    data: [],
    title: "Aucune donnée disponible",
  },
};
