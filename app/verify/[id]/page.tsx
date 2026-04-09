"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";

interface VerifyData {
  proofId:string;valid:boolean;expired:boolean;label:string;proofType:string;
  createdAt:number;expiresAt:number;claim:string;commitment:string;erReceipt:string;
  solanaTxSig:string;threshold?:number;
  agentDecision:{qualifies:boolean;confidence:number;reason:string;actions:string[];};
}

const CLUSTER="devnet";
const solscan=(s:string)=>`https://solscan.io/tx/${s}?cluster=${CLUSTER}`;
const explorer=(s:string)=>`https://explorer.solana.com/tx/${s}?cluster=${CLUSTER}`;

function ExtIcon(){return<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 9L9 1M9 1H3M9 1V7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;}

const DEMO:VerifyData={
  proofId:"demo",valid:true,expired:false,
  label:"Balance \u2265 1.00 SOL",proofType:"balance",
  createdAt:Date.now()-60000,expiresAt:Date.now()+86400000,
  claim:"Balance \u2265 1.00 SOL",
  commitment:"0xa3f7c2d1e4b5a8901234567890abcdef1234567890abcdef1234567890abcdef",
  erReceipt:"ER:slot312847293:4f8a2c1b:PER:9d2e4f1a3c5b7e8901",
  solanaTxSig:"5KtP7fQmCvR9sT2uYwZ3aB6cD8eF1gH7iJ3kL5mN7oP9qR1sT3uVwX5yZ7aBcDeFgHiJkLmNo",
  threshold:1000000000,
  agentDecision:{qualifies:true,confidence:0.99,reason:"Wallet balance meets minimum threshold requirement.",actions:["GRANT_ACCESS","LOG_PROOF","ISSUE_SESSION_TOKEN"]},
};

