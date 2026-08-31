import { cn } from "@/lib/utils";
import { BASEMAP_VIEWBOX } from "@/lib/atlas/projection";
import { AFRICA_LANDMASS_PATH } from "@/lib/atlas/assets/africaLandmassPath";

export interface AfricaBasemapProps extends Omit<
  React.SVGProps<SVGSVGElement>,
  "viewBox" | "children"
> {
  children?: React.ReactNode;
  /**
   * An SVG transform, in viewBox units, applied to the landmass and the
   * layered data as one figure. REQ-117's fallback pans and zooms the map to
   * the chosen target; moving only the children would slide the data off the
   * coastline it belongs to.
   */
  figureTransform?: string;
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
  figureTransform,
  ...rest
}: AfricaBasemapProps) {
  const figure = (
    <>
      <path
        id="africa-landmass"
        d={AFRICA_LANDMASS_PATH}
        className="fill-afh-atlas-land stroke-afh-atlas-coastline"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      {children}
    </>
  );

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
      {figureTransform ? <g transform={figureTransform}>{figure}</g> : figure}
    </svg>
  );
}

export default AfricaBasemap;
