import { GeoJSON, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Habitation, RelocationSite, SOS } from '../types';

const markerIcon = new L.DivIcon({
  className: 'dm-map-pin',
  html: '<span></span>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const userIcon = new L.DivIcon({
  className: 'dm-user-pin',
  html: '<span></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

type Props = {
  habitations?: Habitation[];
  sites?: RelocationSite[];
  sos?: SOS[];
  geojson?: any;
  center?: [number, number];
  height?: number;
  userLocation?: { latitude: number; longitude: number } | null;
  zoom?: number;
  compact?: boolean;
};

export function MapView({
  habitations = [],
  sites = [],
  sos = [],
  geojson,
  center,
  height = 480,
  userLocation,
  zoom,
  compact = false,
}: Props) {
  const first = habitations[0] || sites[0] || sos[0];
  const c: [number, number] = center ||
    (userLocation ? [userLocation.latitude, userLocation.longitude] : first ? [first.latitude, first.longitude] : [20.5937, 78.9629]);
  const mapZoom = zoom ?? (userLocation ? 12 : first ? 10 : 5);

  return (
    <div className={`map-shell ${compact ? 'compact-map' : ''}`} style={{ height }}>
      <MapContainer center={c} zoom={mapZoom} style={{ height: '100%', width: '100%' }} scrollWheelZoom={!compact}>
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geojson && <GeoJSON data={geojson} />}
        {userLocation && (
          <Marker position={[userLocation.latitude, userLocation.longitude]} icon={userIcon}>
            <Popup><b>Your current GPS location</b></Popup>
          </Marker>
        )}
        {habitations.map(h => (
          <Marker key={h.id} position={[h.latitude, h.longitude]} icon={markerIcon}>
            <Popup><b>{h.name}</b><br />Population: {h.population.toLocaleString()}<br />{h.district}</Popup>
          </Marker>
        ))}
        {sites.map(s => (
          <Marker key={s.id} position={[s.latitude, s.longitude]} icon={markerIcon}>
            <Popup><b>{s.name}</b><br />Available capacity: {s.available_capacity.toLocaleString()}<br />{s.verified ? 'Verified' : 'Unverified'}</Popup>
          </Marker>
        ))}
        {sos.map(s => (
          <Marker key={s.id} position={[s.latitude, s.longitude]} icon={markerIcon}>
            <Popup><b>SOS</b><br />Priority: {s.priority_score}<br />{s.status}</Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
