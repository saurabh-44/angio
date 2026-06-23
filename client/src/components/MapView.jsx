import { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner.jsx';
import EmptyState from './EmptyState.jsx';
import { formatDate, formatGeo } from '@/lib/format.js';

// Free, key-less map via Leaflet + OpenStreetMap (CARTO Positron light
// tiles for a quiet, desaturated look). No Google Maps key / billing, and
// it works the same inside the native Capacitor app — Google's referrer
// restrictions don't apply to the capacitor:// origin, OSM tiles have no
// such constraint.

// Status-coloured teardrop+leaf pin, rendered as a Leaflet divIcon so we
// don't depend on Leaflet's default marker image assets (which break under
// Vite bundling). The `angio-pin` class strips the default white box.
function pinIcon(status) {
  const fill = status === 'dead' ? '#dc2626' : status === 'removed' ? '#94a3b8' : '#059669';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="32" height="40">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.6 12 20 12 20s12-11.4 12-20C24 5.4 18.6 0 12 0z" fill="${fill}"/>
      <path d="M12 8c-2.2 0-4 1.8-4 4 0 1.8 1.2 3.3 2.8 3.8.4-1.4 1.2-2.6 2.2-3.2.2-.2.5-.1.4.2-.4 1-.6 2-.6 3v3.2c0 .3.4.4.6.2L13 18c.2-.2.6 0 .6.3v.3c.1.2.3.4.5.4 1.6-.5 2.9-2 2.9-3.8 0-2.2-1.8-4-4-4z" fill="#fff"/>
    </svg>
  `;
  return L.divIcon({
    html: svg,
    className: 'angio-pin',
    iconSize: [32, 40],
    iconAnchor: [16, 38],
    popupAnchor: [0, -34],
  });
}

// Frames all pins on mount / when the plant set changes. Single pin →
// centre at a sensible zoom (fitBounds zooms too far on one point).
function FitBounds({ plants }) {
  const map = useMap();
  useEffect(() => {
    const pts = plants
      .filter((p) => p.geo?.lat != null && p.geo?.lng != null)
      .map((p) => [p.geo.lat, p.geo.lng]);
    if (pts.length === 0) return;
    if (pts.length === 1) {
      map.setView(pts[0], 14);
      return;
    }
    map.fitBounds(L.latLngBounds(pts), { padding: [64, 64] });
  }, [plants, map]);
  return null;
}

// Generic map view. `plants` is an array shaped like
// { id, species, status, geo: {lat, lng}, plantingPhoto?, site? }.
// `onSelect` is called with the clicked plant.
export default function MapView({ plants = [], onSelect, isLoading }) {
  const center = useMemo(() => {
    if (plants.length === 0) return [20.5937, 78.9629]; // India centroid default
    return [plants[0].geo?.lat ?? 20.5937, plants[0].geo?.lng ?? 78.9629];
  }, [plants]);

  if (isLoading) {
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
    // `isolate` traps Leaflet's internal z-indexes (panes/controls up to
    // ~1000) inside this container's own stacking context, so they can't
    // render over the app sidebar/drawer (z-50).
    <div className="bento-card overflow-hidden isolate">
      <MapContainer center={center} zoom={5} scrollWheelZoom style={{ height: '70vh', width: '100%' }}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <FitBounds plants={plants} />
        {plants.map((p) => (
          <Marker key={p.id ?? p._id} position={[p.geo.lat, p.geo.lng]} icon={pinIcon(p.status)}>
            <Popup>
              <div className="font-sans w-52">
                {p.plantingPhoto?.url && (
                  <img
                    src={p.plantingPhoto.url}
                    alt=""
                    className="w-full h-24 object-cover rounded-md mb-2"
                  />
                )}
                <div className="font-semibold text-sm text-foreground">
                  {p.species ?? 'Tree'}
                </div>
                <div className="text-xs text-muted-foreground mb-2">
                  {p.site?.name ?? formatGeo(p.geo)}
                  {p.plantedAt && <> · {formatDate(p.plantedAt)}</>}
                </div>
                <button
                  type="button"
                  onClick={() => onSelect?.(p)}
                  className="text-xs font-medium text-primary hover:underline cursor-pointer"
                >
                  Open details →
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
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
