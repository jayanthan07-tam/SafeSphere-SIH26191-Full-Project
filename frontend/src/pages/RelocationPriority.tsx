import {useEffect,useState} from 'react';
import {api} from '../lib/api';
import type {Habitation,RiskAssessment} from '../types';
import {PageHeader} from '../components/PageHeader';
import {Card} from '../components/Card';
import {DataTable} from '../components/DataTable';
import {Empty} from '../components/Loading';
export default function RelocationPriority(){const [rows,setRows]=useState<any[]>([]);useEffect(()=>{Promise.all([api.get<Habitation[]>('/habitations'),api.get<RiskAssessment[]>('/risk/assessments')]).then(([hs,rs])=>{const map=new Map(hs.map(h=>[h.id,h]));const latest=new Map<string,RiskAssessment>();rs.forEach(r=>{if(!latest.has(r.habitation_id))latest.set(r.habitation_id,r)});setRows([...latest.values()].map(r=>({h:map.get(r.habitation_id),r})).filter(x=>x.h).sort((a,b)=>b.r.future_score-a.r.future_score))})},[]);return <><PageHeader title="Relocation Priority" subtitle="Ranked from the latest available risk assessments. Human review is required before any relocation decision."/><Card>{rows.length?<DataTable headers={['Rank','Habitation','Population','Hazard','Future Risk','Confidence','Priority band']}>{rows.map((x,i)=><tr key={x.r.id}><td>{i+1}</td><td>{x.h.name}</td><td>{x.h.population.toLocaleString()}</td><td>{x.r.hazard_type}</td><td>{x.r.future_score}</td><td>{x.r.confidence}%</td><td>{x.r.future_score>=80?'Immediate review':x.r.future_score>=60?'Short-term review':'Monitor'}</td></tr>)}</DataTable>:<Empty title="No priority data" description="Run risk assessments first."/>}</Card></>}
