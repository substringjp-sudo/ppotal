import { MapView } from "./map/MapView";

export const metadata = {
  title: "Regional Travel Map - Track Your Footprint | Regionevel",
  description: "Interactive global map to track your travels at country, prefecture, and city levels. Visualize your regional footprint and level up.",
};

export default function Home() {
  return <MapView />;
}
