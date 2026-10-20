// Traditional toolbar icons for TextBlockEditor (the client's own ask:
// "usar los iconos tradicionales... esa barra de formato de texto debe
// tener el formato tradicional con iconos") -- plain inline SVG, 18x18,
// stroke-based, no icon package dependency. currentColor so they follow
// the button's own text color (including the active/hover states).
type IconProps = { className?: string };
const base = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function BoldIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 4h8a4 4 0 0 1 0 8H6zM6 12h9a4 4 0 0 1 0 8H6z" />
    </svg>
  );
}
export function ItalicIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  );
}
export function UnderlineIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 4v6a6 6 0 0 0 12 0V4" />
      <line x1="5" y1="21" x2="19" y2="21" />
    </svg>
  );
}
export function StrikethroughIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M6 7c0-2 2-3.5 6-3.5s6 1.5 6 3" />
      <path d="M7 17c0 2 2 3.5 5.5 3.5S18 19 18 17.5" />
      <line x1="4" y1="12" x2="20" y2="12" />
    </svg>
  );
}
function HeadingIcon({ level, className }: { level: 1 | 2 | 3 } & IconProps) {
  return (
    <svg {...base} strokeWidth={2} className={className}>
      <path d="M4 4v16M12 4v16M4 12h8" />
      <text x={14.5} y={17} fontSize={10} fontWeight={700} fill="currentColor" stroke="none">
        {level}
      </text>
    </svg>
  );
}
export function H1Icon(props: IconProps) {
  return <HeadingIcon level={1} {...props} />;
}
export function H2Icon(props: IconProps) {
  return <HeadingIcon level={2} {...props} />;
}
export function H3Icon(props: IconProps) {
  return <HeadingIcon level={3} {...props} />;
}
export function ParagraphIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M12 4h6a3.5 3.5 0 0 1 0 7h-2" />
      <line x1="14" y1="4" x2="14" y2="20" />
      <line x1="10" y1="4" x2="10" y2="20" />
    </svg>
  );
}
export function BulletListIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <circle cx="4.5" cy="6" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="12" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="4.5" cy="18" r="1.3" fill="currentColor" stroke="none" />
      <line x1="9" y1="6" x2="21" y2="6" />
      <line x1="9" y1="12" x2="21" y2="12" />
      <line x1="9" y1="18" x2="21" y2="18" />
    </svg>
  );
}
export function NumberListIcon({ className }: IconProps) {
  return (
    <svg {...base} strokeWidth={1.8} className={className}>
      <text x={2} y={9} fontSize={7} fill="currentColor" stroke="none">1</text>
      <text x={2} y={15.5} fontSize={7} fill="currentColor" stroke="none">2</text>
      <text x={2} y={22} fontSize={7} fill="currentColor" stroke="none">3</text>
      <line x1="9" y1="6" x2="21" y2="6" />
      <line x1="9" y1="12" x2="21" y2="12" />
      <line x1="9" y1="18" x2="21" y2="18" />
    </svg>
  );
}
export function AlignLeftIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="14" y2="12" />
      <line x1="4" y1="18" x2="17" y2="18" />
    </svg>
  );
}
export function AlignCenterIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="5.5" y1="18" x2="18.5" y2="18" />
    </svg>
  );
}
export function AlignRightIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="10" y1="12" x2="20" y2="12" />
      <line x1="7" y1="18" x2="20" y2="18" />
    </svg>
  );
}
export function AlignJustifyIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="18" x2="20" y2="18" />
    </svg>
  );
}
export function LinkIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <path d="M10 14a4.5 4.5 0 0 0 6.4.3l2.1-2.1a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2" />
      <path d="M14 10a4.5 4.5 0 0 0-6.4-.3l-2.1 2.1a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2" />
    </svg>
  );
}
export function ImageIcon({ className }: IconProps) {
  return (
    <svg {...base} className={className}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="M4 17l5-5 3 3 3-3 5 5" />
    </svg>
  );
}
