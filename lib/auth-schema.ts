import { z } from "zod";

export type FieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export type AuthResult =
  | { ok: true; data: { name: string } }
  | { ok: false; error: string; fieldErrors: FieldErrors };

const fieldNames = ["name", "email", "password", "confirmPassword"] as const;

type FieldName = (typeof fieldNames)[number];

const emailSchema = z
  .string("Enter a valid email address.")
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address."));

export const signUpSchema = z
  .object({
    name: z
      .string("Enter your name.")
      .trim()
      .min(1, "Enter your name.")
      .max(80, "Name must be 80 characters or fewer."),
    email: emailSchema,
    password: z.string("Use at least 8 characters.").min(8, "Use at least 8 characters."),
    confirmPassword: z.string("Passwords do not match."),
  })
  .superRefine((value, ctx) => {
    if (value.password !== value.confirmPassword) {
      ctx.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match.",
      });
    }
  });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string("Enter your password.").min(1, "Enter your password."),
});

type IssueList = {
  issues: { path: PropertyKey[]; message: string }[];
};

export function fieldErrorsFrom(error: IssueList): FieldErrors {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key !== "string" || !fieldNames.includes(key as FieldName)) continue;
    const name = key as FieldName;
    if (!fieldErrors[name]) fieldErrors[name] = issue.message;
  }
  return fieldErrors;
}

export function authFailure(fieldErrors: FieldErrors): AuthResult {
  const error =
    fieldErrors.name ??
    fieldErrors.email ??
    fieldErrors.password ??
    fieldErrors.confirmPassword ??
    "Check the highlighted fields.";
  return { ok: false, error, fieldErrors };
}
