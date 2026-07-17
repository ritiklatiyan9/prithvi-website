import { BrowserRouter, Link, Route, Routes } from "react-router-dom";
import { FlameIcon } from "./components/ui";
import { useAuth } from "./lib/auth";
import { OfferDetailsPage } from "./pages/OfferDetailsPage";
import { OffersPage } from "./pages/OffersPage";
import { SubmissionsPage } from "./pages/SubmissionsPage";
import { SubmitProofPage } from "./pages/SubmitProofPage";

const Header = (): JSX.Element => {
  const auth = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-bgtop/80 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-lg items-center gap-3 px-4">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-hairline bg-surface-alt text-accent">
            <FlameIcon />
          </span>
          <span className="font-display text-lg font-bold tracking-tight">
            Reward<span className="text-accent">Hubbb</span>
          </span>
        </Link>
        <Link
          to="/submissions"
          className="ml-auto flex items-center gap-1.5 rounded-full border border-hairline bg-surface-alt px-3.5 py-2 text-xs font-semibold text-ink-soft transition-transform active:scale-[0.97]"
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
      <Route path="/" element={<OffersPage />} />
      <Route path="/offers/:slug" element={<OfferDetailsPage />} />
      <Route path="/submit/:slug" element={<SubmitProofPage />} />
      <Route path="/submissions" element={<SubmissionsPage />} />
      <Route path="*" element={<OffersPage />} />
    </Routes>
  </BrowserRouter>
);
