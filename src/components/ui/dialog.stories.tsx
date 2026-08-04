import type { Meta, StoryObj } from "@storybook/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";
import { Button } from "./button";

const meta: Meta<typeof Dialog> = {
  title: "UI/Dialog",
  component: Dialog,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Dialog>;

export const Default: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Voir les détails</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Peuple Yoruba — PPL_YORUBA</DialogTitle>
          <DialogDescription>
            Famille Niger-Congo · Langue : Yoruba (yor)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm">
            Le peuple Yoruba est l&apos;un des groupes ethniques les plus
            importants d&apos;Afrique de l&apos;Ouest. Environ 50 millions de
            personnes au Nigeria, au Bénin et au Togo.
          </p>
          <p className="text-sm text-muted-foreground">
            Auto-appellation : <span className="font-medium">Yorùbá</span>
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline">Fermer</Button>
          <Button>Voir la fiche complète</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const ConfirmDelete: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          Supprimer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmer la suppression</DialogTitle>
          <DialogDescription>
            Cette action est irréversible. La contribution sera définitivement
            supprimée.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Annuler</Button>
          <Button variant="destructive">Supprimer définitivement</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

// ---------------------------------------------------------------------------
// Breakpoint variants — mobile-first per project conventions (ETNI-799 R5).
// The dialog itself is viewport-fixed (Radix portal); these stories embed
// the trigger inside a width-constrained frame to document the surrounding
// layout at each breakpoint, and open the dialog by default to inspect its
// own responsive width (`max-w-lg` with viewport padding).
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
    }}
  >
    <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
      {label} — {width}px
    </div>
    {children}
  </div>
);

const SampleTrigger = () => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="outline">Voir les détails</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Peuple Yoruba — PPL_YORUBA</DialogTitle>
        <DialogDescription>Famille Niger-Congo</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline">Fermer</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export const Mobile430: Story = {
  name: "Breakpoint — Mobile (430px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={430} label="Mobile">
      <SampleTrigger />
    </Frame>
  ),
};

export const Tablet720: Story = {
  name: "Breakpoint — Tablet (720px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={720} label="Tablet">
      <SampleTrigger />
    </Frame>
  ),
};

export const Desktop800: Story = {
  name: "Breakpoint — Desktop (800px)",
  parameters: { layout: "padded" },
  render: () => (
    <Frame width={800} label="Desktop">
      <SampleTrigger />
    </Frame>
  ),
};
