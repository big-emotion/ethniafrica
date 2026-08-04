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

// ---------------------------------------------------------------------------
// Breakpoint variants — mobile-first per project conventions (ETNI-799 R5).
// ---------------------------------------------------------------------------

const Frame = ({
  width,
  label,
  children,
}: {
  width: number;
  label: string;
  children: React.ReactNode;
}) => (
  <div
    style={{
      width,
      maxWidth: "100%",
      border: "1px dashed rgba(0,0,0,0.15)",
      borderRadius: 8,
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 12,
      background: "white",
    }}
  >
    <div style={{ fontSize: 12, color: "#666" }}>
      {label} — {width}px
    </div>
    {children}
  </div>
);

const SampleTabs = () => (
  <Tabs defaultValue="apercu" className="w-full">
    <TabsList className="w-full">
      <TabsTrigger value="apercu" className="flex-1">
        Aperçu
      </TabsTrigger>
      <TabsTrigger value="donnees" className="flex-1">
        Données
      </TabsTrigger>
    </TabsList>
    <TabsContent value="apercu" className="p-3">
      <p className="text-sm">Contenu de l&apos;aperçu.</p>
    </TabsContent>
    <TabsContent value="donnees" className="p-3">
      <p className="text-sm">Données démographiques.</p>
    </TabsContent>
  </Tabs>
);

export const Mobile430: Story = {
  name: "Breakpoint — Mobile (430px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={430} label="Mobile">
      <SampleTabs />
    </Frame>
  ),
};

export const Tablet720: Story = {
  name: "Breakpoint — Tablet (720px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={720} label="Tablet">
      <SampleTabs />
    </Frame>
  ),
};

export const Desktop800: Story = {
  name: "Breakpoint — Desktop (800px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={800} label="Desktop">
      <SampleTabs />
    </Frame>
  ),
};