export default function VerifyPage(){
  const params=useParams();
  const id=params?.id as string;
  const [data,setData]=useState<VerifyData|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [revealed,setRevealed]=useState(false);
  const isDemo=id==="demo";

  useEffect(()=>{
    if(isDemo){const t=setTimeout(()=>{setData(DEMO);setLoading(false);},1000);return()=>clearTimeout(t);}
    fetch(`/api/proof/verify/${id}`).then(r=>r.json()).then(d=>{if(d.error)throw new Error(d.error);setData(d);}).catch(e=>setError(e.message)).finally(()=>setLoading(false));
  },[id,isDemo]);

  if(loading){
    return(
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full border-2 border-purple-500/30 border-t-purple-400 mx-auto mb-4 animate-spin" />
          <p className="text-purple-400 font-semibold">Verifying proof…</p>
          <p className="text-slate-500 text-sm mt-1">Checking cryptographic commitment</p>
        </div>
      </div>
    );
  }

  if(error){
    return(
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="glass rounded-2xl p-8 max-w-md w-full text-center border border-red-500/20">
          <div className="text-5xl mb-4">✗</div>
          <h1 className="font-black text-2xl text-red-400 mb-2">Proof Not Found</h1>
          <p className="text-slate-400 text-sm mb-6">{error}</p>
          <Link href="/" className="btn-primary text-white font-bold px-8 py-3 rounded-xl text-sm inline-block">← Go Home</Link>
        </div>
      </div>
    );
  }

  if(!data)return null;
  const isValid=data.valid&&!data.expired;
  const hasTx=data.solanaTxSig&&data.solanaTxSig.length>20;

  return(
    <div className="relative min-h-screen">
      <div className="fixed pointer-events-none" style={{top:"-10%",left:"50%",transform:"translateX(-50%)",width:"600px",height:"400px",background:`radial-gradient(ellipse,${isValid?"rgba(16,185,129,0.1)":"rgba(239,68,68,0.08)"} 0%,transparent 70%)`,filter:"blur(40px)"}}/>

      <div className="relative max-w-2xl mx-auto px-6 py-12">
        {/* Result hero */}
        <div className="text-center mb-8 anim-up">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/10"/>
            <span className="text-xs text-slate-500 uppercase tracking-widest font-semibold px-4">Proof Verification</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/10"/>
          </div>

          <div className="relative inline-block mb-5">
            <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl mx-auto border-2 ${isValid?"border-green-500/50 bg-green-500/10 shadow-[0_0_40px_rgba(16,185,129,0.2)]":"border-red-500/50 bg-red-500/10 shadow-[0_0_40px_rgba(239,68,68,0.2)]"}`}>
              {isValid?"✓":"✗"}
            </div>
            {isValid&&<div className="absolute inset-0 rounded-full border-2 border-green-500/20 animate-ping"/>}
          </div>

          <h1 className={"font-black text-4xl mb-2 "+( isValid?"text-green-400":"text-red-400")}>
            {isValid?"Proof Valid":data.expired?"Proof Expired":"Proof Invalid"}
          </h1>
          <p className="text-slate-400">{isValid?"Cryptographically verified — no private data revealed.":"This proof could not be verified."}</p>
          {isDemo&&<div className="mt-3 badge badge-blue mx-auto"><span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"/>DEMO MODE</div>}
        </div>

        {/* Claim card */}
        <div className={"glass rounded-2xl p-6 mb-4 border anim-up-1 "+(isValid?"border-green-500/20 bg-green-500/5":"border-red-500/20 bg-red-500/5")}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isValid?"bg-green-500/20":"bg-red-500/20"}`}>
              {data.proofType==="balance"?"💰":data.proofType==="payment"?"💳":"🎫"}
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-0.5">Verified Claim</p>
              <h2 className={"font-bold text-xl "+(isValid?"text-green-400":"text-red-400")}>{data.label}</h2>
            </div>
            <span className={"badge ml-auto "+(isValid?"badge-green":"badge-red")}>{isValid?"VALID":"INVALID"}</span>
          </div>
          <div className="glass rounded-xl px-4 py-3 text-center border border-white/[0.06]">
            <p className="text-xs text-slate-500">🔒 No sensitive data revealed — only the claim above is verified</p>
          </div>
        </div>

        {/* Proof details */}
        <div className="glass rounded-2xl overflow-hidden border border-white/[0.07] mb-4 anim-up-2">
          <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-black/10">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Proof Details</p>
            <span className={"badge text-[10px] "+( isValid?"badge-green":"badge-red")}>{isValid?"VALID":"INVALID"}</span>
          </div>
          <div className="p-5 space-y-3">
            {[
              {label:"Proof ID",     value:data.proofId,    color:"text-blue-300"},
              {label:"Commitment",   value:data.commitment, color:"text-purple-300"},
              {label:"ER Receipt",   value:data.erReceipt,  color:"text-slate-400"},
            ].map(({label,value,color})=>(
              <div key={label}>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">{label}</p>
                <div className="flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2">
                  <span className={"font-mono text-[10px] flex-1 break-all "+color}>{value.length>48?value.slice(0,36)+"…":value}</span>
                  <CopyButton text={value} iconOnly/>
                </div>
              </div>
            ))}
            {hasTx&&(
              <div>
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Solana Tx</p>
                <div className="flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2">
                  <span className="font-mono text-[10px] text-purple-300 flex-1 break-all">{data.solanaTxSig.slice(0,32)}…</span>
                  <CopyButton text={data.solanaTxSig} iconOnly/>
                </div>
                <div className="flex gap-2 mt-2">
                  <a href={solscan(data.solanaTxSig)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 btn-primary text-white font-semibold text-[10px] px-3 py-1.5 rounded-lg"><ExtIcon/>Solscan</a>
                  <a href={explorer(data.solanaTxSig)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 btn-ghost text-slate-300 font-semibold text-[10px] px-3 py-1.5 rounded-lg"><ExtIcon/>Explorer</a>
                  <CopyButton text={data.solanaTxSig} label="Copy Sig"/>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Created</p><p className="text-xs text-slate-300">{new Date(data.createdAt).toLocaleString()}</p></div>
              <div><p className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1">Expires</p><p className={"text-xs font-mono "+(isValid?"text-green-400":"text-red-400")}>{new Date(data.expiresAt).toLocaleString()}</p></div>
            </div>
          </div>
        </div>

        {/* AI Agent */}
        {data.agentDecision&&(
          <div className="glass rounded-2xl overflow-hidden border border-white/[0.07] mb-4 anim-up-3">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06] bg-black/10">
              <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse"/>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Agent Decision</p>
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className={"font-black text-lg "+(data.agentDecision.qualifies?"text-green-400":"text-red-400")}>{data.agentDecision.qualifies?"ACCESS GRANTED":"ACCESS DENIED"}</span>
                <span className="text-xs text-slate-400 font-mono">{(data.agentDecision.confidence*100).toFixed(0)}% confidence</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all duration-1000" style={{width:data.agentDecision.confidence*100+"%"}}/>
              </div>
              <p className="text-slate-400 text-sm mb-3">{data.agentDecision.reason}</p>
              <div className="flex flex-wrap gap-1.5">
                {data.agentDecision.actions.map(a=>(
                  <span key={a} className="badge badge-purple text-[9px]">{a}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Commitment reveal */}
        <div className="glass rounded-2xl p-5 border border-white/[0.07] mb-8 anim-up-4">
          <button onClick={()=>setRevealed(r=>!r)} className="w-full flex items-center justify-between text-sm font-semibold text-slate-400 hover:text-white transition-colors">
            <span>Cryptographic Commitment</span>
            <span className="text-slate-600 text-xs">{revealed?"▲ Hide":"▼ Show"}</span>
          </button>
          {revealed&&(
            <div className="mt-3 bg-black/25 rounded-xl p-3 border border-white/[0.05] anim-fade">
              <div className="flex items-start gap-2">
                <p className="font-mono text-[10px] text-green-400 break-all flex-1 leading-relaxed">{data.commitment}</p>
                <CopyButton text={data.commitment} iconOnly/>
              </div>
              <p className="text-[10px] text-slate-600 mt-2">One-way hash commitment. Cannot be reversed to reveal private data.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row gap-3 anim-up-5">
          <Link href="/" className="flex-1 btn-ghost text-slate-300 font-semibold py-3 rounded-xl text-sm text-center">← Home</Link>
          <Link href="/generate" className="flex-1 btn-primary text-white font-bold py-3 rounded-xl text-sm text-center">Generate Your Own Proof</Link>
        </div>
        <p className="text-center text-[10px] text-slate-700 mt-6 font-mono uppercase tracking-widest">Verified by StealthID · MagicBlock PER + Solana</p>
      </div>
    </div>
  );
}
