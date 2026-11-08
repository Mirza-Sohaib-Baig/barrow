import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="flex max-w-xl flex-col items-start gap-6">
      <h1 className="text-display">A quieter way to shop</h1>
      <Button
        className="h-10 px-4"
        nativeButton={false}
        render={<Link href="#todays-deals" />}
      >
        Shop today&apos;s deals
      </Button>
    </section>
  );
}
