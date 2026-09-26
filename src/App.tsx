import { lazy, Suspense, useEffect } from "react";
import {
  BrowserRouter,
  Link,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { FlameIcon, GoogleSignInButton } from "./components/ui";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { clearSession, useAuth } from "./lib/auth";
import { isEmbedded } from "./lib/bridge";
import { LandingPage } from "./pages/LandingPage";

// Route chunks keep Firebase, roulette and proof tooling off the landing-page
// critical path. Named-export adapters preserve the existing page API.
const OffersPage = lazy(() =>
  import("./pages/OffersPage").then(({ OffersPage }) => ({
    default: OffersPage,
  })),
);
const RoulettePage = lazy(() =>
  import("./pages/RoulettePage").then(({ RoulettePage }) => ({
    default: RoulettePage,
  })),
);
const OfferDetailsPage = lazy(() =>
  import("./pages/OfferDetailsPage").then(({ OfferDetailsPage }) => ({
    default: OfferDetailsPage,
  })),
);
const SubmitProofPage = lazy(() =>
  import("./pages/SubmitProofPage").then(({ SubmitProofPage }) => ({
    default: SubmitProofPage,
  })),
);
const SubmissionsPage = lazy(() =>
  import("./pages/SubmissionsPage").then(({ SubmissionsPage }) => ({
    default: SubmissionsPage,
  })),
);

const RouteFallback = (): JSX.Element => (
  <div
    className="mx-auto w-full max-w-lg space-y-4 px-4 py-8"
    aria-live="polite"
  >
    <div className="skeleton h-10 w-2/3" />
    <div className="skeleton h-48" />
    <span className="sr-only">Loading page</span>
  </div>
);

/** React Router hash navigation without forcing a document reload. */
const HashScroller = (): null => {
  const { hash, pathname } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const frame = requestAnimationFrame(() =>
      document
        .getElementById(decodeURIComponent(hash.slice(1)))
        ?.scrollIntoView(),
    );
    return () => cancelAnimationFrame(frame);
  }, [hash, pathname]);
  return null;
};

const GamesPage = lazy(() =>
  import("./pages/GamesPage").then(({ GamesPage }) => ({ default: GamesPage })),
);
const GamePlayerPage = lazy(() =>
  import("./pages/GamesPage").then(({ GamePlayerPage }) => ({
    default: GamePlayerPage,
  })),
);

const RoutedContent = (): JSX.Element => {
  const location = useLocation();
  return (
    // A location key resets a route-level crash as soon as the user navigates.
    <ErrorBoundary key={location.key}>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/rewards" element={<OffersPage />} />
          <Route path="/roulette" element={<RoulettePage />} />
          <Route path="/games" element={<GamesPage />} />
          <Route path="/games/play/:key" element={<GamePlayerPage />} />
          <Route path="/offers/:slug" element={<OfferDetailsPage />} />
          <Route path="/submit/:slug" element={<SubmitProofPage />} />
          <Route path="/submissions" element={<SubmissionsPage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
};

const Header = (): JSX.Element => {
  const auth = useAuth();
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-bgtop/90 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-2 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 max-[380px]:hidden items-center justify-center rounded-xl border border-accent/30 bg-accent/10 text-accent shadow-glow-sm">
            <FlameIcon />
          </span>
          <span className="font-display text-sm font-extrabold tracking-tight sm:text-xl">
            Money <span className="ml-1 text-accent">Marathon</span>
          </span>
        </Link>
        <nav
          className="ml-auto hidden items-center gap-6 text-sm font-semibold text-ink-soft sm:flex"
          aria-label="Main navigation"
        >
          <Link to="/rewards" className="transition-colors hover:text-accent">
            Rewards
          </Link>
          <Link to="/roulette" className="transition-colors hover:text-accent">
            Roulette
          </Link>
          {!isEmbedded() && (
            <Link to="/games" className="transition-colors hover:text-accent">
              Games
            </Link>
          )}
          <Link
            to="/#how-it-works"
            className="transition-colors hover:text-accent"
          >
            How it works
          </Link>
          <a
            href="/support.html"
            className="transition-colors hover:text-accent"
          >
            Support
          </a>
        </nav>
        <Link
          to="/submissions"
          aria-label="My proofs"
          className="ml-auto flex items-center gap-1.5 rounded-full border border-hairline bg-surface-alt px-3.5 py-2 text-xs font-semibold text-ink-soft transition-transform active:scale-[0.97] sm:ml-3"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01" />
          </svg>
          <span className="max-[380px]:hidden">Proofs</span>
          {auth && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
        </Link>
        {/* Standalone browser only — the embedded app WebView is left untouched. */}
        {!isEmbedded() &&
          (auth ? (
            <div className="ml-3 flex items-center gap-2">
              <span className="hidden max-w-[9rem] truncate text-xs font-semibold text-ink-soft sm:inline">
                {auth.user.name}
              </span>
              <button
                type="button"
                onClick={() => {
                  // Local logout must be instant and work offline. Firebase is
                  // a best-effort lazy cleanup, not part of the interaction.
                  clearSession();
                  void import("./lib/firebase").then(({ signOutFirebase }) =>
                    signOutFirebase(),
                  );
                }}
                className="btn-ghost px-3.5 py-2 text-xs"
              >
                Sign out
              </button>
            </div>
          ) : (
            <GoogleSignInButton
              className="btn-ghost ml-1 shrink-0 px-3 py-2 text-xs"
              label="Sign in"
            />
          ))}
      </div>
    </header>
  );
};

export const App = (): JSX.Element => (
  <BrowserRouter>
    <HashScroller />
    <Header />
    <RoutedContent />
  </BrowserRouter>
);
