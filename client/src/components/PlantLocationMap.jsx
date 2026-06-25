import { MapContainer, Marker, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Status-coloured teardrop pin as a Leaflet divIcon (no default marker
// image assets, which break under Vite). `.angio-pin` strips the white box.
function pinIcon(status) {
  const fill = status === 'dead' ? '#dc2626' : status === 'removed' ? '#94a3b8' : '#0B5000';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="28" height="36">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 8.6 12 20 12 20s12-11.4 12-20C24 5.4 18.6 0 12 0z" fill="${fill}"/>
      <circle cx="12" cy="12" r="4.5" fill="#fff"/>
    </svg>`;
  return L.divIcon({ html: svg, className: 'angio-pin', iconSize: [28, 36], iconAnchor: [14, 34] });
}

// Small embedded map showing one tree's location (folds the Map panel into
// each plant's detail). Free, key-less Leaflet + CARTO light tiles.
export default function PlantLocationMap({ geo, status }) {
  if (geo?.lat == null || geo?.lng == null) return null;
  return (
    <div className="isolate overflow-hidden rounded-[10px] border border-[#E2E8F0]">
      <MapContainer
        center={[geo.lat, geo.lng]}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: 200, width: '100%' }}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <Marker position={[geo.lat, geo.lng]} icon={pinIcon(status)} />
      </MapContainer>
    </div>
  );
}
