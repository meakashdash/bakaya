// Accessible form controls: every input has a visible label; help text and errors are
// linked with aria-describedby; invalid inputs carry aria-invalid.
import type { InputHTMLAttributes, ReactNode } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { t } from '../../i18n';
import { errorVars } from './errorVars';

const describedBy = (...ids: (string | false | undefined)[]) =>
  ids.filter(Boolean).join(' ') || undefined;

export function FieldError({ id, messageKey }: { id: string; messageKey: string | undefined }) {
  if (!messageKey) return null;
  return (
    <p id={id} className="mt-2 flex gap-1.5 text-sm font-medium text-red-700">
      <span aria-hidden="true">!</span>
      {t(messageKey, errorVars())}
    </p>
  );
}

type RadioGroupProps = {
  name: string;
  legend: ReactNode;
  help?: ReactNode;
  options: readonly { value: string; label: string; description?: string }[];
  registration: UseFormRegisterReturn;
  error: string | undefined;
  /** Lay options out in two columns (short labels like Yes/No). */
  columns?: 1 | 2 | 3;
};

export function RadioGroup({
  name,
  legend,
  help,
  options,
  registration,
  error,
  columns = 1,
}: RadioGroupProps) {
  const helpId = help ? `${name}-help` : undefined;
  const errorId = `${name}-error`;
  const grid = { 1: 'grid-cols-1', 2: 'grid-cols-2', 3: 'grid-cols-3' }[columns];
  return (
    <fieldset>
      <legend className="text-base font-semibold text-stone-900">{legend}</legend>
      {help && (
        <p id={helpId} className="mt-1 text-sm text-stone-600">
          {help}
        </p>
      )}
      <div className={`mt-3 grid gap-2 ${grid}`}>
        {options.map((o) => (
          <label
            key={o.value}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 has-checked:border-green-800 has-checked:bg-green-50 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-800"
          >
            <input
              type="radio"
              value={o.value}
              {...registration}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy(helpId, error && errorId)}
              className="size-5 shrink-0 accent-green-800 focus-visible:outline-none"
            />
            <span>
              {o.label}
              {o.description && (
                <span className="block text-sm text-stone-600">{o.description}</span>
              )}
            </span>
          </label>
        ))}
      </div>
      <FieldError id={errorId} messageKey={error} />
    </fieldset>
  );
}

type TextFieldProps = {
  name: string;
  label: ReactNode;
  help?: ReactNode;
  registration: UseFormRegisterReturn;
  error: string | undefined;
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'name'>;

export function TextField({
  name,
  label,
  help,
  registration,
  error,
  className,
  ...rest
}: TextFieldProps) {
  const id = `${name}-input`;
  const helpId = help ? `${name}-help` : undefined;
  const errorId = `${name}-error`;
  return (
    <div>
      <label htmlFor={id} className="block text-base font-semibold text-stone-900">
        {label}
      </label>
      {help && (
        <p id={helpId} className="mt-1 text-sm text-stone-600">
          {help}
        </p>
      )}
      <input
        id={id}
        {...rest}
        {...registration}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(helpId, error && errorId)}
        className={`mt-2 block min-h-12 w-full rounded-lg border bg-white px-3 py-2.5 text-lg text-stone-900 placeholder:text-stone-500 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-green-800 ${
          error ? 'border-red-700' : 'border-stone-400'
        } ${className ?? ''}`}
      />
      <FieldError id={errorId} messageKey={error} />
    </div>
  );
}

type TextAreaProps = {
  name: string;
  label: ReactNode;
  help?: ReactNode;
  registration: UseFormRegisterReturn;
  error: string | undefined;
  rows?: number;
  autoComplete?: string;
};

export function TextArea({
  name,
  label,
  help,
  registration,
  error,
  rows = 3,
  autoComplete,
}: TextAreaProps) {
  const id = `${name}-input`;
  const helpId = help ? `${name}-help` : undefined;
  const errorId = `${name}-error`;
  return (
    <div>
      <label htmlFor={id} className="block text-base font-semibold text-stone-900">
        {label}
      </label>
      {help && (
        <p id={helpId} className="mt-1 text-sm text-stone-600">
          {help}
        </p>
      )}
      <textarea
        id={id}
        rows={rows}
        autoComplete={autoComplete}
        {...registration}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(helpId, error && errorId)}
        className={`mt-2 block w-full rounded-lg border bg-white px-3 py-2.5 text-lg text-stone-900 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-green-800 ${
          error ? 'border-red-700' : 'border-stone-400'
        }`}
      />
      <FieldError id={errorId} messageKey={error} />
    </div>
  );
}

export function Checkbox({
  name,
  label,
  help,
  registration,
}: {
  name: string;
  label: ReactNode;
  help?: ReactNode;
  registration: UseFormRegisterReturn;
}) {
  const id = `${name}-input`;
  const helpId = help ? `${name}-help` : undefined;
  return (
    <div className="flex items-start gap-3">
      <input
        id={id}
        type="checkbox"
        {...registration}
        aria-describedby={helpId}
        className="mt-0.5 size-6 shrink-0 accent-green-800"
      />
      <div>
        <label htmlFor={id} className="font-semibold text-stone-900">
          {label}
        </label>
        {help && (
          <p id={helpId} className="mt-0.5 text-sm text-stone-600">
            {help}
          </p>
        )}
      </div>
    </div>
  );
}
