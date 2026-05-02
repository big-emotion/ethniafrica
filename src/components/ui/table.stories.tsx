import type { Meta, StoryObj } from "@storybook/react";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./table";
import { Badge } from "./badge";

const meta: Meta<typeof Table> = {
  title: "UI/Table",
  component: Table,
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};

export default meta;
type Story = StoryObj<typeof Table>;

const peoples = [
  {
    code: "PPL_YORUBA",
    name: "Yoruba",
    family: "FLG_NIGER_CONGO",
    country: "NGA",
    population: "50M+",
  },
  {
    code: "PPL_ZULU",
    name: "Zulu",
    family: "FLG_BANTU",
    country: "ZAF",
    population: "12M+",
  },
  {
    code: "PPL_AKAN",
    name: "Akan",
    family: "FLG_NIGER_CONGO",
    country: "GHA",
    population: "20M+",
  },
  {
    code: "PPL_AMHARA",
    name: "Amhara",
    family: "FLG_SEMITIQUE",
    country: "ETH",
    population: "25M+",
  },
];

export const Default: Story = {
  render: () => (
    <Table>
      <TableCaption>Liste des peuples africains référencés</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Peuple</TableHead>
          <TableHead>Famille</TableHead>
          <TableHead>Pays</TableHead>
          <TableHead className="text-right">Population</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {peoples.map((p) => (
          <TableRow key={p.code}>
            <TableCell>
              <Badge variant="outline">{p.code}</Badge>
            </TableCell>
            <TableCell className="font-medium">{p.name}</TableCell>
            <TableCell>
              <Badge variant="secondary">{p.family}</Badge>
            </TableCell>
            <TableCell>{p.country}</TableCell>
            <TableCell className="text-right">{p.population}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  ),
};

export const EmptyState: Story = {
  render: () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Code</TableHead>
          <TableHead>Peuple</TableHead>
          <TableHead>Famille</TableHead>
          <TableHead>Pays</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableRow>
          <TableCell
            colSpan={4}
            className="text-center py-8 text-muted-foreground"
          >
            Aucun peuple trouvé pour cette recherche.
          </TableCell>
        </TableRow>
      </TableBody>
    </Table>
  ),
};
