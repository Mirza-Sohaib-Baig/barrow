import { Button } from "@/components/ui/button";

type SubmitButtonProps = {
  idle: string;
  pendingLabel: string;
  pending: boolean;
  variant?: "default" | "outline";
  type?: "submit" | "button";
  onClick?: () => void;
};

export function SubmitButton({
  idle,
  pendingLabel,
  pending,
  variant = "default",
  type = "submit",
  onClick,
}: SubmitButtonProps) {
  return (
    <Button
      type={type}
      variant={variant}
      className="h-10 w-full"
      disabled={pending}
      aria-busy={pending}
      onClick={onClick}
    >
      <span className="grid">
        <span className="col-start-1 row-start-1" aria-hidden={pending}>
          <span className={pending ? "invisible" : undefined}>{idle}</span>
        </span>
        <span className="col-start-1 row-start-1" aria-hidden={!pending}>
          <span className={pending ? undefined : "invisible"}>{pendingLabel}</span>
        </span>
      </span>
    </Button>
  );
}
