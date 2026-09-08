import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Habitation, RiskAssessment } from '../types';
import { PageHeader } from '../components/PageHeader';
import { Card } from '../components/Card';
import { RiskGauge } from '../components/RiskGauge';
import { FormField } from '../components/FormField';
import { ErrorBox, Empty } from '../components/Loading';
import { TrustBadge } from '../components/TrustBadge';
import { useAuth } from '../context/AuthContext';
import { useGeolocation } from '../hooks/useGeolocation';

const hazards = ['flood', 'landslide', 'coastal_erosion', 'cyclone', 'heavy_rainfall', 'fire', 'waterlogging', 'multi_hazard'];

type Outlook = {
  habitation: any;
  horizon_years: number;
  predictions: Array<{ hazard_type: string; current_score: number; future_score: number; risk_class: string; confidence: number; delta: number; trend: string }>;
  statement: string;
  methodology?: string;
};

export default function FutureRisk() {
  const { user } = useAuth();
  const isPublic = user?.role === 'citizen' || user?.role === 'family_member';
  const geo = useGeolocation();
  const [hs, setHs] = useState<Habitation[]>([]);
  const [hid, setHid] = useState('');
  const [hazard, setHazard] = useState('flood');
  const [horizon, setHorizon] = useState(5);
  const [result, setResult] = useState<RiskAssessment | null>(null);
  const [outlook, setOutlook] = useState<Outlook | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isPublic) {
      api.get<Habitation[]>('/habitations').then(x => { setHs(x); if (x[0]) setHid(x[0].id); });
      return;
    }
    loadOutlook(horizon, false);
  }, [isPublic]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadOutlook = async (years: number, requestGps = true) => {
    setError('');
    try {
      let query = `horizon_years=${years}`;
      if (requestGps) {
        try {
          const c = await geo.getPosition();
          query += `&latitude=${encodeURIComponent(c.latitude)}&longitude=${encodeURIComponent(c.longitude)}`;
        } catch { /* district-level fallback */ }
      }
      setOutlook(await api.get<Outlook>(`/risk/outlook?${query}`));
    } catch (e: any) { setError(e.message); }
  };

  const run = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try { setResult(await api.post<RiskAssessment>(`/risk/assess/${hid}`, { hazard_type: hazard, horizon_years: horizon })); }
    catch (e: any) { setError(e.message); }
  };

  if (isPublic) {
    return (
      <div className="liquid-subpage future-public-page">
        <div className="liquid-subpage-header">
          <div><p>PLANNING INTELLIGENCE</p><h1>Future Risk Prediction</h1><span>Explainable trend projection for preparedness. This is not an exact disaster-date forecast.</span></div>
          <div className="horizon-control"><span>Horizon</span><select value={horizon} onChange={e => { const y = +e.target.value; setHorizon(y); loadOutlook(y); }}><option value={1}>1 year</option><option value={5}>5 years</option><option value={10}>10 years</option><option value={20}>20 years</option></select></div>
        </div>
        {error && <ErrorBox message={error} />}
        <section className="liquid-panel public-outlook-summary">
          <div><p>Nearest evidence area</p><h2>{outlook?.habitation?.name || 'No habitation evidence'}</h2><span>{outlook?.habitation ? `${outlook.habitation.district}, ${outlook.habitation.state}` : 'Authority must add verified habitation inputs.'}</span></div>
          <button className="glass-action" onClick={() => loadOutlook(horizon, true)}>Use current GPS</button>
        </section>
        <section className="future-risk-grid">
          {outlook?.predictions?.length ? outlook.predictions.map(p => (
            <article className="liquid-panel future-hazard-card" key={p.hazard_type}>
              <div className="future-card-head"><div><p>{p.trend} trend</p><h2>{p.hazard_type.replaceAll('_', ' ')}</h2></div><strong>{Math.round(p.future_score)}</strong></div>
              <div className="future-comparison"><span>Current <b>{p.current_score.toFixed(1)}</b></span><i>→</i><span>{horizon}Y <b>{p.future_score.toFixed(1)}</b></span></div>
              <div className="prediction-track"><i style={{ width: `${Math.min(100, p.future_score)}%` }} /></div>
              <div className="future-card-foot"><span className={`status status-${p.risk_class}`}>{p.risk_class}</span><span>Confidence {Math.round(p.confidence)}%</span></div>
            </article>
          )) : <div className="liquid-panel"><Empty title="No future-risk output" description="Verified habitation inputs are required before a planning outlook can be generated." /></div>}
        </section>
        <section className="liquid-panel methodology-note"><TrustBadge>MODEL OUTPUT</TrustBadge><p>{outlook?.statement || 'Future risk is an explainable planning estimate, not a guaranteed event prediction.'}</p><small>{outlook?.methodology || 'Explainable weighted multi-factor trend projection'}</small></section>
      </div>
    );
  }

  return <>
    <PageHeader title="Future Risk Prediction" subtitle="Explainable planning-risk estimation from stored habitation inputs and verified hazard observations." />
    <div className="grid-2">
      <Card title="Assessment inputs"><form onSubmit={run} className="form-grid"><FormField label="Habitation"><select value={hid} onChange={e => setHid(e.target.value)}>{hs.map(h => <option value={h.id} key={h.id}>{h.name} — {h.district}</option>)}</select></FormField><FormField label="Hazard"><select value={hazard} onChange={e => setHazard(e.target.value)}>{hazards.map(h => <option value={h} key={h}>{h.replaceAll('_', ' ')}</option>)}</select></FormField><FormField label="Planning horizon"><input type="number" min={1} max={30} value={horizon} onChange={e => setHorizon(+e.target.value)} /></FormField><button className="btn primary" disabled={!hid}>Run assessment</button></form>{error && <ErrorBox message={error} />}</Card>
      <Card title="Method boundary"><TrustBadge>MODEL OUTPUT</TrustBadge><p>This module estimates relative risk for planning. It does not predict an exact disaster date or guarantee an event.</p></Card>
    </div>
    {result && <><div className="grid-3"><Card><RiskGauge score={result.current_score} label="Current risk" /></Card><Card><RiskGauge score={result.future_score} label={`${result.horizon_years}-year risk`} /></Card><Card><RiskGauge score={result.confidence} label="Evidence confidence" /></Card></div><Card title="Why this result?"><div className="factor-list">{Object.entries(result.factor_contributions).map(([k, v]: any) => <div className="factor" key={k}><span>{k.replaceAll('_', ' ')}</span><div className="bar"><i style={{ width: `${v.relative_percent}%` }} /></div><b>{v.relative_percent}%</b></div>)}</div>{result.missing_inputs.length > 0 && <p className="warning">Missing inputs: {result.missing_inputs.join(', ')}</p>}<small>{result.methodology}</small></Card></>}
  </>;
}
