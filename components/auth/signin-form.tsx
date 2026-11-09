"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signIn } from "@/actions/auth";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { Button } from "@/components/ui/button";
import { fieldErrorsFrom, signInSchema, type FieldErrors } from "@/lib/auth-schema";
import { safeNextPath } from "@/lib/safe-next";
import { textLinkClass } from "@/components/product/metrics";

const demoEmail = "demo@barrow.shop";
const demoPassword = "barrow-demo";

type SignInValues = {
  email: string;
  password: string;
};

type SignInFormProps = {
  nextPath: string | null;
};

function authHref(path: "/signup", nextPath: string | null): string {
  const next = safeNextPath(nextPath);
  if (!nextPath || next === "/") return path;
  return `${path}?next=${encodeURIComponent(next)}`;
}

export function SignInForm({ nextPath }: SignInFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<SignInValues>({ email: "", password: "" });
  const [revealed, setRevealed] = useState<Partial<Record<keyof SignInValues, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const parsed = signInSchema.safeParse(values);
  const clientErrors = parsed.success ? {} : fieldErrorsFrom(parsed.error);

  function errorFor(field: keyof SignInValues): string | undefined {
    if (serverErrors[field]) return serverErrors[field];
    if (!revealed[field]) return undefined;
    return clientErrors[field];
  }

  function revealInvalid() {
    setRevealed((current) => ({
      ...current,
      email: current.email || Boolean(clientErrors.email),
      password: current.password || Boolean(clientErrors.password),
    }));
  }

  function change(field: keyof SignInValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFormError(null);
    setServerErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function blur(field: keyof SignInValues) {
    if (clientErrors[field]) setRevealed((current) => ({ ...current, [field]: true }));
  }

  async function submit(nextValues: SignInValues) {
    setPending(true);
    setFormError(null);
    const resultParsed = signInSchema.safeParse(nextValues);
    if (!resultParsed.success) {
      setRevealed({ email: true, password: true });
      setPending(false);
      return;
    }

    try {
      const result = await signIn(resultParsed.data);
      if (!result.ok) {
        setServerErrors(result.fieldErrors);
        setRevealed((current) => ({
          ...current,
          email: current.email || Boolean(result.fieldErrors.email),
          password: current.password || Boolean(result.fieldErrors.password),
        }));
        setPending(false);
        return;
      }
      router.push(safeNextPath(nextPath));
      router.refresh();
    } catch {
      setFormError("We could not sign you in. Try again.");
      setPending(false);
    }
  }

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const resultParsed = signInSchema.safeParse(values);
        if (!resultParsed.success) {
          revealInvalid();
          return;
        }
        void submit(values);
      }}
    >
      <FormField
        field={{ id: "email", label: "Email", type: "email", autoComplete: "email" }}
        value={values.email}
        error={errorFor("email")}
        onBlur={() => blur("email")}
        onChange={(value) => change("email", value)}
      />
      <FormField
        field={{ id: "password", label: "Password", type: "password", autoComplete: "current-password" }}
        value={values.password}
        error={errorFor("password")}
        onBlur={() => blur("password")}
        onChange={(value) => change("password", value)}
      />
      {formError ? (
        <p role="alert" className="text-small text-destructive">
          {formError}
        </p>
      ) : null}
      <SubmitButton idle="Sign in" pendingLabel="Signing in" pending={pending} />
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 w-full"
          disabled={pending}
          onClick={() => {
            const nextValues = { email: demoEmail, password: demoPassword };
            setValues(nextValues);
            void submit(nextValues);
          }}
        >
          Use the demo account
        </Button>
        <p className="text-small text-muted-foreground">
          A demo account is ready so you can look around without registering.
        </p>
      </div>
      <p className="text-body">
        <Link href={authHref("/signup", nextPath)} className={textLinkClass}>
          Create account
        </Link>
      </p>
    </form>
  );
}
