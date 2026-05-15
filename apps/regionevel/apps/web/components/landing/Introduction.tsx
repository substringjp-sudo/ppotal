import React from "react";
import Image from "next/image";
import { } from "lucide-react";
import styles from "./Introduction.module.css";

const ScoringDiagram: React.FC = () => {
  return (
    <div className={styles.diagramContainer}>
      <div className={styles.levelRow}>
        <div className={styles.info}>
          <h4>Pass <span className={styles.ptsBadge}>1 pt</span></h4>
          <p>Traveling through a region by car, train, or plane without a stop.</p>
        </div>
      </div>
      <div className={styles.levelRow}>
        <div className={styles.info}>
          <h4>Transit <span className={styles.ptsBadge}>2 pts</span></h4>
          <p>Short layovers at stations, airports, or highway rest areas.</p>
        </div>
      </div>
      <div className={styles.levelRow}>
        <div className={styles.info}>
          <h4>Visit <span className={styles.ptsBadge}>5 pts</span></h4>
          <p>Actually stepping foot in the area to eat, sightsee, or explore.</p>
        </div>
      </div>
      <div className={styles.levelRow}>
        <div className={styles.info}>
          <h4>Stay <span className={styles.ptsBadge}>10 pts</span></h4>
          <p>Experiencing the local night by staying at least one night.</p>
        </div>
      </div>
      <div className={styles.levelRow}>
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
          <h2 className="!mb-0">Global Journey Mapping</h2>
          <p>
            Go beyond just marking countries. Track your journey down to states, provinces, and cities. 
            Visualize your personal exploration history in detail.
          </p>
        </div>
        <div className={styles.imageBlock}>
          <Image
            src="/images/landing/hero.png"
            alt="Map Preview"
            width={600}
            height={600}
            priority
          />
        </div>
      </section>

      {/* Section 2: Scoring System */}
      <section className={styles.section}>
        <div className={styles.textBlock}>
          <h2 className="!mb-0">Visit Level Scoring</h2>
          <p>
            Every visit is different. Whether you&apos;re just passing through or living there, 
            each level adds points to your score and colors your map.
          </p>
          <p className="text-xs italic text-slate-500">
            * Higher scores create deeper colors on your personalized map.
          </p>
        </div>
        <div className={styles.imageBlock}>
          <ScoringDiagram />
        </div>
      </section>

      {/* Section 2: How to Use */}
      <section className={styles.section}>
        <div className={styles.textBlock}>
          <h2 className="!mb-0">Exploration Workflow</h2>
          <div className="flex flex-col gap-3 mt-1">
            <div className="flex flex-col gap-1">
              <p><strong>Regional Discovery:</strong> Click any area on the map to dive deeper into local regions.</p>
            </div>
            <div className="flex flex-col gap-1">
              <p><strong>Visit Categorization:</strong> Select your visit level—from a quick pass to a local stay.</p>
            </div>
            <div className="flex flex-col gap-1">
              <p><strong>Insights & Growth:</strong> Watch your occupancy rate grow as you explore more cities.</p>
            </div>
          </div>
        </div>
        <div className={styles.imageBlock}>
          <Image
            src="/images/landing/exploration.png"
            alt="Hierarchy View"
            width={600}
            height={600}
          />
        </div>
      </section>
    </div>
  );
};
