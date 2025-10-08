import { motion } from 'framer-motion';

interface AfricaMapProps {
  highlightedCountries?: string[];
  className?: string;
}

export const AfricaMap = ({ highlightedCountries = [], className = '' }: AfricaMapProps) => {
  const isHighlighted = (country: string) => 
    highlightedCountries.some(h => country.toLowerCase().includes(h.toLowerCase()));

  return (
    <div className={`w-full h-full flex items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 800 900"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="mapGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(18 70% 52%)" />
            <stop offset="100%" stopColor="hsl(42 88% 58%)" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Stylized Africa continent */}
        <motion.path
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, ease: "easeOut" }}
          d="M 300 80 
             Q 320 90, 340 85
             Q 380 75, 420 95
             Q 460 115, 490 150
             Q 520 185, 530 230
             Q 540 275, 535 320
             Q 530 365, 520 410
             Q 510 455, 495 500
             Q 480 545, 460 580
             Q 440 615, 410 640
             Q 380 665, 350 680
             Q 320 695, 290 700
             Q 260 705, 230 695
             Q 200 685, 180 665
             Q 160 645, 150 615
             Q 140 585, 135 550
             Q 130 515, 130 480
             Q 130 445, 135 410
             L 145 370
             Q 150 340, 155 310
             Q 160 280, 170 250
             Q 180 220, 195 190
             Q 210 160, 230 135
             Q 250 110, 275 95
             Q 290 85, 300 80 Z"
          fill={highlightedCountries.length > 0 ? "url(#mapGradient)" : "hsl(var(--muted))"}
          stroke="hsl(var(--primary))"
          strokeWidth="3"
          className="transition-all duration-700"
          filter={highlightedCountries.length > 0 ? "url(#glow)" : undefined}
        />

        {/* Regional decorative markers */}
        {highlightedCountries.length > 0 && (
          <>
            <motion.circle
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.8] }}
              transition={{ duration: 0.6, delay: 0.2 }}
              cx="340"
              cy="120"
              r="8"
              fill="hsl(var(--accent))"
              className="animate-pulse"
            />
            <motion.circle
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.8] }}
              transition={{ duration: 0.6, delay: 0.3 }}
              cx="250"
              cy="350"
              r="8"
              fill="hsl(var(--accent))"
              className="animate-pulse"
            />
            <motion.circle
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.8] }}
              transition={{ duration: 0.6, delay: 0.4 }}
              cx="420"
              cy="450"
              r="8"
              fill="hsl(var(--accent))"
              className="animate-pulse"
            />
          </>
        )}

        {/* Connecting lines when highlighted */}
        {highlightedCountries.length > 1 && (
          <motion.g
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 0.4 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <motion.path
              d="M 340 120 Q 300 235, 250 350"
              stroke="hsl(var(--accent))"
              strokeWidth="2"
              strokeDasharray="5,5"
              fill="none"
            />
            <motion.path
              d="M 250 350 Q 335 400, 420 450"
              stroke="hsl(var(--accent))"
              strokeWidth="2"
              strokeDasharray="5,5"
              fill="none"
            />
          </motion.g>
        )}
      </svg>
    </div>
  );
};
