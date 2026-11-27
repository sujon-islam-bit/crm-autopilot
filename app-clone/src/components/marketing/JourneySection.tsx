"use client";

import dynamic from "next/dynamic";
import JourneyStatic from "./JourneyStatic";

const JourneyScene = dynamic(() => import("./JourneyScene"), {
  ssr: false,
  loading: () => <JourneyStatic />,
});

export default function JourneySection() {
  return <JourneyScene />;
}
