import { InputHTMLAttributes, forwardRef } from 'react';

interface Props extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, Props>(({ label, error, className = '', ...rest }, ref) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-sand text-sm font-arabic">{label}</label>}
    <input
      ref={ref}
      className={`bg-night-accent border ${error ? 'border-danger' : 'border-gold/20'}
        rounded-lg px-4 py-2.5 text-sand-light placeholder-sand/40 outline-none
        focus:border-gold/60 focus:ring-1 focus:ring-gold/20 transition-all font-arabic
        ${className}`}
      {...rest}
    />
    {error && <p className="text-danger text-xs font-arabic">{error}</p>}
  </div>
));

Input.displayName = 'Input';
