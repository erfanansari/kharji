'use client';

import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { Eye, EyeOff } from 'lucide-react';
import { useController, useFormContext } from 'react-hook-form';

import type { FormFieldBaseProps } from '../../@types';

interface FormInputProps extends FormFieldBaseProps {
  type?: 'text' | 'email' | 'password';
  autoComplete?: string;
  /** id of a <datalist> to offer as suggestions. */
  list?: string;
}

const FormInput = ({
  name,
  label,
  type = 'text',
  placeholder,
  disabled,
  autoComplete,
  list,
  className,
}: FormInputProps) => {
  const t = useTranslations('common');
  const { control } = useFormContext();
  const { field, fieldState } = useController({ name, control });
  const [showPassword, setShowPassword] = useState(false);

  const isPassword = type === 'password';
  const inputType = isPassword && showPassword ? 'text' : type;

  return (
    <div className={className}>
      {label && (
        <label htmlFor={name} className="text-text-primary mb-1.5 block text-xs font-medium sm:mb-2 sm:text-sm">
          {label}
        </label>
      )}
      <div className={isPassword ? 'relative' : undefined}>
        <input
          {...field}
          id={name}
          type={inputType}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          list={list}
          aria-invalid={fieldState.invalid || undefined}
          className={`border-border-subtle bg-background text-text-primary placeholder:text-text-muted focus:border-primary w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none sm:px-4 sm:py-3 sm:text-base ${
            isPassword ? 'pe-10 sm:pe-12' : ''
          } ${fieldState.error ? 'border-danger' : ''}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="text-text-muted hover:text-text-secondary focus-visible:ring-blue/30 absolute end-2.5 top-1/2 -translate-y-1/2 rounded-md focus-visible:ring-2 focus-visible:outline-none sm:end-3"
            aria-label={showPassword ? t('hidePassword') : t('showPassword')}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>
        )}
      </div>
      {fieldState.error?.message && <p className="text-danger mt-1 text-xs">{fieldState.error.message}</p>}
    </div>
  );
};

export default FormInput;
