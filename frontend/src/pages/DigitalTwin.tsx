import {useEffect,useState} from 'react';
import {api} from '../lib/api';
import type {Habitation} from '../types';
import {PageHeader} from '../components/PageHeader';
import {MapView} from '../components/MapView';
import {Card} from '../components/Card';
export default function DigitalTwin(){const [hs,setHs]=useState<Habitation[]>([]);const [infra,setInfra]=useState<any[]>([]);useEffect(()=>{Promise.all([api.get<Habitation[]>('/habitations'),api.get<any[]>('/infrastructure/assets')]).then(([a,b])=>{setHs(a);setInfra(b)})},[]);return <><PageHeader title="Digital Twin" subtitle="2D operational twin assembled from stored habitation and infrastructure records. Simulation overlays are driven by saved scenarios."/><MapView habitations={hs}/><div className="grid-2"><Card title="Registered infrastructure"><b>{infra.length}</b><p>Assets available to the operational twin.</p></Card><Card title="Simulation boundary"><p>This module does not invent building-level or live sensor state. Add verified infrastructure and scenario data to enrich the twin.</p></Card></div></>}
