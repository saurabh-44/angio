import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion';
import {
  ArrowRight,
  Camera,
  CheckCircle2,
  Droplets,
  HandCoins,
  Leaf,
  MapPin,
  Menu,
  ShieldCheck,
  Sprout,
} from 'lucide-react';
import { Button } from '@/components/ui/button.jsx';
import { Badge } from '@/components/ui/badge.jsx';

// Public marketing root. Shown to anyone who hits "/" while signed out.
// Signed-in users get redirected to their role home via PublicRoot.
//
// Motion layers on top of the scroll-fade-ups:
//   1. Floating leaf SVGs drifting across the hero — infinite, gentle.
//   2. 3D mouse-follow tilt on the how-it-works + role cards. Cards
//      rotate ~6° toward the cursor on hover.
//
// All disabled when prefers-reduced-motion is set.
export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopNav />
      <Hero />
      <HowItWorks />
      <Roles />
      <TrustBlock />
      <ClosingCta />
      <Footer />
    </div>
  );
}

function useVariants() {
  const reduced = useReducedMotion();
  const transition = reduced
    ? { duration: 0 }
    : { duration: 0.55, ease: [0.22, 1, 0.36, 1] };

  return {
    container: {
      hidden: {},
      show: reduced
        ? { transition: { staggerChildren: 0 } }
        : { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
    },
    fadeUp: {
      hidden: reduced ? { opacity: 1 } : { opacity: 0, y: 24 },
      show: { opacity: 1, y: 0, transition },
    },
    fadeRight: {
      hidden: reduced ? { opacity: 1 } : { opacity: 0, x: -32 },
      show: { opacity: 1, x: 0, transition },
    },
    scaleIn: {
      hidden: reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.96 },
      show: { opacity: 1, scale: 1, transition },
    },
  };
}

function TopNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="inline-flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Leaf className="h-5 w-5" aria-hidden />
          </span>
          <span className="font-heading text-base font-bold tracking-tight">NGO Trees</span>
        </div>

        <nav className="hidden md:flex items-center gap-7 text-sm">
          <a href="#how" className="text-muted-foreground hover:text-foreground transition-colors">How it works</a>
          <a href="#roles" className="text-muted-foreground hover:text-foreground transition-colors">What you get</a>
          <a href="#trust" className="text-muted-foreground hover:text-foreground transition-colors">Why trust it</a>
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex text-[15px]">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="text-sm">
            <Link to="/register">
              Sponsor a tree <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" className="md:hidden" aria-label="Menu">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  const reduced = useReducedMotion();
  const v = useVariants();

  return (
    <section className="relative overflow-hidden">
      {/* Biophilic background washes. */}
      <div className="absolute inset-0 surface-biophilic" aria-hidden />

      {/* Far blobs — slow rotation gives depth without distracting motion. */}
      <div
        aria-hidden
        className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,white,transparent_65%)]"
      >
        <motion.svg
          className="absolute -top-32 -right-20 w-[600px] text-leaf-100 opacity-70"
          viewBox="0 0 200 200"
          animate={reduced ? undefined : { rotate: [0, 8, 0] }}
          transition={reduced ? undefined : { duration: 24, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '50%', originY: '50%' }}
        >
          <path
            fill="currentColor"
            d="M40,-66.5C52,-58,62.5,-49,68.7,-37.7C74.9,-26.4,76.7,-13.2,75.4,-0.7C74.2,11.7,69.8,23.5,63,33.4C56.1,43.4,46.8,51.4,36.2,58.4C25.6,65.3,12.8,71.1,-0.3,71.6C-13.4,72.1,-26.8,67.3,-38.4,60.5C-50,53.7,-59.8,44.9,-66.2,33.8C-72.7,22.7,-75.7,11.3,-75.1,0.3C-74.6,-10.7,-70.4,-21.4,-64,-30.7C-57.6,-39.9,-49,-47.7,-39,-56.6C-29,-65.5,-14.5,-75.5,-0.5,-74.7C13.6,-73.9,27.1,-75,40,-66.5Z"
            transform="translate(100 100)"
          />
        </motion.svg>
        <motion.svg
          className="absolute -bottom-40 -left-20 w-[520px] text-amber-100 opacity-60"
          viewBox="0 0 200 200"
          animate={reduced ? undefined : { rotate: [0, -10, 0] }}
          transition={reduced ? undefined : { duration: 28, repeat: Infinity, ease: 'easeInOut' }}
          style={{ originX: '50%', originY: '50%' }}
        >
          <path
            fill="currentColor"
            d="M52.8,-65.5C66.3,-54.5,73.5,-36.4,76.5,-18.1C79.5,0.3,78.2,18.9,69.8,33.2C61.3,47.5,45.7,57.5,29.4,63.3C13.1,69.1,-4,70.6,-19.6,66.5C-35.3,62.4,-49.6,52.5,-58.5,39C-67.5,25.5,-71.2,8.4,-69.8,-8.1C-68.3,-24.6,-61.8,-40.5,-50.4,-51.7C-39.1,-62.9,-22.8,-69.4,-4.6,-64.3C13.6,-59.2,39.4,-42.4,52.8,-65.5Z"
            transform="translate(100 100)"
          />
        </motion.svg>
      </div>

      <FloatingLeaves disabled={reduced} />

      <motion.div
        className="relative max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20 lg:py-28"
        initial="hidden"
        animate="show"
        variants={v.container}
      >
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          {/* Left — narrative + proof */}
          <div>
            <motion.div variants={v.fadeUp}>
              <Badge variant="default">Transparent tree-planting</Badge>
            </motion.div>
            <motion.h1
              className="mt-6 font-heading text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold tracking-tight leading-[1.05]"
              variants={v.fadeUp}
            >
              See every tree your donation{' '}
              <span className="text-primary">funded.</span>
            </motion.h1>
            <motion.p
              className="mt-5 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed"
              variants={v.fadeUp}
            >
              Sponsors pay. Volunteers plant. Site owners care for the saplings. You get
              geo-tagged photo proof &mdash; from the moment a tree goes in the ground to the day it
              starts giving shade.
            </motion.p>

            <motion.div className="mt-7" variants={v.fadeUp}>
              <Button asChild variant="outline" size="lg">
                <a href="#how">
                  How it works <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </motion.div>

            <motion.div
              className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2.5 text-xs text-muted-foreground"
              variants={v.fadeUp}
            >
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> GPS-pinned
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Photo proof every planting
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Maintenance log &amp; map
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Sponsor-scoped dashboards
              </span>
            </motion.div>

          </div>

          {/* Right — conversion widget */}
          <motion.div variants={v.fadeUp} className="w-full">
            <SponsorWidget />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}

