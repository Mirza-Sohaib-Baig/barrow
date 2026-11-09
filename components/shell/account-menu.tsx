"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UserIcon } from "lucide-react";
import { signOut } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const guestItems = [
  { href: "/signin", label: "Sign in" },
  { href: "/signup", label: "Create account" },
] as const;

function sentenceCase(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

export function AccountMenu({ firstName = null }: { firstName?: string | null }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const label = firstName === null ? null : sentenceCase(firstName);

  function onSignOut() {
    if (pending) return;
    setPending(true);
    void signOut()
      .then(() => {
        router.push("/");
        router.refresh();
      })
      .catch(() => {
        setPending(false);
      });
  }

  if (label === null) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button type="button" variant="ghost" size="icon" className="size-10" aria-label="Account" />
          }
        >
          <UserIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="shadow-float">
          {guestItems.map((item) => (
            <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const visible = label.length > 0 ? label : "Account";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            className="h-10 max-w-36 min-w-0 overflow-hidden px-2 text-small"
            aria-label={label.length > 0 ? `Account, ${label}` : "Account"}
          />
        }
      >
        <span className="truncate">{visible}</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="shadow-float">
        <DropdownMenuItem render={<Link href="/account" />}>Account</DropdownMenuItem>
        <DropdownMenuItem disabled={pending} onClick={onSignOut}>
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
