import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Habitation, RelocationSite, SOS } from '../types';
import { MapView } from '../components/MapView';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { ErrorBox, Empty, Loading } from '../components/Loading';
import { useGeolocation } from '../hooks/useGeolocation';

export default function RiskMap() {
  const [h, setH] = useState<Habitation[]>([]);
  const [sites, setSites] = useState<RelocationSite[]>([]);
  const [sos, setSos] = useState<SOS[]>([]);
  const [zones, setZones] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const geo = useGeolocation();

  useEffect(() => {
    Promise.all([
      api.get<Habitation[]>('/habitations'),
      api.get<RelocationSite[]>('/relocation/sites'),
      api.get<SOS[]>('/sos'),
      api.get<any>('/risk/future-zones?min_score=60').catch(() => null),
    ])
      .then(([a, b, c, z]) => { setH(a); setSites(b); setSos(c); setZones(z); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));

    geo.getPosition().catch(() => undefined);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <PageHeader
        title="GPS-Enabled Multi-Hazard GIS Risk Map"
        subtitle="Your permission-based GPS location is shown with stored habitations, SOS cases, relocation sites and future planning-risk envelopes."
        actions={<button className="btn primary" onClick={() => geo.getPosition().catch(() => undefined)}>{geo.coords ? 'Refresh GPS' : 'Enable GPS'}</button>}
      />
      {error && <ErrorBox message={error} />}
      {geo.error && <ErrorBox message={geo.error} />}
      {loading ? <Loading /> : <>
        <MapView
          habitations={h}
          sites={sites}
          sos={sos}
          geojson={zones}
          userLocation={geo.coords}
          center={geo.coords ? [geo.coords.latitude, geo.coords.longitude] : undefined}
        />
        <div className="grid-3">
          <Card title="Your GPS">
            {geo.coords ? <><b>{geo.coords.latitude.toFixed(5)}, {geo.coords.longitude.toFixed(5)}</b><p>Accuracy ±{Math.round(geo.coords.accuracy || 0)} m</p></> : <Empty title="GPS not shared" description="Allow location access to place your live position on the GIS map." />}
          </Card>
          <Card title="Mapped Risk Evidence">{h.length ? <><b>{h.length} habitations</b><p>{zones?.features?.length || 0} future planning envelopes</p></> : <Empty title="No habitation data" description="Import or create habitations first." />}</Card>
          <Card title="Live Response"><b>{sos.filter(x => x.status !== 'resolved').length} active SOS</b><p>{sites.filter(x => x.verified).length} verified relocation sites</p></Card>
        </div>
        <Card title="Map boundary">
          <p>The blue GPS marker is your current browser-reported position. Future-zone polygons are planning envelopes derived from risk scores, not official hazard boundaries.</p>
        </Card>
      </>}
    </>
  );
}
