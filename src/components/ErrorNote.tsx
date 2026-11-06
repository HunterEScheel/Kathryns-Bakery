export default function ErrorNote({ error }: { error: string | null | undefined }) {
  if (!error) return null;
  return <p className="alert error">{error}</p>;
}
