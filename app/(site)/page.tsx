import { Hero } from "@/components/home/hero";
import { HomeCatalogue } from "@/components/home/home-catalogue";

export default function HomePage() {
  return (
    <main className="flex flex-col gap-12">
      <Hero />
      <HomeCatalogue />
    </main>
  );
}
