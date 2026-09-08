import React from 'react';
export function DataTable({headers,children}:{headers:string[];children:React.ReactNode}){return <div className="table-wrap"><table><thead><tr>{headers.map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{children}</tbody></table></div>}