// Hero conversion widget. Lets a logged-out visitor pick how many trees
// to sponsor, stashes that choice in sessionStorage, and sends them to
// register. After signup the order wizard resumes with the count.
function SponsorWidget() {
  const navigate = useNavigate();
  const [count, setCount] = useState(1);
  const clamp = (n) => Math.max(1, Math.min(1000, Math.round(n) || 1));

  function go(note) {
    sessionStorage.setItem('pendingSponsorTrees', String(clamp(count)));
    if (note) sessionStorage.setItem('pendingSponsorNote', note);
    else sessionStorage.removeItem('pendingSponsorNote');
    navigate('/register');
  }

  return (
    <div className="grid gap-4 w-full sm:max-w-md sm:mx-auto lg:ml-auto lg:mr-0">
      {/* Primary — sponsor now */}
      <div className="bento-card relative p-6 sm:p-7 bg-card/95 backdrop-blur border border-border/60 ring-1 ring-black/[0.03] shadow-[0_24px_70px_-28px_rgba(6,78,59,0.35)]">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest text-primary font-medium">
            <Sprout className="h-3.5 w-3.5" aria-hidden /> Sponsor trees
          </div>
          <span className="rounded-full bg-leaf-100 px-2.5 py-0.5 text-[11px] font-semibold text-leaf-700">
            100% trackable
          </span>
        </div>
        <p className="mt-3 text-sm text-muted-foreground">How many trees would you like to fund?</p>
        <div className="mt-4 flex justify-center">
          <Stepper count={count} setCount={setCount} />
        </div>
        <Button className="mt-5 w-full" size="lg" onClick={() => go()}>
          Sponsor now <ArrowRight className="h-4 w-4" />
        </Button>
        <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" aria-hidden />
          Secure payment via Razorpay · GPS + photo proof
        </div>
        <div className="mt-4 border-t border-border/60 pt-3 text-center text-sm text-muted-foreground">
          Already a member?{' '}
          <Link
            to="/login"
            className="font-semibold text-primary underline decoration-primary/30 underline-offset-4 transition-colors hover:decoration-primary"
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Secondary — celebrate */}
      <div className="bento-card p-4 sm:p-5 surface-biophilic border border-border/60 flex items-center gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Leaf className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">Celebrate with plantation</div>
          <p className="text-xs text-muted-foreground leading-snug">
            A birthday, anniversary, or memory in someone's name.
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={() => go('Celebration plantation')}>
          Plant <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function Stepper({ count, setCount }) {
  // Local text state so the field can be cleared and re-typed freely
  // (e.g. wipe "1" to type "20"). We DON'T force the lower bound on every
  // keystroke — that's what made it snap back to 1. Bounds are enforced
  // on blur; +/- always commit a valid number. The order flow re-clamps
  // to >= 1 on continue, so an empty field can never submit 0 trees.
  const [draft, setDraft] = useState(String(count));

  function commit(n) {
    const c = Math.max(1, Math.min(1000, Math.floor(Number(n)) || 1));
    setCount(c);
    setDraft(String(c));
  }

  return (
    <div className="inline-flex items-center rounded-xl border border-border bg-background overflow-hidden">
      <button
        type="button"
        onClick={() => commit(count - 1)}
        className="h-11 w-11 grid place-items-center text-xl hover:bg-secondary cursor-pointer"
        aria-label="Decrease"
      >
        −
      </button>
      <input
        type="text"
        inputMode="numeric"
        value={draft}
        onChange={(e) => {
          const t = e.target.value;
          // Allow empty (mid-edit) or up to 4 digits; ignore other input.
          if (t === '' || /^\d{1,4}$/.test(t)) {
            setDraft(t);
            if (t !== '') setCount(Math.max(1, Math.min(1000, parseInt(t, 10))));
          }
        }}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
        className="h-11 w-16 text-center font-heading text-lg font-bold bg-transparent border-x border-border outline-none"
        aria-label="Number of trees"
      />
      <button
        type="button"
        onClick={() => commit(count + 1)}
        className="h-11 w-11 grid place-items-center text-xl hover:bg-secondary cursor-pointer"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

// Wrapper that tilts its child toward the mouse cursor in 3D, using
// perspective + rotateX/rotateY. `max` is the maximum tilt in degrees
// for any axis. We use spring values so the rotation feels heavy, not
// jittery. Touch devices and reduced-motion get no tilt.
function Tilt3D({ children, max = 8, className }) {
  const reduced = useReducedMotion();
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  // Spring so the tilt eases back to centre, doesn't snap.
  const rxs = useSpring(rx, { stiffness: 120, damping: 14 });
  const rys = useSpring(ry, { stiffness: 120, damping: 14 });

  if (reduced) {
    // Reduced-motion: just a flat div, no perspective, no listeners.
    return <div className={className}>{children}</div>;
  }

  function onMove(e) {
    const r = e.currentTarget.getBoundingClientRect();
    // Normalize -0.5..0.5 across the card.
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ry.set(x * max * 2);
    rx.set(-y * max * 2);
  }
  function onLeave() {
    rx.set(0);
    ry.set(0);
  }

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{
        rotateX: rxs,
        rotateY: rys,
        transformPerspective: 900,
        transformStyle: 'preserve-3d',
      }}
      className={className}
    >
      {/* Inner translateZ lifts the content slightly off the card face —
          gives the rotation a touch of parallax. */}
      <div style={{ transform: 'translateZ(20px)' }}>{children}</div>
    </motion.div>
  );
}

// A handful of slowly drifting leaf SVGs scattered across the hero.
// Each leaf has its own seeded offset/duration so they don't sync up.
function FloatingLeaves({ disabled }) {
  if (disabled) return null;
  // Six leaves, each with a distinct path through the hero. xPct +
  // delay seed the look; duration controls speed.
  const leaves = [
    { left: '10%', size: 22, delay: 0, duration: 18, drift: 40 },
    { left: '28%', size: 16, delay: 4, duration: 22, drift: -30 },
    { left: '48%', size: 26, delay: 2, duration: 20, drift: 50 },
    { left: '66%', size: 14, delay: 6, duration: 24, drift: -45 },
    { left: '82%', size: 20, delay: 1, duration: 19, drift: 35 },
    { left: '92%', size: 18, delay: 8, duration: 26, drift: -50 },
  ];
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
      {leaves.map((l, i) => (
        <motion.svg
          key={i}
          style={{ left: l.left, width: l.size, height: l.size }}
          className="absolute -top-8 text-leaf-500/60"
          viewBox="0 0 24 24"
          fill="currentColor"
          animate={{
            y: ['0%', '110vh'],
            x: [0, l.drift, 0, -l.drift, 0],
            rotate: [0, 90, 180, 270, 360],
            opacity: [0, 0.7, 0.7, 0.7, 0],
          }}
          transition={{
            duration: l.duration,
            delay: l.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          {/* Simplified leaf path */}
          <path d="M12 2c-3 4-7 7-7 12a7 7 0 0 0 14 0c0-5-4-8-7-12z" />
        </motion.svg>
      ))}
    </div>
  );
}

function HowItWorks() {
  const v = useVariants();
  const steps = [
    {
      icon: HandCoins,
      title: 'Sponsor',
      body: 'Choose how many trees to fund and pay securely online. Every contribution is recorded with a date and method.',
    },
    {
      icon: Sprout,
      title: 'NGO allocates',
      body: 'Your trees are assigned to real planting sites, each with a target count — so you can see exactly where they go.',
    },
    {
      icon: Camera,
      title: 'Volunteers plant',
      body: 'On the ground, volunteers capture the GPS location and a photo of every tree as it goes in the soil.',
    },
    {
      icon: ShieldCheck,
      title: 'You verify',
      body: 'Volunteers post fresh watering photos for every tree — pinned on a map you can open any time.',
    },
  ];
  return (
    <section id="how" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          variants={v.container}
        >
          <motion.div variants={v.fadeUp}><Badge variant="success">How it works</Badge></motion.div>
          <motion.h2
            className="mt-4 font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight leading-tight"
            variants={v.fadeUp}
          >
            From your donation to a growing tree.
          </motion.h2>
          <motion.p className="mt-3 text-sm sm:text-base text-muted-foreground" variants={v.fadeUp}>
            Four stages, every one visible to you — just the evidence trail.
          </motion.p>
        </motion.div>

        <motion.ol
          className="mt-14 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={v.container}
        >
          {steps.map((s, i) => (
            <motion.li key={s.title} variants={v.fadeUp} className="h-full">
              <Tilt3D className="h-full">
                <div className="bento-card group/card relative h-full overflow-hidden border-border bg-gradient-to-b from-card to-secondary/25 p-6 flex flex-col gap-5 shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg">
                  {/* Top accent that draws in on hover */}
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-primary to-leaf-400 transition-transform duration-300 group-hover/card:scale-x-100"
                  />
                  <div className="flex items-center justify-between">
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-leaf-100 to-leaf-50 text-leaf-700 ring-1 ring-leaf-200/70 shadow-sm">
                      <s.icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="font-heading text-4xl font-extrabold leading-none text-leaf-300">
                      0{i + 1}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-semibold tracking-tight">{s.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{s.body}</p>
                  </div>
                </div>
              </Tilt3D>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}

function Roles() {
  const v = useVariants();
  const cards = [
    {
      icon: ShieldCheck,
      title: 'Proof, not promises',
      body: 'Every tree you fund is GPS-pinned and photographed the day it goes in the soil — see each one, not a number in a report.',
      tone: 'leaf',
    },
    {
      icon: Camera,
      title: 'Watch them grow',
      body: 'Follow your trees on a live map, with fresh photos from the field as they go from sapling to shade.',
      tone: 'sky',
    },
    {
      icon: MapPin,
      title: 'See where your money goes',
      body: 'Your contribution is tied to real planting sites with target counts — traceable right down to the date.',
      tone: 'amber',
    },
    {
      icon: Leaf,
      title: 'Impact you can show',
      body: 'Get an estimated CO₂ offset and a downloadable certificate for every contribution you make.',
      tone: 'leaf',
    },
  ];
  const tones = {
    leaf: 'bg-leaf-100 text-leaf-700',
    sky: 'bg-secondary text-secondary-foreground',
    amber: 'bg-amber-100 text-amber-600',
  };
  return (
    <section id="roles" className="py-20 sm:py-28 bg-secondary/40 border-y border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          variants={v.container}
        >
          <motion.div variants={v.fadeUp}><Badge variant="success">What you get</Badge></motion.div>
          <motion.h2
            className="mt-4 font-heading text-3xl sm:text-4xl font-bold tracking-tight"
            variants={v.fadeUp}
          >
            Your donation, every step in view.
          </motion.h2>
          <motion.p className="mt-3 mx-auto max-w-2xl text-muted-foreground" variants={v.fadeUp}>
            No vague annual report. From the moment you pay to the day your trees give shade, you can
            follow every one you funded.
          </motion.p>
        </motion.div>

        <motion.div
          className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5"
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={v.container}
        >
          {cards.map((c) => (
            <motion.div key={c.title} variants={v.fadeUp}>
              <Tilt3D max={6} className="h-full">
                <article className="bento-card group/card relative overflow-hidden border-border p-6 sm:p-7 flex items-start gap-5 h-full shadow-sm transition-all duration-300 hover:border-primary/40 hover:shadow-lg">
                  <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-gradient-to-r from-primary to-leaf-400 transition-transform duration-300 group-hover/card:scale-x-100"
                  />
                  <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1 ring-black/[0.04] shadow-sm ${tones[c.tone]}`}>
                    <c.icon className="h-6 w-6" aria-hidden />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-semibold mb-1.5">{c.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{c.body}</p>
                  </div>
                </article>
              </Tilt3D>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function TrustBlock() {
  const v = useVariants();
  const reduced = useReducedMotion();
  const points = [
    [MapPin, "GPS captured at the moment the tree goes in the soil."],
    [Camera, "Photo upload straight from the volunteer's phone."],
    [Droplets, "Watering photos from the field, so you can watch each tree thrive."],
    [ShieldCheck, "A private dashboard — your trees and your data, seen only by you."],
  ];
  return (
    <section id="trust" className="py-20 sm:py-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={v.container}
        >
          <motion.div variants={v.fadeRight}><Badge variant="success">Why trust it</Badge></motion.div>
          <motion.h2
            className="mt-4 font-heading text-3xl sm:text-4xl font-bold tracking-tight"
            variants={v.fadeRight}
          >
            Trust isn't a promise. It's a record.
          </motion.h2>
          <motion.p
            className="mt-4 text-muted-foreground leading-relaxed"
            variants={v.fadeRight}
          >
            Most donations vanish into a pdf annual report. Here, every rupee is tied to a
            specific allocation, every allocation to a specific tree, every tree to a specific
            GPS coordinate, and every tree to a watering photo from the field. You can scroll
            the proof.
          </motion.p>
          <ul className="mt-8 space-y-3">
            {points.map(([Icon, text]) => (
              <motion.li key={text} className="flex items-start gap-3" variants={v.fadeRight}>
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <span className="text-sm text-foreground leading-relaxed pt-1">{text}</span>
              </motion.li>
            ))}
          </ul>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          variants={v.scaleIn}
        >
          <Tilt3D max={5} className="h-full">
            <motion.div
              animate={reduced ? undefined : { y: [0, -6, 0] }}
              transition={reduced ? undefined : { duration: 6, repeat: Infinity, ease: 'easeInOut' }}
              className="bento-card surface-biophilic p-8 sm:p-10 space-y-6"
            >
              <div className="grid grid-cols-3 gap-3">
                {[['GPS', 'Pinned'], ['Photo', 'Proof'], ['Map', 'Live']].map(([v1, l]) => (
                  <div key={l} className="rounded-2xl bg-card/80 backdrop-blur border border-border/60 p-3 text-center">
                    <div className="font-heading text-sm font-bold text-foreground tracking-tight">{v1}</div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">{l}</div>
                  </div>
                ))}
              </div>
              <p className="text-lg sm:text-xl font-heading font-semibold tracking-tight leading-snug text-foreground">
                Every contribution becomes a record you can open &mdash; a GPS pin, a planting photo,
                and ongoing care updates, all tied to your trees.
              </p>
              <div className="text-sm text-muted-foreground">
                Nothing to take on faith. Just scroll the proof.
              </div>
            </motion.div>
          </Tilt3D>
        </motion.div>
      </div>
    </section>
  );
}

function ClosingCta() {
  const v = useVariants();
  return (
    <section className="bg-foreground text-card border-y border-foreground py-16 sm:py-24">
      <motion.div
        className="max-w-4xl mx-auto px-4 sm:px-6 text-center"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.5 }}
        variants={v.container}
      >
        <motion.h2
          className="font-heading text-3xl sm:text-5xl font-bold tracking-tight leading-tight"
          variants={v.fadeUp}
        >
          Plant a tree you can watch grow.
        </motion.h2>
        <motion.p
          className="mt-4 text-base sm:text-lg text-card/70 max-w-2xl mx-auto leading-relaxed"
          variants={v.fadeUp}
        >
          Pick how many, pay securely, and follow each tree from the field.
        </motion.p>
        <motion.div className="mt-8 flex justify-center" variants={v.fadeUp}>
          <Button asChild size="lg" variant="accent" className="text-base">
            <Link to="/register">
              Sponsor a tree <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </motion.div>
        <motion.p className="mt-6 text-sm text-card/60" variants={v.fadeUp}>
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-card underline decoration-card/30 underline-offset-4 transition-colors hover:decoration-card"
          >
            Sign in
          </Link>
        </motion.p>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background py-10 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col gap-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary">
              <Leaf className="h-4 w-4" aria-hidden />
            </span>
            <span className="font-heading font-bold text-foreground">NGO Trees</span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-muted-foreground leading-relaxed">
            Every tree your donation funds — planted, mapped, and proven.
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <span className="text-sm font-medium text-foreground">Ready to grow your forest?</span>
          <div className="flex items-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link to="/login">Sign in</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/register">
                Sponsor a tree <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8 border-t border-border/60 pt-6 text-xs text-muted-foreground">
        &copy; {new Date().getFullYear()} NGO Trees. All rights reserved.
      </div>
    </footer>
  );
}
