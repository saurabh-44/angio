import { Link } from 'react-router-dom';
import { ArrowRight, Leaf, ShieldCheck, MapPin, Camera } from 'lucide-react';

// Split-screen auth shell. Left = brand panel with the trust story
// (impact stat + "what we do" + watering-promise icons). Right = the
// actual form. On mobile we collapse to a single column with a small
// brand header.
//
// Children = the form card. Pass `title`/`subtitle` to render the
// matching header above it for consistent typography across screens.
export default function AuthShell({ title, subtitle, footer, children }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr_1fr] bg-background">
      {/* Brand / story panel */}
      <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden surface-biophilic p-12">
        <div className="absolute inset-0 pointer-events-none [mask-image:radial-gradient(ellipse_at_top_left,white,transparent_60%)]" aria-hidden>
          <svg className="absolute -bottom-12 -right-10 w-[420px] text-leaf-100" viewBox="0 0 200 200">
            <path
              fill="currentColor"
              d="M40,-66.5C52,-58,62.5,-49,68.7,-37.7C74.9,-26.4,76.7,-13.2,75.4,-0.7C74.2,11.7,69.8,23.5,63,33.4C56.1,43.4,46.8,51.4,36.2,58.4C25.6,65.3,12.8,71.1,-0.3,71.6C-13.4,72.1,-26.8,67.3,-38.4,60.5C-50,53.7,-59.8,44.9,-66.2,33.8C-72.7,22.7,-75.7,11.3,-75.1,0.3C-74.6,-10.7,-70.4,-21.4,-64,-30.7C-57.6,-39.9,-49,-47.7,-39,-56.6C-29,-65.5,-14.5,-75.5,-0.5,-74.7C13.6,-73.9,27.1,-75,40,-66.5Z"
              transform="translate(100 100)"
            />
          </svg>
        </div>

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-2xl bg-card/80 backdrop-blur px-3 py-1.5 border border-border/60">
            <Leaf className="h-4 w-4 text-primary" aria-hidden />
            <span className="text-sm font-semibold text-foreground">NGO Trees</span>
          </div>

          <h2 className="mt-12 font-heading text-5xl font-bold tracking-tight text-foreground max-w-md leading-tight">
            See every tree your donation funded.
          </h2>
          <p className="mt-5 text-base text-muted-foreground max-w-md leading-relaxed">
            Transparent planting and weekly maintenance proof — geo-tagged
            photos from the field, straight to your dashboard.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-3 max-w-md">
            <Feature icon={MapPin} label="GPS-pinned" />
            <Feature icon={Camera} label="Photo proof" />
            <Feature icon={ShieldCheck} label="Weekly checked" />
          </div>
        </div>

        <div className="relative grid grid-cols-3 gap-3 max-w-md">
          <Stat value="47,238" label="Trees planted" />
          <Stat value="216" label="Active sites" />
          <Stat value="98.4%" label="Watered weekly" />
        </div>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col px-6 sm:px-10 py-10 lg:py-16">
        <div className="lg:hidden inline-flex items-center gap-2 mb-8">
          <Leaf className="h-5 w-5 text-primary" aria-hidden />
          <span className="font-heading text-base font-semibold">NGO Trees</span>
        </div>

        <div className="m-auto w-full max-w-md">
          <header className="mb-8">
            <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{subtitle}</p>
            )}
          </header>
          {children}
          {footer && <div className="mt-8 text-sm text-muted-foreground">{footer}</div>}
        </div>
      </main>
    </div>
  );
}

function Feature({ icon: Icon, label }) {
  return (
    <div className="flex flex-col items-start gap-2 rounded-2xl bg-card/70 backdrop-blur border border-border/60 p-3">
      <Icon className="h-4 w-4 text-primary" aria-hidden />
      <span className="text-xs font-medium text-foreground">{label}</span>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="rounded-2xl bg-card/70 backdrop-blur border border-border/60 p-4">
      <div className="font-heading text-2xl font-bold text-foreground tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{label}</div>
    </div>
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
