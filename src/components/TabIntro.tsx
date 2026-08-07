export default function TabIntro({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-4">
      <h2 className="m-0 font-serif text-[1.4rem] font-medium tracking-[-0.01em] text-cream">
        {title}
      </h2>
      <p className="mt-1.5 max-w-[62ch] text-[0.88rem] leading-normal text-mist">
        {sub}
      </p>
    </div>
  );
}
