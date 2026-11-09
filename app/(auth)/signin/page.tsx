import Link from "next/link";
import { SignInForm } from "@/components/auth/signin-form";
import { Logo } from "@/components/brand/logo";

type SignInPageProps = {
  searchParams: Promise<{ next?: string | string[] }>;
};

function readNext(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const params = await searchParams;

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/"
        className="w-fit rounded-[var(--radius)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <Logo size="sm" />
      </Link>
      <h1 className="text-h1">Sign in</h1>
      <SignInForm nextPath={readNext(params.next)} />
    </div>
  );
}
