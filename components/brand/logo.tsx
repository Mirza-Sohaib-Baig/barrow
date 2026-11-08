import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

const sizes = {
  sm: { width: 132, height: 28 },
  md: { width: 188, height: 40 },
} as const;

type LogoProps = SVGProps<SVGSVGElement> & {
  size?: keyof typeof sizes;
};

export function Logo({ size = "sm", className, ...props }: LogoProps) {
  const box = sizes[size];

  return (
    <svg
      viewBox="0 0 188 40"
      width={box.width}
      height={box.height}
      role="img"
      aria-label="Barrow"
      className={cn("text-foreground", className)}
      {...props}
    >
      <g fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 16.5h18.5L21 25H9.2z" />
        <path d="M24.5 18.5 32 11" />
        <path d="M24.5 21.5 33 27" />
        <circle cx="13.5" cy="31" r="4.25" />
      </g>
      <circle cx="13.5" cy="31" r="1.2" fill="currentColor" />
      <text
        x="42"
        y="29"
        fill="currentColor"
        fontFamily="var(--font-display), Georgia, serif"
        fontSize="26"
        fontWeight="600"
      >
        Barrow
      </text>
    </svg>
  );
}
