import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { config } from "@/lib/config";

const columns = [
  {
    title: "Shop",
    links: config.departments.map((department) => ({
      href: `/c/${department.slug}`,
      label: department.label,
    })),
  },
  {
    title: "Help",
    links: [
      { href: "/help/delivery", label: "Delivery" },
      { href: "/help/returns", label: "Returns" },
      { href: "/help/contact", label: "Contact" },
    ],
  },
  {
    title: "Account",
    links: [
      { href: "/sign-in", label: "Sign in" },
      { href: "/sign-up", label: "Create account" },
      { href: "/orders", label: "Orders" },
      { href: "/wishlist", label: "Wishlist" },
    ],
  },
  {
    title: "About",
    links: [{ href: "#unaffiliated-notice", label: "This rebuild" }],
  },
] as const;

export function Footer() {
  return (
    <footer className="mt-12 border-t border-border bg-background">
      <div className="mx-auto grid w-full max-w-[1280px] gap-8 px-4 py-12 md:px-6 lg:grid-cols-[auto_1fr] lg:px-8">
        <Logo size="md" />
        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {columns.map((column) => (
            <div key={column.title} className="flex flex-col gap-3">
              <h2 className="text-small font-medium text-foreground">{column.title}</h2>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-small text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <p
        id="unaffiliated-notice"
        className="mx-auto w-full max-w-[1280px] px-4 pb-8 text-small text-muted-foreground md:px-6 lg:px-8"
      >
        Barrow is a portfolio rebuild and is not affiliated with Amazon. Catalogue text and
        reviews come from a public research dataset.
      </p>
    </footer>
  );
}
