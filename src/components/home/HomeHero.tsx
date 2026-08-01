import { DottedContinent } from "@/components/home/DottedContinent";
import { PRODUCT_NAME } from "@/lib/brand";

const CTA_ITEMS = [
  { href: "#arbre", label: "L'arbre des familles" },
  { href: "#noms", label: "D'où vient un nom ?" },
  { href: "#liens", label: "Les liens invisibles" },
  { href: "#frise", label: "3 000 ans de migrations" },
  { href: "#comparer", label: "Comparer deux peuples" },
];

const PILL_CLASS_NAME =
  "relative inline-flex items-center rounded-full outline-none " +
  "before:absolute before:inset-[-2px] before:content-[''] " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 " +
  "focus-visible:outline-[color:var(--accent-tint)] focus-visible:rounded-[6px]";

// @req REQ-044
export function HomeHero() {
  return (
    <section
      aria-label={PRODUCT_NAME}
      style={{
        position: "relative",
        overflow: "hidden",
        borderBottom: "1px solid var(--afh-night-line)",
        backgroundColor: "var(--afh-night-ground)",
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
        <p
          style={{
            fontFamily: "var(--afh-font-body)",
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--afh-night-ink-3)",
            margin: "0 0 8px",
          }}
        >
          {PRODUCT_NAME}
        </p>
        <p
          style={{
            fontFamily: "var(--afh-font-body)",
            fontSize: "11.5px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: ".18em",
            color: "var(--accent-tint)",
            margin: 0,
          }}
        >
          EXPLORER · COMPRENDRE · JOUER
        </p>
        <h1
          style={{
            fontFamily: "var(--afh-font-display)",
            fontWeight: 900,
            fontSize: "clamp(34px, 9vw, 58px)",
            lineHeight: 1.04,
            textWrap: "balance",
            margin: "10px 0 14px",
            color: "var(--afh-night-ink)",
          }}
        >
          Le continent raconté
          <br /> comme une{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "var(--accent-tint)",
            }}
          >
            carte vivante
          </em>
        </h1>
        <p
          style={{
            fontFamily: "var(--afh-font-body)",
            fontSize: "15.5px",
            color: "var(--afh-night-ink-2)",
            maxWidth: "34em",
            margin: 0,
          }}
        >
          Peuples, langues, noms et migrations : l&apos;histoire africaine
          racontée depuis son propre regard — chaque affirmation adossée à une
          source vérifiable.
        </p>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
            marginTop: "22px",
          }}
        >
          {CTA_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={PILL_CLASS_NAME}
              style={{
                fontFamily: "var(--afh-font-body)",
                fontSize: "13px",
                fontWeight: 700,
                padding: "9px 14px",
                minHeight: "40px",
                borderRadius: "999px",
                backgroundColor: "var(--afh-night-surface-2)",
                border: "1px solid var(--afh-night-line)",
                color: "var(--afh-night-ink)",
                textDecoration: "none",
              }}
            >
              {item.label}
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
