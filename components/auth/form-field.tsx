import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type FormFieldProps = {
  field: {
    id: string;
    label: string;
    type: "text" | "email" | "password";
    autoComplete: string;
  };
  value: string;
  error?: string;
  onBlur: () => void;
  onChange: (value: string) => void;
};

export function FormField({ field, value, error, onBlur, onChange }: FormFieldProps) {
  const errorId = `${field.id}-error`;

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={field.id}>{field.label}</Label>
      <Input
        id={field.id}
        name={field.id}
        type={field.type}
        value={value}
        autoComplete={field.autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onBlur={onBlur}
        onChange={(event) => onChange(event.target.value)}
        className="h-10"
      />
      {error ? (
        <p id={errorId} role="alert" className="text-small text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
