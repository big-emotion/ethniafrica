import type { Meta, StoryObj } from "@storybook/react";
import { Users } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
import { Badge } from "./badge";
import { Button } from "./button";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-80">
      <CardHeader>
        <CardTitle>Peuple Yoruba</CardTitle>
        <CardDescription>PPL_YORUBA · Famille Niger-Congo</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          L&apos;un des plus grands groupes ethniques d&apos;Afrique de
          l&apos;Ouest, principalement présent au Nigeria, au Bénin et au Togo.
        </p>
        <div className="flex gap-2 mt-3">
          <Badge variant="secondary">FLG_NIGER_CONGO</Badge>
          <Badge variant="outline">NGA</Badge>
        </div>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm">
          Voir le détail
        </Button>
      </CardFooter>
    </Card>
  ),
};

export const Simple: Story = {
  render: () => (
    <Card className="w-64 p-4">
      <p className="text-sm font-medium">Famille Linguistique</p>
      <p className="text-2xl font-bold text-primary mt-1">Bantu</p>
      <p className="text-sm text-muted-foreground mt-1">
        ~500 langues · Afrique sub-saharienne
      </p>
    </Card>
  ),
};

export const StatCard: Story = {
  render: () => (
    <div className="grid grid-cols-2 gap-4">
      {[
        { icon: Users, label: "Peuples", value: "3 200+", sub: "référencés" },
        { icon: Users, label: "Familles", value: "54", sub: "linguistiques" },
        { icon: Users, label: "Langues", value: "2 000+", sub: "africaines" },
        { icon: Users, label: "Pays", value: "54", sub: "d'Afrique" },
      ].map((stat) => (
        <Card key={stat.label} className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <stat.icon className="h-4 w-4" />
            <span className="text-sm">{stat.label}</span>
          </div>
          <p className="text-2xl font-bold mt-1">{stat.value}</p>
          <p className="text-xs text-muted-foreground">{stat.sub}</p>
        </Card>
      ))}
    </div>
  ),
};
