// Accessible form controls: every input has a visible label; help text and errors are
// linked with aria-describedby; invalid inputs carry aria-invalid.
import type { InputHTMLAttributes, ReactNode } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { t } from '../../i18n';
import { Alert } from '../icons';
import { errorVars } from './errorVars';

const labelClass = 'block text-base font-semibold text-stone-900';
const helpClass = 'mt-1 text-sm text-stone-600';

const describedBy = (...ids: (string | false | undefined)[]) =>
  ids.filter(Boolean).join(' ') || undefined;

export function FieldError({ id, messageKey }: { id: string; messageKey: string | undefined }) {
  if (!messageKey) return null;
  return (
    <p id={id} className="mt-2 flex items-start gap-1.5 text-sm font-medium text-red-700">
      <Alert className="mt-0.5 size-4 shrink-0" />
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
      <legend className={labelClass}>{legend}</legend>
      {help && (
        <p id={helpId} className={helpClass}>
          {help}
        </p>
      )}
      <div className={`mt-3 grid gap-2 ${grid}`}>
        {options.map((o) => (
          <label
            key={o.value}
            className="flex min-h-13 cursor-pointer items-center gap-3 rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-stone-900 shadow-xs transition-colors hover:border-stone-400 hover:bg-stone-50 has-checked:border-green-800 has-checked:bg-green-50 has-checked:font-semibold has-checked:ring-1 has-checked:ring-green-800 has-focus-visible:outline-3 has-focus-visible:outline-offset-2 has-focus-visible:outline-green-800"
          >
            <input
              type="radio"
              value={o.value}
              {...registration}
              aria-invalid={error ? true : undefined}
              aria-describedby={describedBy(helpId, error && errorId)}
              className="radio-dot"
            />
            <span>
              {o.label}
              {o.description && (
                <span className="block text-sm font-normal text-stone-600">{o.description}</span>
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
  /** A short visual prefix inside the box, e.g. ₹. Decorative: the label already says it. */
  prefix?: string;
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
  prefix,
  ...rest
}: TextFieldProps) {
  const id = `${name}-input`;
  const helpId = help ? `${name}-help` : undefined;
  const errorId = `${name}-error`;
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {help && (
        <p id={helpId} className={helpClass}>
          {help}
        </p>
      )}
      <div className="relative mt-2">
        {prefix && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-lg font-semibold text-stone-500"
          >
            {prefix}
          </span>
        )}
        <input
          id={id}
          {...rest}
          {...registration}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(helpId, error && errorId)}
          className={`field ${prefix ? 'pl-9' : ''} ${
            error ? 'border-red-700' : 'border-stone-300'
          } ${className ?? ''}`}
        />
      </div>
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
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {help && (
        <p id={helpId} className={helpClass}>
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
        className={`field mt-2 ${error ? 'border-red-700' : 'border-stone-300'}`}
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
    <div className="flex items-start gap-3 rounded-xl bg-stone-50 p-3.5 ring-1 ring-stone-200">
      <input
        id={id}
        type="checkbox"
        {...registration}
        aria-describedby={helpId}
        className="check-box mt-0.5"
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
