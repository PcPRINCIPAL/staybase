const PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5.5h4V20"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="16" rx="3"/><path d="M3.5 10h17M8 2.8V6.5M16 2.8V6.5"/>',
  chat: '<path d="M21 12a8.5 8.5 0 0 1-8.5 8.5c-1.5 0-2.9-.3-4.1-1L3 21l1.6-4.6A8.5 8.5 0 1 1 21 12Z"/>',
  tag: '<path d="M3.5 12.6V5A1.5 1.5 0 0 1 5 3.5h7.6c.4 0 .8.2 1 .5l6.9 6.8a1.5 1.5 0 0 1 0 2.2l-7.5 7.5a1.5 1.5 0 0 1-2.2 0L4 13.7a1.6 1.6 0 0 1-.5-1.1Z"/><circle cx="8.7" cy="8.7" r="1.4"/>',
  sparkle: '<path d="M12 3l1.9 5.4L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.6L12 3Z"/><path d="M19 15.5l.9 2.3 2.1.9-2.1.9-.9 2.4-.9-2.4-2.1-.9 2.1-.9.9-2.3Z"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-8M21 20H3.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevL: '<path d="M14.5 6 9 12l5.5 6"/>',
  chevR: '<path d="M9.5 6 15 12l-5.5 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  down: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  doc: '<path d="M6.5 3.5h7L18.5 8v12.5h-12V3.5Z"/><path d="M13 3.5V8.5h5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5"/>',
  check: '<path d="M4.5 12.5 10 18 19.5 7"/>',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 17 }: { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: PATHS[name] }}
    />
  );
}

export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <rect width="32" height="32" rx="10" fill="#FF385C" />
      <path d="M9 17.2 16 10l7 7.2" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.5 16v6.5h9V16" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
