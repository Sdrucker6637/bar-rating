"use client";

import { useTour } from "@/lib/tour-context";
import MapView from "@/components/MapView";
import TabIntro from "@/components/TabIntro";

export default function MapPage() {
  const { bars } = useTour();
  return (
    <div>
      <TabIntro
        title="Tour Map"
        sub="Every stop on the tour — top-rated visits glow warm, wishlist spots cluster by neighborhood."
      />
      <MapView bars={bars || []} />
    </div>
  );
}
