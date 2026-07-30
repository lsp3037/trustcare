import React from 'react';
import { cn } from '@/lib/utils';

/**
 * `useId()` gera ids com `:` (ex.: `:r4:`), válidos em HTML mas que quebram
 * ferramentas que montam seletores CSS a partir do `for` do label sem
 * escapar (`:` é caractere especial em CSS). Id estável sem esse risco.
 */
function useSanitizedId() {
  return React.useId().replace(/:/g, '');
}

const CONTROL =
  'w-full bg-surface-sunken border border-border text-text placeholder:text-text-subtle ' +
  'px-3 py-2 text-sm transition-colors duration-150 ' +
  'hover:border-border-strong ' +
  'focus:border-brand focus:outline-2 focus:outline-offset-0 focus:outline-brand/40 ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const INVALID = 'border-danger focus:border-danger focus:outline-danger/40';

interface FieldShellProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

/** Envelope de rótulo/erro/dica. Use quando precisar de um controle customizado. */
export function Field({
  label,
  hint,
  error,
  required,
  htmlFor,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-text-muted">
          {label}
          {required && <span className="text-danger ml-0.5" aria-hidden="true">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="text-xs text-text-subtle">{hint}</p>
      ) : null}
    </div>
  );
}

type WithField = {
  label?: string;
  hint?: string;
  error?: string;
  wrapperClassName?: string;
};

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & WithField
>(function Input({ label, hint, error, wrapperClassName, className, id, ...props }, ref) {
  const autoId = useSanitizedId();
  const fieldId = id ?? autoId;
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={props.required}
      htmlFor={fieldId}
      className={wrapperClassName}
    >
      <input
        ref={ref}
        id={fieldId}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL, error && INVALID, className)}
        {...props}
      />
    </Field>
  );
});

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & WithField
>(function Textarea({ label, hint, error, wrapperClassName, className, id, ...props }, ref) {
  const autoId = useSanitizedId();
  const fieldId = id ?? autoId;
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={props.required}
      htmlFor={fieldId}
      className={wrapperClassName}
    >
      <textarea
        ref={ref}
        id={fieldId}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL, 'resize-y min-h-24', error && INVALID, className)}
        {...props}
      />
    </Field>
  );
});

export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & WithField
>(function Select({ label, hint, error, wrapperClassName, className, id, children, ...props }, ref) {
  const autoId = useSanitizedId();
  const fieldId = id ?? autoId;
  return (
    <Field
      label={label}
      hint={hint}
      error={error}
      required={props.required}
      htmlFor={fieldId}
      className={wrapperClassName}
    >
      <select
        ref={ref}
        id={fieldId}
        aria-label={label}
        aria-invalid={error ? true : undefined}
        className={cn(CONTROL, 'cursor-pointer', error && INVALID, className)}
        {...props}
      >
        {children}
      </select>
    </Field>
  );
});
