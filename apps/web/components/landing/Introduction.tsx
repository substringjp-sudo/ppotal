import React from "react";
import Image from "next/image";
import { Compass, FileEdit, Map, Award, TrendingUp, Layers } from "lucide-react";
import styles from "./Introduction.module.css";

const ScoringDiagram: React.FC = () => {
  return (
    <div className={styles.diagramContainer}>
      <div className={styles.levelRow}>
        <div className={styles.visual}>
          <div className={`${styles.shape} ${styles.pass}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2" />
              <circle cx="7" cy="17" r="2" />
              <path d="M9 17h6" />
              <circle cx="17" cy="17" r="2" />
            </svg>
          </div>
        </div>
        <div className={styles.info}>
          <h4>Pass <span className={styles.ptsBadge}>1 pt</span></h4>
          <p>Traveling through a region by car, train, or plane without a stop.</p>
        </div>
      </div>
      <div className={styles.levelRow}>
        <div className={styles.visual}>
          <div className={`${styles.shape} ${styles.transit}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <rect x="4" y="3" width="16" height="15" rx="2" />
              <path d="M4 11h16" />
              <path d="M8 15h.01" />
              <path d="M16 15h.01" />
              <path d="m6 18-2 3" />
              <path d="m18 18 2 3" />
            </svg>
          </div>
        </div>
        <div className={styles.info}>
          <h4>Transit <span className={styles.ptsBadge}>2 pts</span></h4>
          <p>Short layovers at stations, airports, or highway rest areas.</p>
        </div>
      </div>
      <div className={styles.levelRow}>
        <div className={styles.visual}>
          <div className={`${styles.shape} ${styles.visit}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
        </div>
        <div className={styles.info}>
          <h4>Visit <span className={styles.ptsBadge}>5 pts</span></h4>
          <p>Actually stepping foot in the area to eat, sightsee, or explore.</p>
        </div>
      </div>
      <div className={styles.levelRow}>
        <div className={styles.visual}>
          <div className={`${styles.shape} ${styles.stay}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <path d="M2 4v16" />
              <path d="M2 8h18a2 2 0 0 1 2 2v10" />
              <path d="M2 17h20" />
              <path d="M6 8v9" />
            </svg>
          </div>
        </div>
        <div className={styles.info}>
          <h4>Stay <span className={styles.ptsBadge}>10 pts</span></h4>
          <p>Experiencing the local night by staying at least one night.</p>
        </div>
      </div>
      <div className={styles.levelRow}>
        <div className={styles.visual}>
          <div className={`${styles.shape} ${styles.residence}`}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
        </div>
        <div className={styles.info}>
          <h4>Residence <span className={styles.ptsBadge}>40 pts</span></h4>
          <p>Living or having a base in the region for an extended period.</p>
        </div>
      </div>
    </div>
  );
};

export const Introduction: React.FC = () => {
  return (
    <div className={styles.container}>
      {/* Section 1: Hero / Welcome */}
      <section className={styles.section}>
        <div className={styles.textBlock}>
          <div className="flex items-center gap-3 mb-2">
            <Compass className="w-8 h-8 text-blue-600" />
            <h2 className="!mb-0">Quantify Your Footsteps</h2>
          </div>
          <p>
            Regionevel is a travel achievement platform designed for true explorers.
            We don't just mark countries; we measure the depth of your journey.
            Visualize your global presence from macro provinces to micro districts.
          </p>
        </div>
        <div className={styles.imageBlock}>
          <Image
            src="/images/landing/hero.png"
            alt="World Map Preview"
            width={600}
            height={600}
            priority
          />
        </div>
      </section>

      {/* Section 2: Scoring System */}
      <section className={styles.section}>
        <div className={styles.textBlock}>
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            <h2 className="!mb-0">Sophisticated Scoring</h2>
          </div>
          <p>
            Our system assigns weights to your experiences. A simple drive-thru 
            isn't the same as a month-long residency. Points are aggregated and
            normalized across hierarchical levels to calculate your unique 
            <strong> Travel Index</strong>.
          </p>
          <p className="text-sm italic text-slate-500">
            * Higher scores unlock deeper color intensities on your personal map.
          </p>
        </div>
        <div className={styles.imageBlock}>
          <ScoringDiagram />
        </div>
      </section>

      {/* Section 3: How to Use */}
      <section className={styles.section}>
        <div className={styles.textBlock}>
          <div className="flex items-center gap-3 mb-2">
            <Layers className="w-8 h-8 text-blue-600" />
            <h2 className="!mb-0">Mastering the Map</h2>
          </div>
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-[2px] bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-blue-200">
                <Map className="w-4 h-4" />
              </div>
              <p className="mt-1"><strong>Explore:</strong> Use the interactive map to navigate through continents and countries.</p>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-[2px] bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-blue-200">
                <FileEdit className="w-4 h-4" />
              </div>
              <p className="mt-1"><strong>Record:</strong> Click on a region to open the editor and select your visit level.</p>
            </div>
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-[2px] bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-blue-200">
                <Award className="w-4 h-4" />
              </div>
              <p className="mt-1"><strong>Visualize:</strong> Watch your occupancy rate grow as you drill down into cities and towns.</p>
            </div>
          </div>
        </div>
        <div className={styles.imageBlock}>
          <Image
            src="/images/landing/exploration.png"
            alt="Drill-down Hierarchy"
            width={600}
            height={600}
          />
        </div>
      </section>
    </div>
  );
};
