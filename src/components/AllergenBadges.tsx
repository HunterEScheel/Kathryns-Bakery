export default function AllergenBadges({ allergens }: { allergens: string[] }) {
  if (!allergens.length) return null;
  return (
    <div className="badges">
      {allergens.map((a) => (
        <span key={a} className="badge allergen">
          {a}
        </span>
      ))}
    </div>
  );
}
