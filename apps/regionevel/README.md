# Regionevel 🌍

**Regionevel** ([rgnevel.pplaner.com](https://rgnevel.pplaner.com)) is a premium, global travel tracker that allows you to visualize and manage your travel history across three granular administrative levels: **Country**, **Prefecture (State/Province)**, and **City (District/Municipality)**.

Inspired by the "Keikenchi" (Regional Experience) concept, Regionevel helps you discover your regional footprint and "level up" your travel game by providing detailed insights into where you've been and what's left to explore.

## ✨ Key Features

- **Global Coverage**: Comprehensive support for countries and regions worldwide using high-quality boundary data.
- **Granular Tracking**:
  - **Level 1 (Country)**: Track your global reach.
  - **Level 2 (Prefecture/ADM1)**: Record visits to states, provinces, or prefectures.
  - **Level 3 (City/ADM2)**: Deep-dive into specific cities, counties, or municipalities.
- **Visual Footprint**: Interactive maps to visualize your travels with smooth transitions and premium aesthetics.
- **Regional Experience (Keikenchi)**: A scoring system that reflects the depth of your travels in each region.
- **Multi-platform Sync**: Powered by Firebase for seamless synchronization across devices.
- **Multilingual Support**: Fully optimized for English, Korean, and Japanese.

## 🚀 Tech Stack

- **Framework**: [Next.js 15+](https://nextjs.org/) (App Router, Turbopack)
- **Monorepo Management**: [Turborepo](https://turbo.build/) with [pnpm](https://pnpm.io/)
- **State Management**: [Zustand](https://docs.pmnd.rs/zustand/)
- **Backend/Auth**: [Firebase](https://firebase.google.com/) (Firestore, Auth)
- **Mapping**: [Leaflet](https://leafletjs.com/) with GeoJSON boundary data
- **Styling**: Vanilla CSS & Tailwind CSS

## 📂 Project Structure

```text
.
├── apps/
│   └── web/            # Next.js web application
├── packages/
│   ├── types/          # Shared TypeScript type definitions
│   ├── data-store/     # Shared data logic and state management
│   └── utils/          # Common utility functions
└── scripts/            # Data processing and maintenance scripts
```

## 📊 Data Sources & Licensing

This project uses boundary data provided by **geoBoundaries**.

- **Source**: [www.geoboundaries.org](https://www.geoboundaries.org)
- **License**: [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- **Citation**: Runfola, D. et al. (2020) geoBoundaries: A global database of political administrative boundaries. *PLoS ONE* 15(4): e0231866. [https://doi.org/10.1371/journal.pone.0231866](https://doi.org/10.1371/journal.pone.0231866)

If you use data from this project, please ensure you provide appropriate credit to geoBoundaries as required by their license.

## 🛠️ Getting Started

### Prerequisites

- Node.js (v22 or higher)
- pnpm (v10 or higher)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/substringjp-sudo/Regionevel.git
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Configure environment variables:
   Copy `.env.local.example` to `.env.local` in `apps/web/` and fill in your Firebase credentials.

4. Run the development server:
   ```bash
   pnpm dev
   ```

---

Built with ❤️ by the Regionevel Team.
