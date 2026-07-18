import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CoinIcon, FlameIcon } from "../components/ui";

const Check = (): JSX.Element => (
  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-sm font-black text-accent" aria-hidden>
    ✓
  </span>
);

export const LandingPage = (): JSX.Element => {
  useEffect(() => {
    document.title = "Money Marathon — Play, Complete Offers & Earn Rewards";
  }, []);

  return (
    <main className="overflow-hidden">
      <section className="hero-grid relative border-b border-hairline">
        <div className="pointer-events-none absolute left-1/2 top-10 h-80 w-80 -translate-x-1/2 rounded-full bg-accent/10 blur-[100px] sm:left-auto sm:right-0 sm:translate-x-0" />
        <div className="relative mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:py-20">
          <div className="animate-float-up">
            <span className="chip border border-accent/30 bg-accent/10 text-accent">
              PLAY • COMPLETE • REDEEM
            </span>
            <h1 className="mt-6 max-w-3xl font-display text-5xl font-bold leading-[0.98] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
              Make every task count with <span className="text-accent">Money Marathon.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-ink-soft sm:text-lg">
              Discover live app offers, complete clear tasks, upload proof and collect coins after approval. Play Tic Tac Toe while you explore the Reward Zone.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/rewards" className="btn-accent px-7 py-3.5 text-sm tracking-wide">
                EXPLORE REWARDS
              </Link>
              <a href="#how-it-works" className="btn-ghost px-7 py-3.5 text-sm">
                See how it works
              </a>
            </div>
            <p className="mt-4 max-w-lg text-xs leading-relaxed text-ink-muted">
              Rewards depend on offer availability, eligibility and proof approval. Money Marathon does not promise guaranteed earnings.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-md animate-float-up [animation-delay:120ms]">
            <div className="absolute -inset-8 rounded-full bg-accent/10 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2.25rem] border border-accent/30 bg-bgbottom p-3 shadow-[0_30px_100px_rgba(0,0,0,.45)]">
              <div className="rounded-[1.65rem] border border-hairline bg-gradient-to-b from-bgtop to-bgbottom p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-ink-muted">YOUR JOURNEY</p>
                    <p className="font-display text-xl font-bold">Reward Zone</p>
                  </div>
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-accent/10 text-accent"><FlameIcon /></span>
                </div>
                <div className="mt-5 rounded-card border border-accent/30 bg-accent/5 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><CoinIcon size={24} /><span className="font-numbers text-lg font-bold text-accent">COINS</span></div>
                    <span className="chip bg-accent/10 text-accent">LIVE</span>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-soft">Complete an eligible task and submit a clear screenshot for review.</p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="glass-card p-4">
                    <p className="text-2xl" aria-hidden>✕ ○</p>
                    <p className="mt-5 font-display font-bold">Tic Tac Toe</p>
                    <p className="text-xs text-ink-muted">Quick play</p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-2xl text-accent" aria-hidden>↗</p>
                    <p className="mt-5 font-display font-bold">App offers</p>
                    <p className="text-xs text-ink-muted">From our live feed</p>
                  </div>
                </div>
                <div className="btn-accent mt-4 w-full py-3 text-sm">KEEP MOVING</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how-it-works" className="scroll-mt-24 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <p className="font-display text-sm font-bold tracking-[.2em] text-accent">HOW IT WORKS</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">A clear route from offer to reward.</h2>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              ["01", "Choose a live offer", "Browse eligible app offers delivered by the Money Marathon backend. Each offer explains the task and reward."],
              ["02", "Complete the task", "Open the official Play Store listing and follow the offer instructions. Availability and eligibility can vary."],
              ["03", "Submit proof", "Upload a clear screenshot. Approved proofs credit the stated coins to your Money Marathon wallet."],
            ].map(([number, title, body]) => (
              <article key={number} className="glass-card p-6 sm:p-7">
                <span className="font-numbers text-sm font-bold text-accent">{number}</span>
                <h3 className="mt-8 font-display text-xl font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-ink-soft">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-hairline bg-surface/30 py-20 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="font-display text-sm font-bold tracking-[.2em] text-accent">BUILT FOR CLARITY</p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-5xl">Rewards without the guesswork.</h2>
            <p className="mt-5 max-w-xl leading-7 text-ink-soft">Money Marathon keeps the journey focused: real offers from the backend, transparent task instructions and a review status you can follow.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              ["Live offer feed", "No hard-coded offer cards in the app."],
              ["Clear proof flow", "See whether a submission is pending, approved or needs more proof."],
              ["Account controls", "Access privacy information and request account deletion."],
              ["Reward links", "Approved redemptions can be fulfilled through Xoxoday Plum."],
            ].map(([title, body]) => (
              <div key={title} className="flex gap-3 rounded-card border border-hairline bg-bgtop/70 p-5">
                <Check />
                <div><h3 className="font-display font-bold">{title}</h3><p className="mt-1 text-sm leading-6 text-ink-soft">{body}</p></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="rounded-[2rem] border border-accent/30 bg-accent/5 px-6 py-12 shadow-glow-sm sm:px-12 sm:py-16">
            <h2 className="font-display text-3xl font-bold sm:text-5xl">Ready for your next milestone?</h2>
            <p className="mx-auto mt-4 max-w-2xl leading-7 text-ink-soft">Explore the current Reward Zone now, then continue in the Money Marathon Android app when it is available on Google Play.</p>
            <Link to="/rewards" className="btn-accent mt-7 px-8 py-3.5 text-sm">VIEW LIVE OFFERS</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-hairline py-10">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 text-sm text-ink-muted sm:flex-row sm:items-center sm:px-6">
          <p>© 2026 Money Marathon. All rights reserved.</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 sm:ml-auto" aria-label="Legal">
            <a href="/privacy-policy.html" className="hover:text-accent">Privacy Policy</a>
            <a href="/terms.html" className="hover:text-accent">Terms</a>
            <a href="/support.html" className="hover:text-accent">Support</a>
            <a href="/delete-account.html" className="hover:text-accent">Delete account</a>
          </nav>
        </div>
      </footer>
    </main>
  );
};
