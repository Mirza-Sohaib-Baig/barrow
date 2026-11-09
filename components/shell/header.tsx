import Link from "next/link";
import { HeartIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { AccountMenu } from "@/components/shell/account-menu";
import { CartButton } from "@/components/shell/cart-button";
import { SearchForm } from "@/components/shell/search-form";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto grid w-full max-w-[1280px] grid-cols-[auto_1fr] items-center gap-x-2 gap-y-3 px-4 py-3 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-4 md:px-6 lg:px-8">
        <Link
          href="/"
          className="rounded-[var(--radius)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <Logo size="sm" />
        </Link>
        <SearchForm className="col-span-2 md:col-span-1 md:col-start-2 md:row-start-1" />
        <div className="col-start-2 row-start-1 flex items-center gap-1 justify-self-end md:col-start-3">
          <ThemeToggle />
          <AccountMenu />
          <Button
            variant="ghost"
            size="icon"
            className="size-10"
            nativeButton={false}
            render={<Link href="/wishlist" aria-label="Wishlist" />}
          >
            <HeartIcon />
          </Button>
          <CartButton />
        </div>
      </div>
    </header>
  );
}
