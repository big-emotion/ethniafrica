/**
 * Single carrier of the reserved `--afh-error` token (UX-DR49 rule 3) for the
 * forms/account/contribution family. Consuming files stay filename-generic
 * (page.tsx, ContributionForm.tsx, ...) and never reference the token
 * directly, so the afh-error-misuse ESLint rule stays satisfied — only this
 * Error-named file is allowed to carry it.
 */

interface FormFieldErrorProps {
  children: React.ReactNode;
  id?: string;
  variant?: "inline" | "banner";
  role?: "alert" | "status";
}

const VARIANT_CLASSES: Record<
  NonNullable<FormFieldErrorProps["variant"]>,
  string
> = {
  inline: "text-afh-small font-medium text-afh-error",
  banner:
    "rounded-afh-base border border-afh-error bg-afh-error/10 px-3 py-2 text-afh-small text-afh-error",
};

// @req REQ-045
export function FormFieldError({
  children,
  id,
  variant = "inline",
  role = "alert",
}: FormFieldErrorProps) {
  if (!children) return null;

  return (
    <p role={role} id={id} className={VARIANT_CLASSES[variant]}>
      {children}
    </p>
  );
}
