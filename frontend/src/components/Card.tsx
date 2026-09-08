import React from 'react';
export function Card({title,children,className=''}:{title?:string;children:React.ReactNode;className?:string}){return <section className={`card ${className}`}>{title&&<h3>{title}</h3>}{children}</section>}
export function Stat({label,value,sub}:{label:string;value:React.ReactNode;sub?:string}){return <div className="stat"><span>{label}</span><strong>{value}</strong>{sub&&<small>{sub}</small>}</div>}
