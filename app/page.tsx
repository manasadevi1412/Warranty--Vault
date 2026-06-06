import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const today = new Date();
  const issue = `Vol. 01 · Issue ${String(today.getMonth() + 1).padStart(2, "0")}/${today.getFullYear()}`;

  return (
    <div className="max-w-[1100px] mx-auto px-5 sm:px-8">
      {/* Masthead */}
      <div className="pt-10 sm:pt-16 flex items-center justify-between gap-4">
        <div className="folio">{issue}</div>
        <div className="folio hidden sm:block">A private records archive</div>
      </div>
      <div className="rule-thick mt-3" />

      {/* Hero */}
      <section className="pt-12 sm:pt-20 pb-16 sm:pb-24 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <div className="eyebrow mb-6">Feature №01 — A new way to remember</div>
          <h1 className="display text-[14vw] sm:text-[88px] lg:text-[120px] leading-[0.92]">
            Every<br />
            warranty<br />
            <span className="display-italic text-accent">remembered.</span>
          </h1>
          <p className="serif text-lg sm:text-xl mt-8 max-w-[34ch] text-ink-2 leading-[1.5]">
            Snap the card. Our reader fills in brand, dates, helpline.
            You get a quiet nudge before anything expires — and a
            one-tap line to support when it matters.
          </p>

          <div className="mt-10 flex flex-wrap items-center gap-4">
            {session ? (
              <Link href="/dashboard" className="btn btn-ink">Open archive →</Link>
            ) : (
              <Link href="/login" className="btn btn-ink">Begin — it&apos;s free</Link>
            )}
            <Link href="#how" className="link text-sm">How it works</Link>
          </div>
        </div>

        {/* Sidecar: stat block */}
        <aside className="lg:col-span-4 lg:pl-8 lg:border-l lg:border-rule flex flex-col gap-8 self-end">
          <Stat number="30 · 14 · 7 · 3 · 1" caption="Days before expiry we'll nudge you" />
          <Stat number="< 5s" caption="From snap to filled-in form" />
          <Stat number="1 tap" caption="To reach the brand's support line" />
        </aside>
      </section>

      {/* Pull quote */}
      <section className="py-16 sm:py-24 border-y border-rule">
        <div className="max-w-[700px] mx-auto text-center">
          <div className="eyebrow mb-4">From the desk</div>
          <p className="display-italic text-[7vw] sm:text-[44px] leading-[1.05] text-ink">
            &ldquo;The receipt was always in the drawer until the day the
            washing machine died — which is also the day the drawer was
            empty.&rdquo;
          </p>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="py-16 sm:py-24">
        <div className="grid sm:grid-cols-3 gap-px bg-rule">
          <Feature
            n="I"
            title="Snap"
            body="Take a photo of the warranty card or invoice. Any angle, any glare — the reader handles it."
          />
          <Feature
            n="II"
            title="Review"
            body="Brand, model, helpline and dates fill in. Tweak anything if you like, then save it."
          />
          <Feature
            n="III"
            title="Forget"
            body="A push reminder lands a month, a week and a day before expiry. Tap to call the brand."
          />
        </div>
      </section>

      {/* Closer */}
      <section className="py-20 sm:py-28 text-center">
        <div className="eyebrow mb-4">Subscribe to your own memory</div>
        <h2 className="display text-[10vw] sm:text-[64px]">
          Begin the <span className="display-italic text-accent">archive.</span>
        </h2>
        <div className="mt-8 flex justify-center">
          {session ? (
            <Link href="/dashboard" className="btn btn-ink">Open archive</Link>
          ) : (
            <Link href="/login" className="btn btn-ink">Sign in with Google</Link>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({ number, caption }: { number: string; caption: string }) {
  return (
    <div>
      <div className="mono text-sm text-accent">{number}</div>
      <div className="serif text-base text-ink-2 mt-1 leading-snug">{caption}</div>
    </div>
  );
}

function Feature({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <article className="bg-paper p-8 sm:p-10 flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="folio">Step {n}</span>
        <span className="folio">№</span>
      </div>
      <h3 className="display text-4xl">{title}</h3>
      <p className="serif text-base text-ink-2 leading-relaxed">{body}</p>
    </article>
  );
}
