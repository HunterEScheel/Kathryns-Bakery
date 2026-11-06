export default function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="muted loading" aria-busy="true">
      {label}
    </p>
  );
}
