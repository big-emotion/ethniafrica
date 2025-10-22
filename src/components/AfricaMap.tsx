import { motion } from "framer-motion";
import { EthnicityData } from "@/types/ethnicity";

interface AfricaMapProps {
  highlightedCountries?: string[];
  selectedEthnicity?: string;
  selectedCountry?: string;
  data?: EthnicityData[];
  className?: string;
}

export const AfricaMap = ({
  highlightedCountries = [],
  selectedEthnicity,
  selectedCountry,
  data = [],
  className = "",
}: AfricaMapProps) => {
  // Obtenir les régions où l'ethnie sélectionnée est présente
  const getRegionsForEthnicity = (
    ethnicity: string,
    selectedCountry?: string
  ) => {
    const regions = new Set<string>();

    data.forEach((item) => {
      // Vérification de la correspondance d'ethnie
      const itemEthnicity = item.Ethnicity_or_Subgroup?.toLowerCase() || "";
      const searchEthnicity = ethnicity.toLowerCase();

      const isMatch =
        itemEthnicity === searchEthnicity ||
        itemEthnicity.includes(searchEthnicity) ||
        searchEthnicity.includes(itemEthnicity);

      if (isMatch) {
        // Si un pays est sélectionné, ne colorier que sa région
        if (selectedCountry && item.Country !== selectedCountry) {
          return;
        }

        // Déterminer la région basée sur le pays
        const country = item.Country.toLowerCase();
        let region = "";

        if (
          country.includes("maroc") ||
          country.includes("algérie") ||
          country.includes("tunisie") ||
          country.includes("libye") ||
          country.includes("égypte") ||
          country.includes("soudan")
        ) {
          region = "north";
        } else if (
          country.includes("sénégal") ||
          country.includes("mali") ||
          country.includes("burkina") ||
          country.includes("niger") ||
          country.includes("nigeria") ||
          country.includes("ghana") ||
          country.includes("côte") ||
          country.includes("bénin") ||
          country.includes("togo") ||
          country.includes("guinée") ||
          country.includes("sierra") ||
          country.includes("libéria")
        ) {
          region = "west";
        } else if (
          country.includes("cameroun") ||
          country.includes("centrafricaine") ||
          country.includes("tchad") ||
          country.includes("congo") ||
          country.includes("gabon") ||
          country.includes("équatoriale")
        ) {
          region = "central";
        } else if (
          country.includes("éthiopie") ||
          country.includes("kenya") ||
          country.includes("tanzanie") ||
          country.includes("ouganda") ||
          country.includes("rwanda") ||
          country.includes("burundi") ||
          country.includes("somalie") ||
          country.includes("djibouti") ||
          country.includes("érythrée")
        ) {
          region = "east";
        } else if (
          country.includes("afrique du sud") ||
          country.includes("namibie") ||
          country.includes("botswana") ||
          country.includes("zimbabwe") ||
          country.includes("zambie") ||
          country.includes("malawi") ||
          country.includes("mozambique") ||
          country.includes("madagascar") ||
          country.includes("angola")
        ) {
          region = "south";
        }

        if (region) {
          regions.add(region);
        }
      }
    });

    return Array.from(regions);
  };

  const highlightedRegions = selectedEthnicity
    ? getRegionsForEthnicity(selectedEthnicity, selectedCountry)
    : [];

  // Obtenir le gradient à utiliser selon la région highlightée
  const getMapGradient = () => {
    if (highlightedRegions.includes("north")) return "url(#northGradient)";
    if (highlightedRegions.includes("west")) return "url(#westGradient)";
    if (highlightedRegions.includes("central")) return "url(#centralGradient)";
    if (highlightedRegions.includes("east")) return "url(#eastGradient)";
    if (highlightedRegions.includes("south")) return "url(#southGradient)";
    return "hsl(var(--muted))";
  };

  const isAnyRegionHighlighted = highlightedRegions.length > 0;

  return (
    <div
      className={`w-full h-full flex items-center justify-center ${className}`}
    >
      <svg
        viewBox="0 0 800 900"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient
            id="northGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="hsl(18 70% 52%)" />
            <stop offset="100%" stopColor="hsl(25 80% 60%)" />
          </linearGradient>
          <linearGradient id="westGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(42 88% 58%)" />
            <stop offset="100%" stopColor="hsl(50 90% 65%)" />
          </linearGradient>
          <linearGradient
            id="centralGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="hsl(120 60% 50%)" />
            <stop offset="100%" stopColor="hsl(130 70% 60%)" />
          </linearGradient>
          <linearGradient id="eastGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(200 70% 50%)" />
            <stop offset="100%" stopColor="hsl(210 80% 60%)" />
          </linearGradient>
          <linearGradient
            id="southGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop offset="0%" stopColor="hsl(280 60% 50%)" />
            <stop offset="100%" stopColor="hsl(290 70% 60%)" />
          </linearGradient>
          <filter id="regionGlow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Contour principal de l'Afrique - SVG réel */}
        <motion.g
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          transform="translate(0, 0) scale(0.6, 0.6)"
        >
          {/* Contour de l'Afrique principal */}
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 3, ease: "easeInOut" }}
            d="M5064 12750 c-81 -71 -89 -72 -212 -30 -48 17 -69 20 -91 12 -16 -6
               -34 -6 -42 -1 -25 16 -49 9 -59 -16 -8 -20 -16 -25 -45 -25 -19 0 -35 -3 -35
               -7 0 -5 -4 -14 -8 -21 -7 -10 -19 -7 -58 12 -44 23 -65 26 -192 30 l-144 5
               -27 -30 c-26 -28 -33 -30 -146 -39 -141 -12 -183 -29 -199 -80 l-11 -35 -63 3
               c-87 5 -150 -18 -216 -79 -60 -55 -100 -63 -158 -33 -25 13 -47 15 -112 9 -44
               -4 -97 -13 -117 -22 -48 -19 -66 -10 -140 68 -33 36 -64 59 -76 59 -26 0 -63
               -56 -63 -95 0 -33 -78 -179 -127 -237 -20 -24 -50 -52 -67 -64 -42 -28 -158
               -73 -218 -84 -71 -14 -134 -44 -154 -74 -16 -25 -16 -29 1 -65 21 -47 13 -131
               -16 -173 -32 -44 -33 -78 -5 -133 36 -69 34 -111 -6 -166 -18 -24 -42 -58 -53
               -75 -31 -49 -163 -164 -213 -186 -25 -11 -74 -24 -109 -28 -35 -5 -71 -14 -79
               -21 -8 -7 -37 -58 -63 -113 -48 -103 -62 -119 -140 -178 -61 -46 -85 -96 -89
               -188 -4 -107 -7 -117 -41 -123 -17 -4 -38 -19 -52 -39 -12 -18 -35 -47 -51
               -64 -16 -17 -44 -72 -64 -125 -43 -115 -75 -171 -115 -200 -35 -25 -57 -70
               -60 -120 -3 -51 36 -135 81 -178 34 -32 40 -45 42 -82 2 -71 -1 -83 -29 -104
               -37 -30 -26 -72 32 -115 25 -19 45 -35 45 -37 0 -2 -7 -14 -15 -27 -12 -19
               -13 -32 -4 -78 12 -59 13 -56 -35 -143 -9 -16 -16 -41 -16 -55 0 -14 -5 -41
               -11 -60 -5 -19 -10 -63 -10 -97 l1 -63 -43 -26 c-129 -80 -141 -139 -46 -234
               l31 -31 -7 -92 c-13 -173 -13 -180 18 -220 20 -26 38 -38 65 -43 20 -4 54 -15
               74 -26 34 -16 38 -23 38 -56 0 -56 10 -81 34 -88 26 -8 66 -43 66 -58 0 -6 11
               -31 24 -56 13 -25 26 -57 30 -72 5 -24 12 -28 39 -28 26 0 36 -6 51 -31 10
               -17 28 -35 41 -41 30 -14 37 -31 25 -64 -6 -14 -10 -41 -10 -61 0 -30 10 -46
               74 -112 40 -42 79 -87 86 -99 6 -13 27 -30 45 -38 23 -9 37 -24 44 -47 15 -44
               93 -118 166 -157 115 -61 185 -127 185 -173 0 -21 36 -49 58 -45 12 2 31 -10
               50 -29 19 -21 40 -33 56 -33 14 0 43 -9 65 -21 l40 -21 58 27 c32 14 78 39
               103 55 30 19 65 31 105 35 39 5 73 16 98 32 43 30 96 33 247 16 101 -12 202
               -48 213 -77 8 -21 39 -20 68 3 13 10 43 20 66 24 25 3 60 18 85 36 23 17 61
               36 83 42 21 6 52 21 67 34 20 17 46 25 100 30 85 8 108 18 108 45 0 17 9 24
               31 22 3 0 23 4 45 9 50 12 396 12 429 -1 15 -6 25 -17 25 -30 0 -13 11 -24 33
               -33 18 -8 47 -31 65 -51 28 -32 32 -44 32 -92 0 -67 11 -90 53 -108 18 -8 44
               -23 60 -33 27 -18 28 -18 110 24 l82 41 92 -7 91 -6 44 -49 c90 -103 113 -152
               124 -269 5 -61 2 -91 -25 -197 -17 -69 -31 -140 -31 -157 0 -17 -14 -75 -31
               -129 -54 -169 -41 -263 52 -380 16 -21 44 -65 62 -98 17 -33 54 -84 81 -114
               34 -37 53 -68 61 -100 9 -38 18 -50 43 -61 22 -10 32 -21 32 -37 0 -13 13 -38
               29 -56 38 -44 71 -107 71 -136 0 -31 17 -62 35 -62 21 0 19 -13 -5 -28 -29
               -18 -25 -62 11 -112 17 -23 37 -65 44 -94 8 -28 32 -87 55 -131 22 -44 40 -87
               40 -96 0 -9 -10 -29 -22 -44 -36 -46 -36 -112 2 -192 49 -104 90 -223 90 -260
               0 -50 -24 -87 -73 -116 -61 -36 -96 -93 -106 -172 -5 -41 -14 -72 -27 -86 -15
               -16 -20 -42 -25 -114 -4 -70 -11 -101 -27 -126 -44 -70 -53 -105 -63 -224 -5
               -66 -13 -152 -19 -191 -7 -48 -8 -91 -1 -132 10 -61 35 -122 50 -122 22 0 60
               -53 85 -118 15 -40 33 -75 39 -79 21 -14 57 -106 71 -185 17 -90 35 -128 111
               -228 30 -41 58 -85 62 -98 3 -13 0 -56 -7 -96 -11 -67 -10 -79 10 -157 26 -97
               40 -171 34 -181 -10 -16 -5 -117 6 -138 6 -12 18 -63 25 -113 28 -191 33 -207
               83 -291 28 -46 63 -91 82 -104 44 -29 105 -177 96 -232 -8 -54 11 -108 59
               -159 23 -25 46 -57 50 -70 4 -14 20 -42 36 -64 34 -47 44 -90 32 -138 -8 -29
               -14 -34 -41 -37 -19 -2 -36 -11 -42 -22 -16 -30 4 -95 44 -144 31 -38 34 -46
               21 -56 -20 -17 -19 -47 3 -59 9 -5 35 -13 57 -17 28 -5 53 -21 87 -55 27 -27
               57 -49 67 -49 9 0 38 13 63 29 50 32 68 37 175 50 47 6 83 17 103 31 19 13 44
               21 63 20 67 -4 133 -2 171 5 21 4 71 2 112 -5 l74 -13 72 33 c56 26 84 33 126
               32 46 -1 57 2 77 24 17 19 36 26 69 29 35 2 55 11 91 41 136 114 203 177 230
               215 49 69 82 99 108 99 27 0 67 39 107 106 13 21 43 64 66 94 23 30 65 96 92
               145 65 115 88 145 116 145 31 0 46 19 46 59 0 21 11 52 30 81 31 49 70 205 70
               284 0 75 17 112 73 159 64 55 101 74 169 88 71 15 98 30 141 78 36 40 37 42
               37 125 0 49 6 101 15 126 19 54 19 119 0 144 -9 12 -15 42 -15 73 0 30 -6 66
               -14 81 -7 15 -16 47 -19 72 -4 32 -13 49 -31 63 -58 42 -16 120 73 137 72 13
               95 30 109 77 8 29 33 58 92 112 45 40 99 97 121 126 51 68 103 103 186 126 79
               22 122 50 197 129 50 53 56 63 56 102 0 40 5 49 56 98 103 102 96 69 99 415 3
               256 6 309 19 327 23 32 20 75 -6 99 -13 11 -49 40 -80 65 -48 37 -60 53 -73
               96 -8 28 -15 67 -15 85 0 19 -9 51 -19 71 -12 24 -22 71 -26 129 -7 89 -6 94
               20 139 25 43 26 50 15 86 -6 22 -29 59 -51 83 -45 49 -48 69 -16 116 28 42 60
               59 114 59 46 0 53 8 45 60 -6 41 -25 66 -57 74 l-24 6 24 43 c14 23 25 58 25
               77 0 57 17 102 54 139 19 20 42 53 51 75 9 21 24 40 34 43 24 6 86 82 94 115
               4 15 57 80 120 145 63 65 127 138 144 163 45 65 258 278 323 323 30 21 84 57
               120 80 57 37 69 50 97 109 27 55 47 79 112 133 87 72 131 133 150 209 16 64
               32 95 81 151 53 61 68 93 79 162 14 94 104 288 189 408 55 77 74 131 77 210 2
               38 10 91 20 117 16 45 16 48 -4 93 -12 26 -21 60 -21 75 0 30 -27 60 -55 60
               -10 0 -39 -13 -64 -28 -73 -44 -157 -72 -218 -72 -30 0 -64 -5 -76 -12 -12 -7
               -55 -15 -96 -19 -64 -5 -77 -9 -93 -32 -27 -38 -77 -51 -139 -38 -47 10 -60 8
               -162 -24 -169 -54 -200 -47 -232 54 -24 73 -45 93 -98 89 -39 -3 -42 -1 -45
               25 -3 24 0 27 27 27 41 0 76 43 59 74 -7 11 -14 39 -17 60 -5 30 -13 43 -34
               55 -16 9 -47 49 -72 91 -57 97 -57 97 -108 111 -73 19 -86 27 -104 66 -22 45
               -168 167 -280 234 -29 16 -33 24 -33 62 0 23 -6 67 -14 97 -7 30 -21 89 -31
               130 -9 41 -31 104 -48 140 -27 55 -37 66 -60 68 -21 3 -31 11 -39 33 -7 19
               -19 31 -36 35 -15 3 -32 7 -39 9 -7 2 -24 28 -39 57 -24 47 -27 66 -30 178 -4
               138 -15 180 -76 305 -52 104 -81 142 -115 150 -77 17 -112 97 -82 183 13 38 0
               67 -35 76 -19 5 -27 15 -32 44 -9 48 -69 166 -111 216 -18 22 -33 46 -33 53 0
               8 -22 36 -50 64 -50 50 -50 50 -50 115 0 65 0 66 -47 112 -75 73 -127 150
               -168 242 -33 75 -36 89 -26 116 10 29 7 42 -43 148 l-55 116 47 1 47 1 -45 13
               c-25 7 -85 25 -135 40 -94 28 -102 28 -165 -15 -8 -5 -27 -14 -42 -20 -17 -6
               -33 -22 -42 -43 -9 -23 -23 -37 -41 -41 -29 -7 -105 1 -145 16 -14 5 -48 13
               -77 18 -28 5 -69 20 -90 34 -24 16 -69 30 -123 40 -47 8 -93 17 -102 21 -11 4
               -23 -1 -35 -14 -9 -12 -21 -21 -24 -21 -4 0 -21 22 -38 50 -36 58 -33 57 -268
               76 -54 4 -64 10 -58 37 8 35 -37 77 -83 77 -12 0 -28 14 -41 35 -30 51 -78 47
               -134 -9 -12 -12 -55 -33 -94 -44 -86 -26 -113 -55 -113 -116 1 -22 7 -52 15
               -66 22 -38 19 -112 -6 -144 -31 -39 -95 -69 -132 -62 -17 3 -59 29 -95 56 -62
               48 -67 50 -129 50 -45 0 -83 7 -126 24 -34 14 -74 28 -89 31 -50 13 -98 74
               -122 159 -15 52 -43 66 -149 74 -77 5 -84 7 -113 39 -37 40 -67 49 -213 63
               -120 12 -135 18 -150 61 -10 28 -14 31 -43 27 -65 -10 -140 65 -111 111 5 9
               27 25 48 36 21 11 41 27 43 35 3 8 18 30 33 48 41 46 39 84 -7 130 -20 20 -40
               49 -45 64 -10 37 6 89 36 118 29 27 34 70 8 70 -9 0 -29 -11 -43 -25 l-27 -26
               -38 43 c-85 95 -119 100 -201 28z m119 29 c12 -6 43 -34 69 -63 l46 -51 29 28
               c55 51 73 26 23 -33 -52 -61 -51 -134 1 -172 38 -28 55 -84 34 -113 -9 -11
               -26 -37 -40 -57 -14 -21 -31 -38 -39 -38 -7 0 -25 -9 -40 -21 -36 -29 -36 -82
               0 -112 15 -12 37 -32 51 -44 24 -23 39 -30 29 -14 -6 10 33 23 46 15 4 -3 8
               -11 8 -18 0 -7 11 -22 23 -35 20 -18 46 -24 153 -36 71 -8 133 -15 137 -15 5
               0 26 -18 48 -40 34 -35 46 -40 84 -40 52 0 145 -18 162 -32 6 -5 15 -24 19
               -41 9 -45 38 -98 67 -125 42 -39 172 -84 263 -91 75 -6 85 -9 135 -47 95 -73
               126 -79 194 -41 75 42 99 128 59 209 -20 39 -17 91 6 116 11 11 52 31 91 42
               47 14 81 31 98 50 46 49 103 51 115 5 5 -18 17 -27 49 -36 56 -15 67 -25 67
               -64 0 -18 6 -37 13 -42 11 -10 128 -23 228 -26 53 -2 73 -16 100 -69 21 -40
               44 -48 64 -22 11 15 19 15 111 -1 58 -10 122 -29 154 -45 59 -30 214 -71 268
               -70 45 0 66 13 90 53 12 21 31 37 48 41 16 4 39 17 51 28 12 11 32 20 45 20
               35 0 168 -42 168 -53 0 -5 24 -63 54 -128 35 -79 51 -123 45 -132 -17 -27 -9
               -63 35 -155 44 -92 95 -163 169 -235 35 -34 37 -39 37 -97 0 -60 1 -63 50
               -117 27 -30 50 -59 50 -64 0 -4 14 -25 30 -47 17 -21 41 -58 54 -83 13 -25 31
               -59 40 -76 9 -16 16 -41 16 -54 0 -27 26 -61 46 -61 19 0 33 -32 23 -55 -4
               -11 -8 -43 -8 -72 -1 -45 4 -57 30 -87 18 -21 43 -38 63 -41 35 -7 57 -37 119
               -160 53 -107 67 -165 67 -281 0 -153 38 -241 113 -259 17 -5 27 -14 27 -25 0
               -22 18 -37 50 -42 20 -2 32 -17 57 -68 17 -36 37 -90 44 -120 6 -30 20 -90 31
               -133 10 -43 16 -87 13 -96 -9 -30 12 -69 47 -87 36 -19 134 -88 207 -147 25
               -20 55 -56 66 -80 20 -42 37 -52 126 -71 20 -4 38 -26 79 -96 33 -56 62 -95
               79 -103 19 -9 27 -21 29 -47 2 -19 8 -41 14 -47 18 -22 0 -62 -30 -69 -48 -10
               -52 -13 -52 -37 0 -33 22 -49 54 -41 42 10 70 -16 91 -86 10 -34 28 -68 39
               -76 32 -22 93 -17 201 17 86 27 107 30 167 24 77 -8 118 3 142 39 12 19 27 24
               79 29 35 3 83 13 106 23 24 9 54 14 71 11 16 -4 53 1 82 9 59 18 163 68 173
               84 9 15 41 12 59 -6 9 -8 16 -30 16 -48 0 -18 7 -41 15 -52 19 -25 19 -75 0
               -121 -8 -19 -15 -63 -15 -98 0 -70 -12 -114 -47 -165 -13 -19 -34 -51 -46 -70
               -72 -107 -166 -317 -174 -385 -7 -62 -25 -98 -73 -151 -47 -51 -67 -90 -86
               -163 -20 -78 -51 -119 -144 -197 -64 -54 -86 -79 -109 -129 -31 -64 -65 -98
               -151 -147 -106 -61 -341 -286 -406 -390 -15 -24 -74 -89 -131 -146 -58 -57
               -111 -119 -120 -139 -19 -46 -71 -111 -94 -118 -9 -3 -24 -22 -32 -43 -8 -20
               -29 -50 -47 -67 -44 -42 -52 -59 -60 -138 -5 -46 -15 -79 -30 -99 -24 -33 -21
               -58 9 -58 31 0 51 -28 51 -71 l0 -39 -48 0 c-57 0 -85 -18 -112 -70 -28 -54
               -25 -81 11 -116 59 -55 75 -117 43 -163 -9 -13 -20 -38 -24 -57 -10 -43 11
               -189 33 -231 10 -18 17 -46 17 -63 0 -93 44 -163 142 -226 46 -30 56 -61 32
               -105 -16 -30 -19 -66 -20 -332 -2 -337 5 -309 -94 -406 -53 -52 -75 -89 -69
               -117 5 -29 -8 -50 -67 -107 -70 -66 -108 -90 -164 -102 -56 -12 -127 -52 -162
               -92 -18 -21 -81 -85 -139 -144 -75 -74 -109 -115 -114 -138 -8 -36 -34 -56
               -85 -66 -59 -11 -86 -25 -103 -54 -25 -43 -22 -87 8 -107 18 -12 25 -25 25
               -48 0 -17 9 -51 20 -75 12 -25 20 -65 20 -95 0 -30 6 -60 15 -72 19 -25 19
               -59 0 -120 -9 -28 -16 -83 -15 -127 0 -49 -5 -88 -14 -105 -21 -41 -85 -81
               -155 -98 -77 -17 -103 -31 -173 -88 -62 -50 -78 -83 -78 -158 0 -81 -38 -238
               -71 -292 -17 -27 -31 -63 -31 -80 -1 -39 -14 -56 -42 -56 -30 0 -56 -30 -101
               -117 -20 -40 -57 -101 -81 -135 -24 -35 -67 -97 -95 -140 -51 -75 -65 -86
               -124 -104 -20 -6 -41 -26 -62 -59 -43 -65 -122 -144 -210 -211 -40 -30 -75
               -59 -78 -64 -3 -6 -25 -10 -48 -10 -31 0 -48 -7 -69 -27 -24 -23 -39 -28 -86
               -29 -41 -1 -76 -11 -125 -34 -66 -32 -70 -32 -126 -20 -34 7 -82 9 -117 6 -59
               -7 -117 -8 -185 -4 -24 1 -45 -5 -64 -20 -15 -12 -39 -22 -54 -22 -58 0 -178
               -33 -224 -61 -58 -36 -75 -32 -119 22 -25 31 -44 42 -90 55 -68 20 -76 28 -52
               55 12 14 15 24 9 33 -6 7 -25 33 -43 57 -27 35 -32 51 -30 84 3 36 6 40 31 41
               40 1 48 14 54 80 5 55 3 63 -29 109 -19 28 -40 64 -47 81 -7 18 -26 45 -43 60
               -45 43 -58 76 -58 146 -1 88 -52 213 -101 246 -18 13 -38 31 -43 40 -4 9 -25
               46 -46 82 -38 64 -56 134 -75 290 -4 30 -14 71 -22 90 -11 26 -13 54 -8 106 5
               59 2 87 -20 169 -24 89 -26 108 -20 204 l7 106 -62 85 c-82 113 -97 144 -119
               248 -23 106 -39 150 -67 177 -12 11 -31 48 -44 82 -16 44 -34 73 -65 101 -71
               65 -74 90 -46 432 11 133 19 162 56 218 23 35 28 57 34 135 6 75 12 100 29
               122 14 17 22 42 22 65 0 78 45 157 108 189 100 51 95 153 -18 394 -37 78 -37
               125 -1 176 30 41 27 60 -23 159 -24 48 -47 106 -51 129 -3 23 -20 59 -36 79
               -44 55 -48 83 -16 109 33 26 34 33 2 45 -18 7 -25 17 -25 35 0 32 -37 107 -79
               159 -17 21 -31 49 -31 62 0 18 -8 25 -32 32 -27 7 -34 14 -39 43 -7 45 -24 75
               -69 125 -20 22 -50 62 -65 90 -16 27 -48 77 -72 111 -24 34 -55 90 -70 125
               -29 73 -28 97 15 238 16 52 33 122 37 155 4 33 18 105 32 159 49 191 18 327
               -106 458 l-57 61 -97 3 c-96 2 -98 2 -173 -38 l-76 -40 -37 26 c-20 14 -42 26
               -48 26 -24 0 -43 45 -43 102 0 50 -4 62 -32 94 -18 20 -47 43 -65 51 -21 8
               -33 20 -33 33 0 11 -10 25 -22 31 -33 18 -323 25 -412 10 -114 -19 -116 -20
               -116 -41 0 -25 -29 -40 -77 -40 -57 -1 -112 -16 -136 -38 -12 -11 -39 -25 -59
               -30 -20 -5 -56 -23 -80 -40 -24 -16 -62 -33 -85 -37 -23 -3 -53 -15 -67 -26
               -31 -24 -35 -24 -65 5 -43 40 -119 64 -250 76 -137 14 -168 10 -211 -22 -19
               -14 -53 -24 -97 -30 -40 -4 -78 -16 -94 -27 -43 -32 -147 -81 -171 -81 -13 0
               -31 7 -41 15 -11 7 -36 17 -58 20 -27 5 -45 16 -60 36 -16 22 -28 29 -54 29
               -31 0 -35 3 -45 39 -13 50 -87 119 -176 164 -77 40 -168 126 -178 170 -5 20
               -17 33 -41 43 -19 8 -40 24 -46 36 -6 13 -45 57 -85 99 -59 61 -74 83 -74 107
               0 35 22 62 51 62 10 0 19 4 19 9 0 4 -11 6 -25 3 -16 -3 -25 0 -25 8 0 23
               -107 118 -136 122 -22 2 -30 10 -35 33 -4 17 -22 59 -40 95 -25 48 -42 69 -66
               79 -30 13 -33 19 -39 71 -6 53 -9 59 -43 78 -20 11 -53 23 -74 27 -23 5 -46
               18 -63 38 l-25 30 7 142 7 143 -41 40 c-77 76 -71 122 28 187 70 47 75 54 71
               111 -4 55 30 207 56 251 22 38 24 49 17 111 -4 47 -3 72 5 76 22 14 10 41 -30
               69 -22 15 -44 39 -49 53 -9 22 -6 31 21 61 29 34 31 39 24 92 -7 61 -24 94
               -56 111 -20 11 -64 98 -54 108 3 3 0 11 -6 18 -15 18 0 103 21 123 10 9 29 24
               43 33 26 18 83 127 117 228 26 73 89 153 148 185 l37 20 6 90 c7 107 24 150
               73 190 20 17 52 43 72 59 24 20 51 62 85 131 27 57 55 107 62 114 8 6 47 15
               87 21 46 7 91 20 120 37 56 33 171 143 210 203 16 25 39 57 51 71 28 35 27 94
               -1 149 -27 53 -28 91 -4 127 31 46 45 131 28 172 -8 18 -14 42 -14 51 0 27 46
               58 109 75 236 63 318 115 391 250 18 33 40 70 48 83 8 12 19 44 23 69 10 50
               33 93 50 93 7 0 39 -29 73 -64 70 -74 97 -84 158 -63 64 23 177 29 208 12 14
               -8 47 -14 73 -15 43 0 53 4 96 45 66 62 110 79 206 79 l80 1 10 31 c6 17 16
               38 23 46 15 18 127 38 217 38 63 0 69 2 97 32 l30 33 142 -4 c131 -3 145 -5
               189 -29 l49 -27 15 23 c11 15 25 22 49 22 28 0 36 5 44 25 11 28 13 29 41 14
               14 -7 29 -7 50 0 23 8 41 6 87 -10 128 -45 115 -44 163 -14 24 15 61 43 82 61
               40 36 56 40 90 23z"
            fill={getMapGradient()}
            stroke="hsl(var(--primary))"
            strokeWidth="2"
            className="transition-all duration-700 cursor-pointer hover:opacity-80"
            filter={isAnyRegionHighlighted ? "url(#regionGlow)" : undefined}
          />
        </motion.g>

        {/* Labels des régions */}
        <motion.text
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          x="300"
          y="100"
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill="hsl(var(--foreground))"
          className="pointer-events-none"
        >
          Afrique du Nord
        </motion.text>

        <motion.text
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          x="225"
          y="280"
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill="hsl(var(--foreground))"
          className="pointer-events-none"
        >
          Afrique de l'Ouest
        </motion.text>

        <motion.text
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.0 }}
          x="375"
          y="380"
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill="hsl(var(--foreground))"
          className="pointer-events-none"
        >
          Afrique Centrale
        </motion.text>

        <motion.text
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.1 }}
          x="550"
          y="280"
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill="hsl(var(--foreground))"
          className="pointer-events-none"
        >
          Afrique de l'Est
        </motion.text>

        <motion.text
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.2 }}
          x="500"
          y="580"
          textAnchor="middle"
          fontSize="12"
          fontWeight="600"
          fill="hsl(var(--foreground))"
          className="pointer-events-none"
        >
          Afrique Australe
        </motion.text>

        {/* Légende pour l'ethnie sélectionnée */}
        {selectedEthnicity && highlightedRegions.length > 0 && (
          <motion.g
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.3 }}
          >
            <rect
              x="50"
              y="750"
              width="300"
              height="100"
              rx="8"
              fill="hsl(var(--card))"
              stroke="hsl(var(--border))"
              strokeWidth="1"
            />
            <text
              x="70"
              y="775"
              fontSize="14"
              fontWeight="600"
              fill="hsl(var(--foreground))"
            >
              Ethnie sélectionnée:
            </text>
            <text
              x="70"
              y="795"
              fontSize="12"
              fill="hsl(var(--muted-foreground))"
            >
              {selectedEthnicity}
            </text>
            <text
              x="70"
              y="815"
              fontSize="10"
              fill="hsl(var(--muted-foreground))"
            >
              Régions:{" "}
              {highlightedRegions
                .map((r) => {
                  const regionNames = {
                    north: "Nord",
                    west: "Ouest",
                    central: "Centrale",
                    east: "Est",
                    south: "Australe",
                  };
                  return regionNames[r as keyof typeof regionNames];
                })
                .join(", ")}
            </text>
            <text
              x="70"
              y="835"
              fontSize="10"
              fill="hsl(var(--muted-foreground))"
            >
              Zones colorées sur la carte
            </text>
          </motion.g>
        )}
      </svg>
    </div>
  );
};
