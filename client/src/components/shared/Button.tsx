import { ButtonHTMLAttributes, ReactNode } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  loading?: boolean;
}

export function Button({ variant = 'primary', size = 'md', children, loading, className = '', ...rest }: Props) {
  const base = 'inline-flex items-center justify-center font-arabic font-semibold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-gradient-to-r from-gold-dark to-gold text-night shadow-lg shadow-gold/25 hover:shadow-gold/40 hover:scale-[1.02] active:scale-95',
    secondary: 'bg-transparent border border-gold/50 text-gold hover:bg-gold/10 hover:border-gold',
    danger: 'bg-danger text-white hover:bg-red-700 active:scale-95',
    ghost: 'bg-transparent text-sand hover:text-gold hover:bg-night-accent',
  };

  const sizes = {
    sm: 'text-sm px-3 py-1.5',
    md: 'text-base px-5 py-2.5',
    lg: 'text-lg px-7 py-3',
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading || rest.disabled} {...rest}>
      {loading ? <span className="animate-spin mr-2">⟳</span> : null}
      {children}
    </button>
  );
}
