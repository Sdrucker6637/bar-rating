export default function TabIntro({
  title,
  sub,
}: {
  title: string;
  sub: string;
}) {
  return (
    <div className="mb-6">
      <div className="mb-1.5 font-mono text-kicker uppercase text-gold">
        Tour de Alcoholism
      </div>
      <h2 className="m-0 font-serif text-title-lg font-medium text-cream">
        {title}
      </h2>
      <p className="mt-2 max-w-[62ch] text-[0.92rem] leading-relaxed text-mist">
        {sub}
      </p>
    </div>
  );
}
