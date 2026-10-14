import type { ReactNode, SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size = 18): SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
});
const make = (children: ReactNode) =>
  function Icon({ size, ...rest }: P) {
    return (
      <svg {...base(size)} {...rest}>
        {children}
      </svg>
    );
  };

export const SearchIcon = make(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const MenuIcon = make(<><path d="M4 7h16M4 12h10M4 17h16" /></>);
export const ChevronDown = make(<path d="m6 9 6 6 6-6" />);
export const ChevronUp = make(<path d="m6 15 6-6 6 6" />);
export const ChevronRight = make(<path d="m9 6 6 6-6 6" />);
export const PlusIcon = make(<path d="M12 5v14M5 12h14" />);
export const BackIcon = make(<><path d="M19 12H5" /><path d="m11 18-6-6 6-6" /></>);
export const EditIcon = make(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></>);
export const RefreshIcon = make(<><path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" /></>);
export const CloseIcon = make(<path d="M18 6 6 18M6 6l12 12" />);
export const HelpIcon = make(<><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.6 2.6 0 1 1 3.6 2.4c-.7.4-1.1.9-1.1 1.6M12 17h.01" /></>);
export const ChatIcon = make(<><path d="M20 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2Z" /><path d="M9 9h6M9 12.5h3" /></>);
export const FullscreenIcon = make(<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />);
export const PlayIcon = make(<path d="M7 5v14l11-7Z" />);
export const ExternalIcon = make(<><path d="M14 4h6v6" /><path d="M20 4 10 14" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>);

export const TrashIcon = make(<><path d="M4 7h16" /><path d="M9 7V4h6v3" /><path d="M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /></>);
export const CopyIcon = make(<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" /></>);
export const DotsIcon = make(<><circle cx="5" cy="12" r="1.2" fill="currentColor" /><circle cx="12" cy="12" r="1.2" fill="currentColor" /><circle cx="19" cy="12" r="1.2" fill="currentColor" /></>);
export const CheckIcon = make(<path d="m5 12.5 4.2 4.2L19 7" />);

export function StarIcon({ filled, size = 20 }: { filled?: boolean; size?: number }) {
  return (
    <svg {...base(size)} fill={filled ? 'currentColor' : 'none'}>
      <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.3-4.1 5.9-.9Z" />
    </svg>
  );
}

export function GripIcon() {
  return (
    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor" aria-hidden="true">
      {[2, 7, 12].map((y) => (
        <g key={y}>
          <circle cx="2" cy={y} r="1.1" />
          <circle cx="8" cy={y} r="1.1" />
        </g>
      ))}
    </svg>
  );
}

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <path d="M4 27V8l8.5 9.5V27z" fill="#5b8def" />
      <path d="M12.5 17.5 20 8v19l-7.5-9.5z" fill="#2b4764" />
      <path d="M20 8l8 9.5V27l-8-9.5z" fill="#5b8def" />
    </svg>
  );
}
