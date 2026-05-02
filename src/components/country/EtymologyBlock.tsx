import type { EtymologyData } from "@/lib/countryDataTransformer";

interface EtymologyBlockProps {
  data: EtymologyData;
}

export function EtymologyBlock({ data }: EtymologyBlockProps) {
  if (data.variant === "split" && data.words.length >= 2) {
    return (
      <div className="etym-split">
        <div
          className="etym-half"
          style={{
            background: "var(--country-gold-bg)",
            borderRight: "1px solid var(--country-border)",
          }}
        >
          <div className="etym-word" style={{ color: "var(--country-gold)" }}>
            {data.words[0].word}
          </div>
          <div className="etym-lang">{data.words[0].lang}</div>
          <div className="etym-def">
            &laquo; {data.words[0].definition} &raquo;
          </div>
        </div>
        <div
          className="etym-half"
          style={{ background: "var(--country-green-bg)" }}
        >
          <div className="etym-word" style={{ color: "var(--country-green)" }}>
            {data.words[1].word}
          </div>
          <div className="etym-lang">{data.words[1].lang}</div>
          <div className="etym-def">
            &laquo; {data.words[1].definition} &raquo;
          </div>
        </div>
      </div>
    );
  }

  if (data.variant === "uncertain") {
    return (
      <div className="etym-uncertain">
        {data.words[0] && (
          <>
            <div
              className="etym-word"
              style={{ color: "var(--country-earth)" }}
            >
              {data.words[0].word}
            </div>
            <div className="etym-lang">Origine débattue</div>
            {data.words[0].definition && (
              <div className="etym-def">{data.words[0].definition}</div>
            )}
          </>
        )}
        {data.hypotheses && data.hypotheses.length > 0 && (
          <div className="etym-hypothesis">
            {data.hypotheses.map((h, i) => (
              <div key={i} className="mb-1">
                <span className="etym-hypothesis-tag">Hypothèse {i + 1}</span>
                <br />
                {h}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Single variant
  const word = data.words[0];
  if (!word) return null;

  return (
    <div className="etym-single">
      <div className="etym-word" style={{ color: "var(--country-gold)" }}>
        {word.word}
      </div>
      <div className="etym-lang">{word.lang}</div>
      <div className="etym-def">&laquo; {word.definition} &raquo;</div>
      {data.rawText && (
        <div className="etym-note">{data.rawText.substring(0, 150)}</div>
      )}
    </div>
  );
}
