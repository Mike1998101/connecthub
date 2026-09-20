import { Suspense } from "react";
import HomeClient from "./HomeClient";

export default function HomePage() {
  return (
    <Suspense fallback={<p className="px-4 text-sm text-slate-500">Loading feed…</p>}>
      <HomeClient />
    </Suspense>
  );
}
