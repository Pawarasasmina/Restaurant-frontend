import type{ButtonHTMLAttributes,HTMLAttributes,InputHTMLAttributes,ReactNode}from'react';import{LoaderCircle}from'lucide-react';
export const Button=({className='',children,...p}:ButtonHTMLAttributes<HTMLButtonElement>)=><button className={`focus-ring rounded-full bg-clay px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#733022] disabled:cursor-not-allowed disabled:opacity-50 ${className}`} {...p}>{children}</button>;
export const Input=({className='',...p}:InputHTMLAttributes<HTMLInputElement>)=><input className={`focus-ring w-full rounded-xl border border-black/10 bg-paper px-4 py-3 outline-none placeholder:text-ink/40 ${className}`} {...p}/>;
export const Card=({className='',...p}:HTMLAttributes<HTMLDivElement>)=><div className={`rounded-2xl border border-black/[.07] bg-paper shadow-soft ${className}`} {...p}/>;
export const Badge=({children,tone='neutral'}:{children:ReactNode;tone?:'neutral'|'good'|'warn'|'bad'})=><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone==='good'?'bg-emerald-100 text-emerald-800':tone==='warn'?'bg-amber-100 text-amber-800':tone==='bad'?'bg-red-100 text-red-800':'bg-black/5 text-ink/70'}`}>{children}</span>;
export const Loading=()=> <div className="flex min-h-40 items-center justify-center"><LoaderCircle className="animate-spin text-clay"/></div>;
export const Empty=({title,body}:{title:string;body:string})=><div className="rounded-2xl border border-dashed border-black/15 p-10 text-center"><h3 className="font-serif text-2xl">{title}</h3><p className="mt-2 text-ink/60">{body}</p></div>;

