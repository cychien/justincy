export function meta() {
  return [{ title: '我的產品 - justincy' }, { name: 'description', content: '我親手打造的產品。' }];
}

export default function Products() {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 pb-24">
      <header className="mx-auto max-w-md space-y-2 pt-10 pb-12 text-center">
        <h1 className="text-foreground text-2xl font-semibold tracking-normal">我的產品</h1>
        <p className="text-[15px] leading-relaxed tracking-wide text-zinc-500">我親手打造的產品</p>
      </header>

      <p className="text-muted-foreground text-center text-sm tracking-wide">還沒有產品。</p>
    </section>
  );
}
