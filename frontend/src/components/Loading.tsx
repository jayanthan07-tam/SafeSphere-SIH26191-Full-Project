export function Loading({label='Loading…'}:{label?:string}){return <div className="loading"><span className="spinner"/>{label}</div>}
export function Empty({title,description}:{title:string;description?:string}){return <div className="empty"><strong>{title}</strong>{description&&<p>{description}</p>}</div>}
export function ErrorBox({message}:{message:string}){return <div className="error-box">{message}</div>}
