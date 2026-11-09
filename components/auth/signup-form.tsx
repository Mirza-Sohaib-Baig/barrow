"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signUp } from "@/actions/auth";
import { FormField } from "@/components/auth/form-field";
import { SubmitButton } from "@/components/auth/submit-button";
import { textLinkClass } from "@/components/product/metrics";
import { fieldErrorsFrom, signUpSchema, type FieldErrors } from "@/lib/auth-schema";
import { safeNextPath } from "@/lib/safe-next";

type SignUpValues = {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
};

type SignUpFormProps = {
  nextPath: string | null;
};

function authHref(path: "/signin", nextPath: string | null): string {
  const next = safeNextPath(nextPath);
  if (!nextPath || next === "/") return path;
  return `${path}?next=${encodeURIComponent(next)}`;
}

export function SignUpForm({ nextPath }: SignUpFormProps) {
  const router = useRouter();
  const [values, setValues] = useState<SignUpValues>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [revealed, setRevealed] = useState<Partial<Record<keyof SignUpValues, boolean>>>({});
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const parsed = signUpSchema.safeParse(values);
  const clientErrors = parsed.success ? {} : fieldErrorsFrom(parsed.error);

  function errorFor(field: keyof SignUpValues): string | undefined {
    if (serverErrors[field]) return serverErrors[field];
    if (!revealed[field]) return undefined;
    return clientErrors[field];
  }

  function change(field: keyof SignUpValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
    setFormError(null);
    setServerErrors((current) => {
      if (!current[field] && !(field === "password" && current.confirmPassword)) return current;
      const next = { ...current };
      delete next[field];
      if (field === "password") delete next.confirmPassword;
      return next;
    });
  }

  function blur(field: keyof SignUpValues) {
    if (clientErrors[field]) setRevealed((current) => ({ ...current, [field]: true }));
  }

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const resultParsed = signUpSchema.safeParse(values);
        if (!resultParsed.success) {
          setRevealed((current) => ({
            ...current,
            name: current.name || Boolean(clientErrors.name),
            email: current.email || Boolean(clientErrors.email),
            password: current.password || Boolean(clientErrors.password),
            confirmPassword: current.confirmPassword || Boolean(clientErrors.confirmPassword),
          }));
          return;
        }

        setPending(true);
        setFormError(null);
        void signUp(resultParsed.data)
          .then((result) => {
            if (!result.ok) {
              setServerErrors(result.fieldErrors);
              setRevealed((current) => ({
                ...current,
                name: current.name || Boolean(result.fieldErrors.name),
                email: current.email || Boolean(result.fieldErrors.email),
                password: current.password || Boolean(result.fieldErrors.password),
                confirmPassword: current.confirmPassword || Boolean(result.fieldErrors.confirmPassword),
              }));
              setPending(false);
              return;
            }
            router.push(safeNextPath(nextPath));
            router.refresh();
          })
          .catch(() => {
            setFormError("We could not create your account. Try again.");
            setPending(false);
          });
      }}
    >
      <FormField
        field={{ id: "name", label: "Name", type: "text", autoComplete: "name" }}
        value={values.name}
        error={errorFor("name")}
        onBlur={() => blur("name")}
        onChange={(value) => change("name", value)}
      />
      <FormField
        field={{ id: "email", label: "Email", type: "email", autoComplete: "email" }}
        value={values.email}
        error={errorFor("email")}
        onBlur={() => blur("email")}
        onChange={(value) => change("email", value)}
      />
      <FormField
        field={{ id: "password", label: "Password", type: "password", autoComplete: "new-password" }}
        value={values.password}
        error={errorFor("password")}
        onBlur={() => blur("password")}
        onChange={(value) => change("password", value)}
      />
      <FormField
        field={{
          id: "confirmPassword",
          label: "Confirm password",
          type: "password",
          autoComplete: "new-password",
        }}
        value={values.confirmPassword}
        error={errorFor("confirmPassword")}
        onBlur={() => blur("confirmPassword")}
        onChange={(value) => change("confirmPassword", value)}
      />
      {formError ? (
        <p role="alert" className="text-small text-destructive">
          {formError}
        </p>
      ) : null}
      <SubmitButton idle="Create account" pendingLabel="Creating account" pending={pending} />
      <p className="text-body">
        <Link href={authHref("/signin", nextPath)} className={textLinkClass}>
          Sign in
        </Link>
      </p>
    </form>
  );
}
