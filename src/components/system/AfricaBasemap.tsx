import { cn } from "@/lib/utils";
import { BASEMAP_VIEWBOX } from "@/lib/atlas/projection";
import { AFRICA_LANDMASS_PATH } from "@/lib/atlas/assets/africaLandmassPath";

export interface AfricaBasemapProps extends Omit<
  React.SVGProps<SVGSVGElement>,
  "viewBox" | "children"
> {
  children?: React.ReactNode;
}

/**
 * Zero-dependency Africa basemap foundation (Epic 12, ETNI-519) — inlines
 * the committed africa-basemap.svg landmass and reserves its aspect ratio
 * (CLS 0). Styled exclusively via --afh-atlas-* tokens. Decorative by
 * default (aria-hidden="true"); pass children to layer data on top in the
 * same coordinate space as src/lib/atlas/projection.ts.
 */
// @req REQ-101
export function AfricaBasemap({
  children,
  className,
  style,
  ...rest
}: AfricaBasemapProps) {
  return (
    <svg
      viewBox={`0 0 ${BASEMAP_VIEWBOX.width} ${BASEMAP_VIEWBOX.height}`}
      aria-hidden="true"
      {...rest}
      className={cn("h-auto w-full", className)}
      style={{
        aspectRatio: `${BASEMAP_VIEWBOX.width} / ${BASEMAP_VIEWBOX.height}`,
        ...style,
      }}
    >
      <path
        id="africa-landmass"
        d={AFRICA_LANDMASS_PATH}
        className="fill-afh-atlas-land stroke-afh-atlas-coastline"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {children}
    </svg>
  );
}

export default AfricaBasemap;
