import type { Meta, StoryObj } from "@storybook/react";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "./drawer";
import { Button } from "./button";

const meta: Meta<typeof Drawer> = {
  title: "UI/Drawer",
  component: Drawer,
  tags: ["autodocs"],
  parameters: { layout: "centered" },
};

export default meta;
type Story = StoryObj<typeof Drawer>;

export const Default: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Ouvrir le tiroir</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Peuple Yoruba — PPL_YORUBA</DrawerTitle>
          <DrawerDescription>Famille Niger-Congo</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button variant="outline">Fermer</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

// ---------------------------------------------------------------------------
// Breakpoint variants — mobile-first per project conventions (ETNI-799 R5).
// The drawer itself is viewport-fixed (vaul portal, bottom sheet); these
// stories embed the trigger inside a width-constrained frame to document
// the surrounding layout at each breakpoint.
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
  <Drawer>
    <DrawerTrigger asChild>
      <Button variant="outline">Ouvrir le tiroir</Button>
    </DrawerTrigger>
    <DrawerContent>
      <DrawerHeader>
        <DrawerTitle>Peuple Yoruba — PPL_YORUBA</DrawerTitle>
        <DrawerDescription>Famille Niger-Congo</DrawerDescription>
      </DrawerHeader>
      <DrawerFooter>
        <Button variant="outline">Fermer</Button>
      </DrawerFooter>
    </DrawerContent>
  </Drawer>
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
