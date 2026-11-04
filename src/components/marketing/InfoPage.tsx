import type { ReactNode } from "react";
import { SiteHeader, SiteFooter } from "./SiteShell";
export function InfoPage({eyebrow,title,lead,children}:{eyebrow:string;title:string;lead:string;children?:ReactNode}) {
 return <><SiteHeader/><main className="simple-page"><div className="wrap"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p className="lead">{lead}</p><div className="simple-content">{children}</div></div></main><SiteFooter/></>;
}
