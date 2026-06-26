import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Leaf, Menu, X } from 'lucide-react';
import { ROLE_HOME, useAuth } from '@/lib/auth.jsx';
import { BODY_FONT, HEADING_FONT } from '@/components/GlassAuthScreen.jsx';

// Public marketing root (Figma design). Signed-in users are redirected to
// their role home via PublicRoot, so this is primarily the logged-out entry.
export default function Landing() {
  // Stop the rubber-band overscroll so neither the dark hero top nor the light
  // footer bottom reveals a background gap when you scroll past the edges.
  useEffect(() => {
    const html = document.documentElement;
    const prev = html.style.overscrollBehavior;
    html.style.overscrollBehavior = 'none';
    return () => {
      html.style.overscrollBehavior = prev;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeroNav />
      <Hero />
      <MissionSection />
      <Footer />
    </div>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────
// Nav links map to in-page section ids (#home/#mission/#contact) so the active
// item can follow the scroll. "Contribute" is the register CTA (a route).
const NAV_LINKS = [
  { label: 'Home', to: '#home' },
  { label: 'About Us', to: '#mission' },
  { label: 'Contribute', to: '/register' },
  { label: 'Contact Us', to: '#contact' },
];
const SPY_IDS = ['home', 'mission', 'contact'];

// Glass pill button used for the hero CTAs.
const glassPill =
  'rounded-full border border-white/50 bg-white/30 px-8 py-4 text-center text-base text-[#F8FDFF] backdrop-blur-[2px] transition-colors hover:bg-white/45';

// Highlights whichever section is crossing the vertical centre of the viewport.
function useScrollSpy(ids) {
  const [activeId, setActiveId] = useState(ids[0]);
  useEffect(() => {
    const els = ids.map((id) => document.getElementById(id)).filter(Boolean);
    if (!els.length) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        });
      },
      { rootMargin: '-45% 0px -45% 0px' },
    );
    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [ids]);
  return activeId;
}

// Fixed top nav — stays visible while scrolling and highlights the active
// section. The white pill reads cleanly over both the hero photo and the
// dark-green sections below.
function HeroNav() {
  const { user } = useAuth();
  const activeId = useScrollSpy(SPY_IDS);
  const [menuOpen, setMenuOpen] = useState(false);
  // The footer (#contact) is a light section, so flip the mobile menu icon to
  // dark there; over the hero photo + dark mission it stays white.
  const onLight = activeId === 'contact';
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 pt-6 sm:px-6">
        {/* Left spacer keeps the pill nav centred on desktop. */}
        <div className="hidden flex-1 md:block" />

        {/* Centered pill nav. The Login CTA lives inside the pill (desktop)
            as a premium gradient button. */}
        <nav className="hidden items-center gap-1 rounded-full border border-[#E2E8F0] bg-white p-1.5 shadow-xl shadow-black/10 md:inline-flex">
          {NAV_LINKS.map(({ label, to }) => {
            // Active when this link's section is the one in view. Nav items use a
            // light-green tint so they read differently from the dark Login CTA.
            const active = to === `#${activeId}`;
            const cls = `rounded-full px-6 py-3 text-base transition-colors ${
              active
                ? 'bg-[#0B5000]/10 font-medium text-[#0B5000]'
                : 'text-[#001F00] hover:bg-[#0B5000]/10 hover:text-[#0B5000]'
            }`;
            return to.startsWith('#') ? (
              <a key={label} href={to} className={cls}>
                {label}
              </a>
            ) : (
              <Link key={label} to={to} className={cls}>
                {label}
              </Link>
            );
          })}
          {!user && (
            <Link
              to="/login"
              className="ml-1 rounded-full bg-gradient-to-br from-[#0B5000] to-[#001F00] px-7 py-3 text-base font-medium text-[#F8FDFF] shadow-[0_10px_24px_-10px_rgba(11,80,0,0.75)] ring-1 ring-white/10 transition-all hover:to-[#0B5000]"
            >
              Login
            </Link>
          )}
        </nav>

        {/* Right: user chip (logged in) or a mobile-only Login (pill is desktop-only) */}
        <div className="flex flex-1 items-center justify-end">
          {user ? (
            <Link
              to={ROLE_HOME[user.role] ?? '/'}
              className="inline-flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-4 text-[#001F00] shadow-lg shadow-black/10"
            >
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#0B5000] text-sm font-semibold text-white">
                {(user.name || 'U')
                  .split(' ')
                  .map((s) => s[0])
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </span>
              <span className="max-w-[140px] truncate text-sm font-medium">{user.name}</span>
              <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
            </Link>
          ) : (
            // Mobile-only menu: a 3-line button that opens Login + quick links.
            // (The desktop pill above already carries the links + Login CTA.)
            <div className="relative md:hidden">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Menu"
                aria-expanded={menuOpen}
                className={`relative z-50 grid h-11 w-11 place-items-center rounded-lg transition-colors focus:outline-none ${
                  onLight
                    ? 'text-[#001F00]'
                    : 'text-white drop-shadow-[0_1px_6px_rgba(0,0,0,0.5)]'
                }`}
              >
                {menuOpen ? (
                  <X className="h-7 w-7" strokeWidth={1.75} />
                ) : (
                  <Menu className="h-7 w-7" strokeWidth={1.75} />
                )}
              </button>
              {menuOpen && (
                <>
                  {/* Tap-away backdrop to dismiss the menu. */}
                  <button
                    type="button"
                    aria-hidden
                    tabIndex={-1}
                    onClick={() => setMenuOpen(false)}
                    className="fixed inset-0 z-40 cursor-default"
                  />
                  <div className="absolute right-0 top-full z-50 mt-2 w-48 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-white p-2 shadow-2xl shadow-black/15">
                    {NAV_LINKS.map(({ label, to }) =>
                      to.startsWith('#') ? (
                        <a
                          key={label}
                          href={to}
                          onClick={() => setMenuOpen(false)}
                          className="block rounded-xl px-4 py-3 text-base text-[#001F00] transition-colors hover:bg-[#0B5000]/10 hover:text-[#0B5000]"
                        >
                          {label}
                        </a>
                      ) : (
                        <Link
                          key={label}
                          to={to}
                          onClick={() => setMenuOpen(false)}
                          className="block rounded-xl px-4 py-3 text-base text-[#001F00] transition-colors hover:bg-[#0B5000]/10 hover:text-[#0B5000]"
                        >
                          {label}
                        </Link>
                      ),
                    )}
                    <Link
                      to="/login"
                      onClick={() => setMenuOpen(false)}
                      className="mt-1 block rounded-xl bg-gradient-to-br from-[#0B5000] to-[#001F00] px-4 py-3 text-center text-base font-medium text-[#F8FDFF]"
                    >
                      Login
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div
      className="flex min-h-[120px] flex-col justify-between rounded-md bg-white p-4 sm:min-h-[160px] sm:p-5"
      style={{ fontFamily: BODY_FONT }}
    >
      <div className="text-sm font-medium text-[#001F00] sm:text-base">{label}</div>
      <div>
        <div
          className="text-3xl font-bold leading-none text-[#001F00] sm:whitespace-nowrap sm:text-[48px]"
          style={{ fontFamily: HEADING_FONT }}
        >
          {value}
        </div>
        <div className="mt-1.5 text-xs font-medium text-[#001F00] sm:text-base">{sub}</div>
      </div>
    </div>
  );
}

function Hero() {
  return (
    <section
      id="home"
      className="relative min-h-screen w-full overflow-hidden"
      style={{ fontFamily: BODY_FONT }}
    >
      <img
        src="/auth-bg.png"
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Gentle darkening for headline legibility — heavier at the bottom. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/10 to-black/45"
      />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-4 sm:px-6">
        {/* Spacer for the fixed nav. */}
        <div aria-hidden className="h-20 sm:h-24" />

        {/* Headline + CTAs */}
        <div className="mt-10 max-w-3xl sm:mt-20 lg:mt-24">
          <h1
            className="text-4xl font-bold leading-[1.12] text-white sm:text-5xl lg:text-[64px] lg:leading-[1.08]"
            style={{ fontFamily: HEADING_FONT }}
          >
            Let’s Save
            <br />
            The Trees Together
          </h1>
          <div className="mt-7 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <Link to="/register" className={glassPill}>
              Make Contribution
            </Link>
            <a href="#mission" className={glassPill + ' sm:min-w-[140px]'}>
              Read More
            </a>
          </div>
        </div>

        {/* Stat cards near the bottom of the photo */}
        <div className="mt-10 grid w-full max-w-3xl grid-cols-2 gap-3 pb-8 sm:mt-auto sm:gap-4 sm:grid-cols-[1fr_1.3fr] sm:pb-16">
          <StatCard label="Plantation Sites" value="123+" sub="Across Gujarat, India" />
          <StatCard
            label={
              <>
                CO<sub>2</sub> Absorbed
              </>
            }
            value="100k Tone"
            sub="Since 2026"
          />
        </div>
      </div>
    </section>
  );
}

// ── Mission + Execution ───────────────────────────────────────────────────
// Deep forest-green section: "Our Mission" pill, the Restore Environment
// headline, lorem copy + Download-App, then the giant "From Thought to
// Execution" ghost headline with the grey decorative circles beneath it.
const MISSION_BG = '#06280F';

function AppleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-8 w-8 text-white" fill="currentColor" aria-hidden>
      <path d="M17.05 12.04c-.03-2.6 2.12-3.85 2.22-3.91-1.21-1.77-3.1-2.01-3.77-2.04-1.6-.16-3.13.94-3.94.94-.81 0-2.07-.92-3.4-.89-1.75.03-3.36 1.02-4.26 2.58-1.82 3.16-.46 7.83 1.3 10.39.86 1.25 1.89 2.66 3.24 2.61 1.3-.05 1.79-.84 3.36-.84 1.57 0 2.01.84 3.39.81 1.4-.02 2.29-1.28 3.15-2.54.99-1.46 1.4-2.87 1.42-2.94-.03-.01-2.73-1.05-2.76-4.16zM14.6 4.84c.72-.87 1.2-2.08 1.07-3.28-1.03.04-2.28.69-3.02 1.56-.66.77-1.24 2-1.08 3.18 1.15.09 2.33-.59 3.03-1.46z" />
    </svg>
  );
}

function PlayMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="currentColor" aria-hidden>
      <path d="M22.018 13.298l-3.919 2.218-3.515-3.493 3.543-3.521 3.891 2.202a1.49 1.49 0 0 1 0 2.594zM1.337.924a1.486 1.486 0 0 0-.112.568v21.017c0 .217.045.419.124.6l11.155-11.087L1.337.924zm12.207 10.065l3.258-3.238L3.45.195a1.466 1.466 0 0 0-.946-.149l11.04 10.943zm0 2.067l-11 10.933c.298.036.612-.016.906-.183l13.324-7.54-3.23-3.21z" />
    </svg>
  );
}

function MissionSection() {
  return (
    <section
      id="mission"
      className="relative scroll-mt-24 overflow-hidden"
      style={{ backgroundColor: MISSION_BG, fontFamily: BODY_FONT }}
    >
      <div className="relative z-10 mx-auto max-w-7xl px-4 pt-20 pb-10 sm:px-6 sm:pt-28 sm:pb-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
          {/* Left — pill + headline */}
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/40 px-8 py-3 text-base text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
              Our Mission
            </span>
            <h2
              className="mt-8 text-3xl font-bold text-white sm:text-4xl lg:text-[40px] xl:text-[48px]"
              style={{ fontFamily: HEADING_FONT, lineHeight: 1.3 }}
            >
              Restore Environment
              <br />
              By Planting More Trees
            </h2>
          </div>

          {/* Right — copy + download */}
          <div className="flex flex-col gap-9">
            <p className="text-base leading-[30px] text-[#F8FDFF]/90">
              Environ makes tree-planting something you can actually see. Sponsors fund the
              saplings, our volunteers plant them across verified sites in Gujarat, and local site
              owners nurture each one as it grows. Every tree you fund is GPS-pinned and
              photographed the day it&apos;s planted, then followed with watering updates from the
              field — no vague annual report, just proof you can scroll as real green cover is
              restored, one tree at a time.
            </p>
            <div className="flex flex-wrap items-center gap-x-10 gap-y-6">
              <a
                href="#"
                className="inline-flex items-center gap-2 rounded-full border border-white/50 bg-white/30 px-9 py-4 text-base text-[#F8FDFF] backdrop-blur-[2px] transition-colors hover:bg-white/40"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden />
                Download Our App
              </a>
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-base text-white">Available On</span>
                <div className="flex items-center gap-5">
                  <AppleMark />
                  <PlayMark />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Closing statement — large faded headline as the section's sign-off. */}
      <div className="overflow-hidden px-4 pb-16 pt-4 text-center sm:px-6 sm:pb-24">
        <div
          className="select-none whitespace-nowrap text-[5.5vw] font-bold leading-none text-[#0B5000]/45"
          style={{ fontFamily: HEADING_FONT }}
          aria-hidden
        >
          From Thought to Execution
        </div>
      </div>
    </section>
  );
}

// A footer link column (Navigate / Discover / Our App).
function FooterCol({ title, links }) {
  return (
    <div>
      <h3 className="text-xl font-medium text-black sm:text-2xl">{title}</h3>
      <ul className="mt-8 flex flex-col gap-5">
        {links.map(([label, to]) => (
          <li key={label}>
            {to.startsWith('#') || to.startsWith('mailto') || to.startsWith('tel') ? (
              <a href={to} className="text-base text-black transition-colors hover:text-[#0B5000]">
                {label}
              </a>
            ) : (
              <Link to={to} className="text-base text-black transition-colors hover:text-[#0B5000]">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Light Figma footer: centred contribution CTA, four link columns
// (the last is Contact Us with pill buttons), then a copyright bar.
function Footer() {
  return (
    <footer
      id="contact"
      className="scroll-mt-24 bg-white text-[#001F00]"
      style={{ fontFamily: BODY_FONT }}
    >
      <div className="mx-auto max-w-7xl px-6 py-16 sm:px-8 sm:py-20 lg:px-12">
        {/* Contribution CTA */}
        <div className="flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0B5000] text-white">
              <Leaf className="h-6 w-6" aria-hidden />
            </span>
            <span className="text-3xl font-bold text-[#001F00]" style={{ fontFamily: HEADING_FONT }}>
              Environ
            </span>
          </div>
          <h2
            className="mt-8 text-2xl font-semibold text-[#001F00] sm:text-[32px]"
            style={{ fontFamily: HEADING_FONT }}
          >
            Make Your First Contribution Today
          </h2>
          <p className="mt-4 max-w-[655px] text-base leading-[25px] tracking-[0.01em] text-[#1E1E1E]">
            Fund your first tree today and watch it grow — every contribution is planted,
            GPS-pinned, and tracked with photo proof from the field.
          </p>
        </div>

        {/* Link columns */}
        <div className="mt-16 grid grid-cols-2 gap-10 sm:mt-20 lg:grid-cols-[1fr_1fr_1fr_1.6fr] lg:gap-8">
          <FooterCol
            title="Navigate"
            links={[
              ['Home', '#home'],
              ['About Us', '#mission'],
              ['Contribute', '/register'],
              ['Get In Touch', '#contact'],
            ]}
          />
          <FooterCol
            title="Discover"
            links={[
              ['Latest News', '#'],
              ['Blogs', '#'],
            ]}
          />
          <FooterCol
            title="Our App"
            links={[
              ['App Store', '#'],
              ['Play Store', '#'],
            ]}
          />
          <div className="col-span-2 lg:col-span-1">
            <h3 className="text-xl font-medium text-black sm:text-2xl">Contact Us</h3>
            <div className="mt-8 flex flex-col gap-5">
              <a
                href="mailto:epcp.envirom@gmail.com"
                className="rounded-full border border-[#1E1E1E] px-8 py-4 text-center text-base text-[#1E1E1E] transition-colors hover:bg-[#1E1E1E]/5"
              >
                epcp.envirom@gmail.com
              </a>
              <a
                href="tel:+917226803611"
                className="rounded-full border border-[#1E1E1E] px-8 py-4 text-center text-base text-[#1E1E1E] transition-colors hover:bg-[#1E1E1E]/5"
              >
                +91 72268 03611
              </a>
            </div>
          </div>
        </div>

        {/* Copyright bar */}
        <div className="mt-16 flex flex-col gap-4 border-t border-[#001F00]/15 pt-6 text-base text-[#001F00] sm:flex-row sm:items-center sm:justify-between">
          <span>&copy; npcpl. All rights reserved {new Date().getFullYear()}</span>
          <div className="flex items-center gap-8">
            <a href="#" className="transition-colors hover:text-[#0B5000]">
              Privacy &amp; Policy
            </a>
            <a href="#" className="transition-colors hover:text-[#0B5000]">
              Terms &amp; Condition
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
