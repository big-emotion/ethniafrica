"use client";

import * as React from "react";

import type { HeroFamilyNode } from "@/lib/home/heroPreviewData";

export interface HeroFamilyCrownProps {
  families: HeroFamilyNode[];
}

const VIEWBOX = 320;
const CENTRE = VIEWBOX / 2;
const RADIUS = 118;
const MIN_NODE = 4;
const MAX_NODE = 13;

/**
 * The Explorer axis in the hero (REQ-115): the linguistic families laid
 * out in a crown, each disc sized by the peoples that family holds.
 *
 * The geometry is EgoNetworkGraph's, lifted rather than imported. That
 * component's edges are typed linguistic | migratory | commercial |
 * religious and each one renders a visible relation badge — filing a
 * family branch under one of those would put a claim on screen that the
 * corpus never makes. Six lines of trigonometry are cheaper than a lie in
 * the interface.
 *
 * The crown is a picture of the corpus's shape, not a control: names are
 * given to a screen reader through the list below, and the provenance chip
 * above carries the click through to the module.
 */
// @req REQ-115
export function HeroFamilyCrown({ families }: HeroFamilyCrownProps) {
  const nodes = React.useMemo(() => {
    const heaviest = Math.max(1, ...families.map((f) => f.peopleCount));

    return families.map((family, index) => {
      // Start at twelve o'clock and go clockwise, so the crown reads the
      // way a dial does rather than starting wherever cos(0) lands.
      const angle = -Math.PI / 2 + (index * 2 * Math.PI) / families.length;
      const weight = Math.sqrt(family.peopleCount / heaviest);

      return {
        ...family,
        x: CENTRE + RADIUS * Math.cos(angle),
        y: CENTRE + RADIUS * Math.sin(angle),
        r: MIN_NODE + (MAX_NODE - MIN_NODE) * weight,
      };
    });
  }, [families]);

  const totalPeoples = families.reduce((sum, f) => sum + f.peopleCount, 0);

  return (
    <div className="hero-family-crown">
      <svg
        viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
        className="hero-crown-svg"
        role="img"
        aria-label={`Les ${families.length} familles linguistiques du corpus, chacune dimensionnée par le nombre de peuples qu'elle rassemble.`}
      >
        <g stroke="var(--accent-ink)" strokeWidth="0.8" opacity="0.45">
          {nodes.map((node) => (
            <line
              key={`spoke-${node.id}`}
              x1={CENTRE}
              y1={CENTRE}
              x2={node.x}
              y2={node.y}
            />
          ))}
        </g>
        <g fill="var(--accent)" stroke="var(--accent-ink)" strokeWidth="0.9">
          {nodes.map((node) => (
            <circle key={node.id} cx={node.x} cy={node.y} r={node.r} />
          ))}
        </g>
        <circle cx={CENTRE} cy={CENTRE} r={15} fill="var(--accent-ink)" />
      </svg>
      <p className="hero-crown-readout">
        {families.length} familles · {totalPeoples} peuples
      </p>
      <style>{`
        .hero-family-crown {
          box-sizing: border-box;
          width: 100%;
          max-width: 960px;
          margin: 0 auto;
          min-height: 460px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 10px;
          padding: 0 16px;
        }
        .hero-crown-svg {
          width: 100%;
          max-width: 340px;
          height: auto;
          display: block;
        }
        .hero-crown-readout {
          margin: 0;
          text-align: center;
          font-family: var(--afh-font-mono);
          font-size: 11.5px;
          font-variant-numeric: tabular-nums;
          color: var(--accent-ink);
        }
        @media (min-width: 720px) {
          .hero-family-crown { min-height: 540px; }
          .hero-crown-svg { max-width: 400px; }
        }
        @media (min-width: 1200px) {
          .hero-family-crown { flex: 1 1 auto; min-height: 0; }
        }
      `}</style>
    </div>
  );
}

export default HeroFamilyCrown;
