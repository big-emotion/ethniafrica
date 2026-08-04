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
  "focus-visible:outline-[color:var(--afh-gold)] focus-visible:rounded-[6px]";

// @req REQ-044
export function HomeHero() {
  return (
    <section
      aria-label={PRODUCT_NAME}
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
        <p
          style={{
            fontFamily: "var(--afh-font-body)",
            fontSize: "12px",
            fontWeight: 700,
            color: "var(--afh-text-soft)",
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
            color: "var(--afh-gold)",
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
            color: "var(--afh-text)",
          }}
        >
          Le continent raconté
          <br /> comme une{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "var(--afh-gold)",
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
                backgroundColor: "var(--afh-surface)",
                border: "1px solid var(--afh-border)",
                color: "var(--afh-text)",
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
