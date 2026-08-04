import { DottedContinent } from "@/components/home/DottedContinent";

// @req REQ-044
export function HomeHero() {
  return (
    <section
      style={{
        position: "relative",
        overflow: "hidden",
        borderBottom: "1px solid var(--afh-border)",
        backgroundColor: "var(--afh-bg-warm)",
        width: "100vw",
        marginLeft: "calc(50% - 50vw)",
        marginRight: "calc(50% - 50vw)",
      }}
    >
      <DottedContinent />
      <div
        style={{
          position: "relative",
          maxWidth: "820px",
          margin: "0 auto",
          padding: "64px 20px 56px",
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
    </section>
  );
}
