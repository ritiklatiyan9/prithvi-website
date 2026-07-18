import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { FlameIcon } from "./components/ui";
import { useAuth } from "./lib/auth";
import { LandingPage } from "./pages/LandingPage";
import { OfferDetailsPage } from "./pages/OfferDetailsPage";
import { OffersPage } from "./pages/OffersPage";
import { SubmissionsPage } from "./pages/SubmissionsPage";
import { SubmitProofPage } from "./pages/SubmitProofPage";

const Header = (): JSX.Element => {
  const auth = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-bgtop/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent shadow-glow-sm">
            <FlameIcon />
          </span>
          <span className="font-display text-lg font-bold tracking-tight sm:text-xl">
            Money <span className="text-accent">Marathon</span>
          </span>
        </Link>
        <nav className="ml-auto hidden items-center gap-6 text-sm font-semibold text-ink-soft sm:flex" aria-label="Main navigation">
          <Link to="/rewards" className="transition-colors hover:text-accent">Rewards</Link>
          <a href="/#how-it-works" className="transition-colors hover:text-accent">How it works</a>
          <a href="/support.html" className="transition-colors hover:text-accent">Support</a>
        </nav>
        <Link
          to="/submissions"
          className="ml-auto flex items-center gap-1.5 rounded-full border border-hairline bg-surface-alt px-3.5 py-2 text-xs font-semibold text-ink-soft transition-transform active:scale-[0.97] sm:ml-3"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
            <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
          </svg>
          My proofs
          {auth && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
        </Link>
      </div>
    </header>
  );
};

export const App = (): JSX.Element => (
  <BrowserRouter>
    <Header />
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/rewards" element={<OffersPage />} />
      <Route path="/offers/:slug" element={<OfferDetailsPage />} />
      <Route path="/submit/:slug" element={<SubmitProofPage />} />
      <Route path="/submissions" element={<SubmissionsPage />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  </BrowserRouter>
);
