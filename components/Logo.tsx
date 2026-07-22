export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="inline-flex select-none items-center gap-2.5">
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="2.5" y="2.5" width="19" height="19" rx="3.5" className="fill-raised stroke-edge-bright" />
        <path d="M6 15.5L9.15 12.35L11.9 14.9L18 8.65" className="stroke-ink" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="18" cy="8.65" r="1.35" className="fill-accent" />
      </svg>
      <span className="text-[17px] font-medium tracking-[0.01em] text-ink">QuantPilot</span>
    </span>
  );
}
