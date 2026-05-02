import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";

const meta: Meta<typeof Tabs> = {
  title: "UI/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Tabs>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="description" className="w-96">
      <TabsList className="w-full">
        <TabsTrigger value="description" className="flex-1">
          Description
        </TabsTrigger>
        <TabsTrigger value="linguistique" className="flex-1">
          Linguistique
        </TabsTrigger>
        <TabsTrigger value="histoire" className="flex-1">
          Histoire
        </TabsTrigger>
      </TabsList>
      <TabsContent value="description" className="p-4">
        <p className="text-sm text-muted-foreground">
          Description générale du peuple : localisation géographique,
          population, modes de vie.
        </p>
      </TabsContent>
      <TabsContent value="linguistique" className="p-4">
        <p className="text-sm text-muted-foreground">
          Famille linguistique, langue(s) parlée(s), dialectes régionaux.
        </p>
      </TabsContent>
      <TabsContent value="histoire" className="p-4">
        <p className="text-sm text-muted-foreground">
          Origines historiques, migrations, événements marquants.
        </p>
      </TabsContent>
    </Tabs>
  ),
};

export const WithDisabledTab: Story = {
  render: () => (
    <Tabs defaultValue="apercu" className="w-80">
      <TabsList>
        <TabsTrigger value="apercu">Aperçu</TabsTrigger>
        <TabsTrigger value="donnees">Données</TabsTrigger>
        <TabsTrigger value="carte" disabled>
          Carte
        </TabsTrigger>
      </TabsList>
      <TabsContent value="apercu" className="p-3">
        <p className="text-sm">Contenu de l&apos;aperçu.</p>
      </TabsContent>
      <TabsContent value="donnees" className="p-3">
        <p className="text-sm">Données démographiques.</p>
      </TabsContent>
    </Tabs>
  ),
};
