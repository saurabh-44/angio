import { useEffect, useMemo, useState } from 'react';
import { GoogleMap, InfoWindowF, MarkerF, useJsApiLoader } from '@react-google-maps/api';
import { ExternalLink, Leaf, MapPin } from 'lucide-react';
import { Badge } from '@/components/ui/badge.jsx';
import { Spinner } from '@/components/ui/spinner.jsx';
import EmptyState from './EmptyState.jsx';
import { formatDate, formatGeo } from '@/lib/format.js';

const KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Pure-CSS marker so the map doesn't need to load a sprite. The Google
// MarkerF expects either a default pin or an SVG/icon — we use the default
// since "marker library" loading would require another script tag.
const MAP_OPTIONS = {
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  clickableIcons: false,
  // Quiet, biophilic palette — desaturated greens, hide POIs.
  styles: [
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
    { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#ecfdf5' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cffafe' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  ],
};

// Drop a tree-shaped SVG pin coloured by status. The path is a simplified
// teardrop with a leaf — we keep the geometry compact so it scales well.
function pinIcon(status) {
  const fill = status === 'dead'
    ? '#dc2626'
    : status === 'removed'
      ? '#94a3b8'
      : '#059669';
  // Use a data URL — no asset loader needed.
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="32" height="40">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.6 12 20 12 20s12-11.4 12-20C24 5.4 18.6 0 12 0z" fill="${fill}"/>
      <path d="M12 8c-2.2 0-4 1.8-4 4 0 1.8 1.2 3.3 2.8 3.8.4-1.4 1.2-2.6 2.2-3.2.2-.2.5-.1.4.2-.4 1-.6 2-.6 3v3.2c0 .3.4.4.6.2L13 18c.2-.2.6 0 .6.3v.3c.1.2.3.4.5.4 1.6-.5 2.9-2 2.9-3.8 0-2.2-1.8-4-4-4z" fill="#fff"/>
    </svg>
  `;
  return {
    url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    scaledSize: typeof window !== 'undefined' && window.google
      ? new window.google.maps.Size(32, 40)
      : undefined,
    anchor: typeof window !== 'undefined' && window.google
      ? new window.google.maps.Point(16, 38)
      : undefined,
  };
}

// Generic Map view used by donor + admin. `plants` is an array shaped
// like { id, species, status, geo: {lat, lng}, plantingPhoto?, site? }.
// `onSelect` is called with the clicked plant.
export default function MapView({ plants = [], onSelect, isLoading }) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: KEY ?? '',
    id: 'angio-google-maps',
  });
  const [open, setOpen] = useState(null);
  const [map, setMap] = useState(null);

  const center = useMemo(() => {
    if (plants.length === 0) return { lat: 20.5937, lng: 78.9629 }; // India centroid as a friendly default
    return { lat: plants[0].geo?.lat ?? 20.5937, lng: plants[0].geo?.lng ?? 78.9629 };
  }, [plants]);

  // Pan/zoom-fit on first load once we have plants AND the map instance.
  useEffect(() => {
    if (!map || plants.length === 0 || typeof window === 'undefined' || !window.google) return;
    const bounds = new window.google.maps.LatLngBounds();
    plants.forEach((p) => {
      if (p.geo?.lat != null && p.geo?.lng != null) {
        bounds.extend({ lat: p.geo.lat, lng: p.geo.lng });
      }
    });
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, 64);
      if (plants.length === 1) {
        // fitBounds zooms too far on a single point — pull back a notch.
        setTimeout(() => map.setZoom(14), 0);
      }
    }
  }, [map, plants]);

  if (!KEY) {
    return <NoKeyFallback plants={plants} onSelect={onSelect} />;
  }
  if (loadError) {
    return (
      <EmptyState
        icon={MapPin}
        title="Couldn't load Google Maps"
        description="Check your API key and that the Maps JavaScript API is enabled in your Google Cloud project."
      />
    );
  }
  if (!isLoaded || isLoading) {
    return (
      <div className="bento-card grid place-items-center h-[520px]">
        <Spinner label="Loading map" />
      </div>
    );
  }
  if (plants.length === 0) {
    return (
      <EmptyState
        icon={MapPin}
        title="No trees to plot yet"
        description="Once volunteers upload geo-tagged plantings they'll appear here."
      />
    );
  }

  return (
    <div className="bento-card overflow-hidden">
      <GoogleMap
        center={center}
        zoom={5}
        mapContainerStyle={{ width: '100%', height: '70vh' }}
        options={MAP_OPTIONS}
        onLoad={(m) => setMap(m)}
      >
        {plants.map((p) => (
          <MarkerF
            key={p.id ?? p._id}
            position={{ lat: p.geo.lat, lng: p.geo.lng }}
            icon={pinIcon(p.status)}
            onClick={() => setOpen(p)}
          />
        ))}
        {open && (
          <InfoWindowF
            position={{ lat: open.geo.lat, lng: open.geo.lng }}
            onCloseClick={() => setOpen(null)}
          >
            <div className="font-sans w-56">
              {open.plantingPhoto?.url && (
                <img
                  src={open.plantingPhoto.url}
                  alt=""
                  className="w-full h-24 object-cover rounded-md mb-2"
                />
              )}
              <div className="font-semibold text-sm text-foreground">
                {open.species ?? 'Tree'}
              </div>
              <div className="text-xs text-muted-foreground mb-2">
                {open.site?.name ?? formatGeo(open.geo)}
                {open.plantedAt && <> · {formatDate(open.plantedAt)}</>}
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(null);
                  onSelect?.(open);
                }}
                className="text-xs font-medium text-primary hover:underline cursor-pointer"
              >
                Open details →
              </button>
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>
      <MapLegend count={plants.length} />
    </div>
  );
}

function MapLegend({ count }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 bg-secondary/40 border-t border-border/60 text-xs">
      <div className="flex items-center gap-4 text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><Dot color="#059669" /> Alive</span>
        <span className="inline-flex items-center gap-1.5"><Dot color="#94a3b8" /> Removed</span>
        <span className="inline-flex items-center gap-1.5"><Dot color="#dc2626" /> Dead</span>
      </div>
      <span className="font-medium text-foreground">{count} {count === 1 ? 'tree' : 'trees'}</span>
    </div>
  );
}

function Dot({ color }) {
  return <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} aria-hidden />;
}

function NoKeyFallback({ plants, onSelect }) {
  return (
    <div className="bento-card overflow-hidden">
      <div className="surface-biophilic px-6 py-8 border-b border-border/60">
        <Badge variant="accent">Setup needed</Badge>
        <h3 className="mt-3 font-heading text-lg font-semibold">Add your Google Maps API key</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Set <code className="font-mono text-xs bg-card border border-border/60 px-1.5 py-0.5 rounded-md">VITE_GOOGLE_MAPS_API_KEY</code>{' '}
          in <code className="font-mono text-xs bg-card border border-border/60 px-1.5 py-0.5 rounded-md">client/.env</code>{' '}
          and restart the dev server to see the interactive map. Until then, here's a list view:
        </p>
      </div>
      {plants.length === 0 ? (
        <div className="px-6 py-10 text-center text-sm text-muted-foreground">
          No trees to plot yet.
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {plants.map((p) => (
            <li
              key={p.id ?? p._id}
              className="px-6 py-4 flex items-center gap-4 hover:bg-secondary/40 transition-colors cursor-pointer"
              onClick={() => onSelect?.(p)}
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-leaf-100 text-leaf-700">
                <Leaf className="h-5 w-5" aria-hidden />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-foreground truncate">
                  {p.species ?? 'Tree'} <span className="text-muted-foreground">· {p.site?.name ?? 'Site'}</span>
                </div>
                <div className="font-mono text-xs text-muted-foreground">{formatGeo(p.geo)}</div>
              </div>
              <a
                href={`https://maps.google.com/?q=${p.geo.lat},${p.geo.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Open <ExternalLink className="h-3 w-3" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
