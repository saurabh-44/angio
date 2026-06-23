import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Leaf, ShieldCheck, MapPin, Camera } from 'lucide-react';

// Auth shell with a fixed top bar (same header treatment as the marketing
// site) over a split layout. The gradient bleeds full-width on the left
// half, but ALL content — header, brand story, form — is aligned to the
// same `max-w-7xl` container the landing uses, so left/right margins match
// across every page; only the inner content changes.
//
// Children = the form. Pass `title`/`subtitle` for the form header and an
// optional `footer` node below it.
export default function AuthShell({ title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Fixed top bar — consistent across landing + auth */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] h-16 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-2xl bg-primary/10 text-primary">
              <Leaf className="h-5 w-5" aria-hidden />
            </span>
            <span className="font-heading text-base font-bold tracking-tight">Environ</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden /> Back to site
          </Link>
        </div>
      </header>

      <div className="relative flex-1">
        {/* Full-bleed brand gradient on the left half (desktop only). Its
            right edge meets the seam at 50%, which is exactly where the
            max-w-7xl left column ends — so content stays on the gradient. */}
        <div
          className="absolute inset-y-0 left-0 hidden lg:block lg:w-1/2 surface-biophilic overflow-hidden"
          aria-hidden
        >
          <div className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_top_left,white,transparent_65%)]">
            <svg className="absolute -bottom-16 -right-12 w-[420px] text-leaf-100" viewBox="0 0 200 200">
              <path
                fill="currentColor"
                d="M40,-66.5C52,-58,62.5,-49,68.7,-37.7C74.9,-26.4,76.7,-13.2,75.4,-0.7C74.2,11.7,69.8,23.5,63,33.4C56.1,43.4,46.8,51.4,36.2,58.4C25.6,65.3,12.8,71.1,-0.3,71.6C-13.4,72.1,-26.8,67.3,-38.4,60.5C-50,53.7,-59.8,44.9,-66.2,33.8C-72.7,22.7,-75.7,11.3,-75.1,0.3C-74.6,-10.7,-70.4,-21.4,-64,-30.7C-57.6,-39.9,-49,-47.7,-39,-56.6C-29,-65.5,-14.5,-75.5,-0.5,-74.7C13.6,-73.9,27.1,-75,40,-66.5Z"
                transform="translate(100 100)"
              />
            </svg>
          </div>
        </div>

        {/* Content aligned to the same max-w-7xl grid as the landing */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 min-h-full">
          {/* Brand / story */}
          <aside className="hidden lg:flex flex-col py-20 xl:py-24 pr-10 xl:pr-14">
            <div className="w-full max-w-md">
              <h2 className="font-heading text-4xl xl:text-5xl font-bold tracking-tight text-foreground leading-tight">
                See every tree your donation funded.
              </h2>
              <p className="mt-5 text-base text-muted-foreground leading-relaxed">
                Transparent planting and maintenance proof — geo-tagged photos from the field,
                straight to your dashboard.
              </p>

              <ul className="mt-10 space-y-4">
                <ProofRow icon={MapPin} title="Every tree, GPS-pinned" desc="Photographed the day it goes in the soil." />
                <ProofRow icon={Camera} title="Follow them on a live map" desc="Fresh field photos as they grow." />
                <ProofRow icon={Leaf} title="Proof you can keep" desc="A CO₂ estimate and certificate for every gift." />
              </ul>

              <div className="mt-12 inline-flex items-center gap-2 text-sm text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
                Secure payments · your data stays private.
              </div>
            </div>
          </aside>

          {/* Form */}
          <main className="flex flex-col py-14 lg:py-20 xl:py-24 lg:pl-10 xl:pl-14">
            <div className="w-full max-w-md mx-auto">
              <header className="mb-8">
                <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
                )}
              </header>
              {children}
              {footer && <div className="mt-5 text-sm text-muted-foreground">{footer}</div>}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function ProofRow({ icon: Icon, title, desc }) {
  return (
    <li className="flex items-start gap-3.5">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-card/70 backdrop-blur border border-border/60 text-primary shadow-sm">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{desc}</div>
      </div>
    </li>
  );
}

export function AuthFooterLink({ to, prefix, label }) {
  return (
    <div className="text-sm text-muted-foreground">
      {prefix}{' '}
      <Link
        to={to}
        className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
      >
        {label} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </div>
  );
}
