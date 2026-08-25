import { HomeGlobeStage } from "@/components/home/HomeGlobeStage";
import { PRODUCT_NAME } from "@/lib/brand";

// @req REQ-044
// @req REQ-115
export function HomeHero() {
  return (
    <section
      // Landmark label dropped during the light-parchment swap (ETNI-820,
      // 6ae60726) — restored here (ETNI-822) because e2e/home-visual.spec.ts
      // resolves the hero's crop origin via this exact locator.
      aria-label={PRODUCT_NAME}
      className="home-hero"
      style={{
        position: "relative",
        overflow: "hidden",
        borderBottom: "1px solid var(--afh-border)",
        backgroundColor: "var(--afh-bg-warm)",
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "relative",
          maxWidth: "820px",
          margin: "0 auto",
          padding: "64px 20px 24px",
        }}
      >
        <h1
          style={{
            fontFamily: "var(--afh-font-display)",
            fontWeight: 900,
            fontSize: "clamp(34px, 9vw, 58px)",
            lineHeight: 1.04,
            textWrap: "balance",
            margin: "0 0 14px",
            color: "var(--afh-text)",
          }}
        >
          Le continent raconté comme une{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "var(--afh-cat-terre)",
            }}
          >
            carte vivante
          </em>
        </h1>
        <p
          style={{
            fontFamily: "var(--afh-font-body)",
            fontSize: "15.5px",
            color: "var(--afh-text-soft)",
            maxWidth: "34em",
            margin: 0,
          }}
        >
          Peuples, langues, noms et migrations : l&apos;histoire africaine
          racontée depuis son propre regard — chaque affirmation adossée à une
          source vérifiable.
        </p>
        <p
          data-testid="home-hero-trust-note"
          style={{
            fontFamily: "var(--afh-font-body)",
            fontSize: "13px",
            color: "var(--afh-text-muted)",
            maxWidth: "34em",
            margin: "10px 0 0",
          }}
        >
          Une méthodologie transparente : chaque source est citée, chaque choix
          éditorial est documenté.
        </p>
      </div>
      <HomeGlobeStage />
      {/* The globe is the hero's subject (REQ-115): it follows the copy in
          document order and, on desktop, grows to fill the viewport height
          the section reserves below the copy — see .home-globe-stage's own
          flex rule in HomeGlobeStage.tsx. */}
      <style>{`
        @media (min-width: 1200px) {
          .home-hero {
            min-height: 100vh;
            min-height: 100dvh;
          }
        }
      `}</style>
    </section>
  );
}
