import {useEffect,useState} from 'react';
import {api} from '../lib/api';
import {PageHeader} from '../components/PageHeader';
import {MapView} from '../components/MapView';
import {Card} from '../components/Card';
import {ErrorBox,Loading} from '../components/Loading';
import {TrustBadge} from '../components/TrustBadge';
export default function FutureRedZones(){const [geo,setGeo]=useState<any>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [min,setMin]=useState(60);const load=()=>{setLoading(true);api.get<any>(`/risk/future-zones?min_score=${min}`).then(setGeo).catch(e=>setError(e.message)).finally(()=>setLoading(false))};useEffect(load,[]);return <><PageHeader title="Future Exposure Zones" subtitle="Planning envelopes derived from latest risk assessments; not official hazard polygons." actions={<TrustBadge>MODEL OUTPUT</TrustBadge>}/><Card><div className="inline-form"><label>Minimum future score <input type="number" min="0" max="100" value={min} onChange={e=>setMin(+e.target.value)}/></label><button className="btn primary" onClick={load}>Refresh</button></div></Card>{error&&<ErrorBox message={error}/>} {loading?<Loading/>:geo&&<><MapView geojson={geo}/><Card title="Methodology"><p>{geo.features?.[0]?.properties?.methodology || 'No qualifying exposure envelopes are currently available. Run risk assessments first.'}</p><b>{geo.features?.length||0} envelope(s)</b></Card></>}</>}
