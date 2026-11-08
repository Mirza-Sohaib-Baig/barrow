import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { config } from "@/lib/config";

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>
            <h1 className="text-3xl leading-snug font-medium">{config.siteName}</h1>
          </CardTitle>
          <CardDescription>Build in progress</CardDescription>
        </CardHeader>
      </Card>
    </main>
  );
}
