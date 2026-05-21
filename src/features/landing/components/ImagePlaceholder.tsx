interface Props {
  label: string;
  className?: string;
}

export function ImagePlaceholder({ label, className = '' }: Props) {
  return (
    <div className={`img-ph ${className}`}>
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1" stroke="currentColor">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="8.5" cy="8.5" r="1.5" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
      <span>{label}</span>
    </div>
  );
}
