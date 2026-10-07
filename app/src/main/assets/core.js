(function(root){
'use strict';
const categories=['Food','Groceries','Transport','Bills','Shopping','Health','Family','Other'];
const payments=['Cash','bKash','Nagad','Bank','Card'];
const dateKey=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const isDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&dateKey(new Date(s+'T12:00:00'))===s;
const cents=n=>Math.round(Number(n)*100);
const isMoney=n=>Number.isSafeInteger(n)&&n>=0&&n<=99999999900;
function empty(){return {version:2,budget:0,reserve:0,categoryBudgets:{},monthly:{},entries:[],recurring:[],lastCategory:'Food',lastPayment:'Cash',language:'en',allowHideAmounts:false,lastBackup:0,revision:0,backupRevision:0};}
function migrate(d){if(!d||!Array.isArray(d.entries))throw Error('Invalid data');
// An unversioned or version 1 payload keeps its records and gains today's defaults, including allowHideAmounts.
if(d.version===1||typeof d.version==='undefined'){const n={...empty(),...d,version:2};n.entries=d.entries.map(e=>({...e,payment:'Cash',kind:'regular',created:0,...(typeof e.payment==='string'?{}:{payment:'Cash'})}));if(!valid(n))throw Error('Invalid legacy data');return n;}
if(d.version===2){const n={...empty(),...d};if(!valid(n))throw Error('Invalid data');return n;}
throw Error('Invalid data version');}
function configOK(c){return c&&isMoney(c.budget)&&isMoney(c.reserve)&&c.reserve<=c.budget&&c.categoryBudgets&&Object.keys(c.categoryBudgets).every(k=>categories.includes(k)&&isMoney(c.categoryBudgets[k]));}
function valid(d){if(!d||d.version!==2||typeof d.allowHideAmounts!=='boolean'||!configOK(d)||!d.monthly||!Object.keys(d.monthly).every(k=>/^\d{4}-(0[1-9]|1[0-2])$/.test(k)&&configOK(d.monthly[k]))||!Array.isArray(d.entries)||d.entries.length>100000||!Array.isArray(d.recurring)||d.recurring.length>1000||!['en','bn'].includes(d.language)||!categories.includes(d.lastCategory)||!payments.includes(d.lastPayment)||!Number.isSafeInteger(d.revision)||d.revision<0||!Number.isSafeInteger(d.backupRevision)||d.backupRevision<0||!Number.isSafeInteger(d.lastBackup)||d.lastBackup<0)return false;
const ids=new Set();if(!Number.isSafeInteger(d.entries.reduce((n,e)=>n+e.amount,0))||new Set(d.recurring.map(r=>r.id)).size!==d.recurring.length)return false;return d.entries.every(e=>typeof e.id==='string'&&e.id.length<=100&&!ids.has(e.id)&&(ids.add(e.id),true)&&isMoney(e.amount)&&e.amount>0&&categories.includes(e.category)&&payments.includes(e.payment)&&['regular','occasional'].includes(e.kind)&&typeof e.note==='string'&&e.note.length<=120&&isDate(e.date)&&Number.isSafeInteger(e.created)&&e.created>=0)&&d.recurring.every(r=>typeof r.id==='string'&&typeof r.note==='string'&&r.note.length>0&&r.note.length<=120&&isMoney(r.amount)&&r.amount>0&&categories.includes(r.category)&&payments.includes(r.payment)&&Number.isInteger(r.day)&&r.day>=1&&r.day<=31&&typeof r.paid==='string'&&(r.paid===''||/^\d{4}-(0[1-9]|1[0-2])$/.test(r.paid)));}
function config(d,month){return d.monthly[month]||{budget:d.budget,reserve:d.reserve,categoryBudgets:d.categoryBudgets};}
function stats(d,month,now=new Date()){const cfg=config(d,month),entries=d.entries.filter(e=>e.date.startsWith(month)),sum=es=>es.reduce((a,e)=>a+e.amount,0),total=sum(entries),limit=cfg.budget-cfg.reserve,today=sum(d.entries.filter(e=>e.date===dateKey(now))),days=new Date(now.getFullYear(),now.getMonth()+1,0).getDate(),left=limit-total,ratio=limit>0?total/limit:0,current=month===dateKey(now).slice(0,7);return {cfg,entries,total,today,limit,left,regular:sum(entries.filter(e=>e.kind==='regular')),occasional:sum(entries.filter(e=>e.kind==='occasional')),ratio,pace:cfg.budget===0?'unset':total>limit?'over':current&&ratio>now.getDate()/days?'ahead':'ontrack',allowance:current&&cfg.budget>0?Math.floor(Math.max(0,left)/(days-now.getDate()+1)):null};}
function due(d,now=new Date()){const month=dateKey(now).slice(0,7),lastDay=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();return d.recurring.filter(r=>r.paid!==month&&Math.min(r.day,lastDay)<=now.getDate());}
function insights(d,now=new Date()){const end=new Date(now.getFullYear(),now.getMonth(),now.getDate()),start=new Date(end),prev=new Date(end);start.setDate(start.getDate()-7);prev.setDate(prev.getDate()-14);const a=dateKey(start),b=dateKey(prev),z=dateKey(end),recent=d.entries.filter(e=>e.date>=a&&e.date<z),older=d.entries.filter(e=>e.date>=b&&e.date<a);if(!recent.length||!older.length)return [];return categories.map(category=>{const sum=es=>es.filter(e=>e.category===category).reduce((s,e)=>s+e.amount,0);return {category,change:sum(recent)-sum(older)}}).filter(x=>x.change!==0).sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)).slice(0,2);}
function duplicate(d,e,now=Date.now()){return d.entries.some(x=>x.id!==e.id&&x.date===e.date&&x.category===e.category&&x.amount===e.amount&&x.created>0&&now-x.created>=0&&now-x.created<120000);}
function csv(d){const safe=v=>{let s=String(v);if(/^[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"'};return '\ufeff'+['Date,Amount BDT,Category,Payment,Type,Note',...d.entries.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(e=>[e.date,(e.amount/100).toFixed(2),e.category,e.payment,e.kind,e.note].map(safe).join(','))].join('\r\n');}
function report(d,month){
if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))throw Error('Invalid month');
const bn=d.language==='bn',s=stats(d,month),esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])),cash=n=>'BDT '+(n/100).toLocaleString(bn?'bn-BD':'en-US',{minimumFractionDigits:2,maximumFractionDigits:2}),label=(en,b)=>bn?b:en;
const names={Food:'খাবার',Groceries:'বাজার',Transport:'যাতায়াত',Bills:'বিল',Shopping:'কেনাকাটা',Health:'স্বাস্থ্য',Family:'পরিবার',Other:'অন্যান্য',regular:'নিয়মিত',occasional:'বিশেষ',Cash:'নগদ',Bank:'ব্যাংক',Card:'কার্ড'},name=v=>bn?(names[v]||v):v;
/* Entry notes may contain bidi control characters. Strip them before escaping so the layout stays predictable. */
const clean=v=>String(v).replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069]/g,'');
const rows=s.entries.slice().sort((a,b)=>a.date.localeCompare(b.date)||a.created-b.created||a.id.localeCompare(b.id)).map(e=>`<tr><td class="dt">${esc(e.date)}</td><td>${esc(name(e.category))}</td><td>${esc(name(e.payment))}</td><td>${esc(name(e.kind))}</td><td class="note">${esc(clean(e.note))||'-'}</td><td class="num">${cash(e.amount)}</td></tr>`).join('');
const sumOf=es=>es.reduce((n,e)=>n+e.amount,0);
const cats=categories.map(c=>({name:c,total:sumOf(s.entries.filter(e=>e.category===c)),limit:s.cfg.categoryBudgets[c]||0})).filter(c=>c.total||c.limit);
const rowsCat=cats.map(c=>`<tr><td>${esc(name(c.name))}</td><td class="num">${cash(c.total)}</td><td class="num">${s.total?Math.round(c.total/s.total*100)+'%':'0%'}</td><td class="num">${c.limit?cash(c.limit):'-'}</td></tr>`).join('');
const paymentsRows=payments.map(p=>({name:p,total:sumOf(s.entries.filter(e=>e.payment===p))})).filter(p=>p.total).map(p=>`<tr><td>${esc(name(p.name))}</td><td class="num">${cash(p.total)}</td></tr>`).join('');
/* Simple CSS category chart with a text legend, so the off-screen WebView needs no JavaScript.
   Scale against the largest spending value so a limit with no spending stays zero-width but is still listed,
   and only draw the track when at least one category actually has spending. */
const chartMax=Math.max(0,...cats.map(c=>c.total));
const bar=chartMax?cats.map(c=>`<span class="seg" style="width:${(c.total/chartMax*100).toFixed(3)}%"></span>`).join(''):'';
const legend=cats.map(c=>`<li>${esc(name(c.name))} · ${cash(c.total)}${s.total?' · '+Math.round(c.total/s.total*100)+'%':''}</li>`).join('');
return `<!doctype html><html lang="${bn?'bn':'en'}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Pocket Expense ${month}</title><style>
/* @page 13 mm matches the hardware-aware margins requested through PrintAttributes in MainActivity. */
@page{size:A4;margin:13mm}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{color:#183f35;background:white;font:12px/1.45 system-ui,'Noto Sans Bengali','Nirmala UI',sans-serif;margin:0;overflow-wrap:break-word}
h1{font-size:28px;letter-spacing:-1px;margin:0}
h2{font-size:15px;margin:18px 0 8px;break-after:avoid;page-break-after:avoid}
header{border-bottom:2px solid #183f35;padding-bottom:12px;margin-bottom:14px}
.muted{color:#65736b}
.summary,.data{width:100%;border-collapse:collapse;table-layout:fixed}
.summary td{padding:9px 10px;border:1px solid #d9dfd4;width:25%;vertical-align:top}
.summary b{display:block;font-size:15px;margin-top:4px;overflow-wrap:anywhere}
.data{margin:6px 0 14px;font-size:10.5px}
.data th{background:#edf1e7;text-align:left;padding:7px 8px;border-bottom:1px solid #bcc8b9}
.data td{padding:7px 8px;border-bottom:1px solid #e0e5dc;vertical-align:top;overflow-wrap:anywhere}
thead{display:table-header-group}
tr{break-inside:avoid;page-break-inside:avoid}
.num{text-align:right;white-space:nowrap}
.note{word-break:break-word}
.dt{white-space:nowrap}
.chart{display:flex;height:16px;border:1px solid #d9dfd4;border-radius:8px;overflow:hidden;background:#edf1e7}
.chart .seg{display:block;background:#56764b}
.chart .seg:nth-child(2n){background:#7fa05f}
.chart .seg:nth-child(3n){background:#a7c07a}
.chart .seg:nth-child(4n){background:#4a6a44}
.legend{list-style:none;margin:10px 0 14px;padding:0;columns:2;column-gap:18px;font-size:10.5px}
.legend li{margin:0 0 5px;break-inside:avoid}
.none{color:#65736b;font-style:italic;margin:6px 0 14px}
footer{border-top:1px solid #d9dfd4;margin-top:18px;padding-top:10px;font-size:10px}
.printHelp{padding:12px 14px;background:#eef3e4;margin-bottom:14px;border-radius:8px}
@media screen{body{max-width:900px;margin:24px auto;padding:20px}}
@media print{.printHelp{display:none}body{max-width:none;margin:0;padding:0}}
</style><body>
<div class="printHelp">${label('To save this report as PDF, use your browser Print option and choose Save as PDF. On mobile, look under the browser Share or menu options.','PDF সংরক্ষণ করতে ব্রাউজারের Print থেকে Save as PDF নির্বাচন করুন। মোবাইলে Share বা মেনু দেখুন।')}</div>
<header><h1>pocket.</h1><div>${label('Monthly expense report','মাসিক খরচের প্রতিবেদন')} · ${esc(month)}</div><div class="muted">${label('Generated','তৈরি')}: ${dateKey()} · BDT</div></header>
<h2>${label('Totals','সারসংক্ষেপ')}</h2>
<table class="summary"><tr><td>${label('Total allocation','মোট বরাদ্দ')}<b>${cash(s.cfg.budget)}</b></td><td>${label('Savings reserve','সঞ্চয়ের বরাদ্দ')}<b>${cash(s.cfg.reserve)}</b></td><td>${label('Spending budget','খরচের বাজেট')}<b>${cash(s.limit)}</b></td><td>${s.cfg.budget?label(s.left>=0?'Remaining':'Over budget',s.left>=0?'অবশিষ্ট':'বাজেটের বেশি'):label('Budget not set','বাজেট নির্ধারিত নয়')}<b>${s.cfg.budget?cash(Math.abs(s.left)):'-'}</b></td></tr><tr><td>${label('Recorded spending','নথিভুক্ত খরচ')}<b>${cash(s.total)}</b></td><td>${label('Regular','নিয়মিত')}<b>${cash(s.regular)}</b></td><td>${label('Occasional','বিশেষ')}<b>${cash(s.occasional)}</b></td><td>${label('Expenses recorded','খরচের সংখ্যা')}<b>${s.entries.length}</b></td></tr></table>
<h2>${label('Category chart','বিভাগভিত্তিক চার্ট')}</h2>${bar?`<div class="chart" role="img" aria-label="${label('Relative spending by category','বিভাগ অনুযায়ী খরচ')}">${bar}</div><ul class="legend">${legend}</ul>`:'<p class="none">'+label('No recorded expenses or category limits.','কোনো খরচ বা বিভাগের সীমা নেই।')+'</p>'}
<h2>${label('Category breakdown','বিভাগভিত্তিক খরচ')}</h2>
<table class="data"><thead><tr><th style="width:34%">${label('Category','বিভাগ')}</th><th class="num" style="width:24%">${label('Spent','খরচ')}</th><th class="num" style="width:14%">${label('Share','অংশ')}</th><th class="num" style="width:28%">${label('Limit','সীমা')}</th></tr></thead><tbody>${rowsCat||'<tr><td colspan="4">'+label('No recorded expenses or category limits.','কোনো খরচ বা বিভাগের সীমা নেই।')+'</td></tr>'}</tbody></table>
<h2>${label('Payment methods','পরিশোধের মাধ্যম')}</h2>
<table class="data"><thead><tr><th>${label('Method','মাধ্যম')}</th><th class="num" style="width:32%">${label('Amount','পরিমাণ')}</th></tr></thead><tbody>${paymentsRows||'<tr><td colspan="2">-</td></tr>'}</tbody></table>
<h2>${label('Expense details','খরচের বিবরণ')} · ${s.entries.length}</h2>
<table class="data"><colgroup><col style="width:15%"><col style="width:16%"><col style="width:14%"><col style="width:13%"><col><col style="width:19%"></colgroup><thead><tr><th>${label('Date','তারিখ')}</th><th>${label('Category','বিভাগ')}</th><th>${label('Payment','মাধ্যম')}</th><th>${label('Type','ধরন')}</th><th>${label('Note','নোট')}</th><th class="num">${label('Amount','পরিমাণ')}</th></tr></thead><tbody>${rows||'<tr><td colspan="6">'+label('No recorded expenses this month.','এই মাসে কোনো খরচ লেখা হয়নি।')+'</td></tr>'}</tbody></table>
<footer>${label('Includes every expense recorded for the selected month, regardless of the in-app search filter. Savings reserve is an allocation, not proof of a deposit. This report reflects recorded expenses only.','অ্যাপের অনুসন্ধান ফিল্টার নির্বিশেষে নির্বাচিত মাসের সব নথিভুক্ত খরচ অন্তর্ভুক্ত। সঞ্চয়ের বরাদ্দ ব্যাংকে জমার প্রমাণ নয়। এই প্রতিবেদন শুধু নথিভুক্ত খরচ দেখায়।')}</footer></body></html>`;
}
/* Android expects text to hand to ContentResolver in a byte-oriented charset. Encode the payload as
   Base64 so no character survives a lossy JavaScript-to-Java string bridge. */
function exportPayload(text){
const utf8=new TextEncoder().encode(String(text));
let bin='';for(const b of utf8)bin+=String.fromCharCode(b);
const b64=(typeof btoa==='function')?btoa(bin):(typeof Buffer!=='undefined'?Buffer.from(utf8).toString('base64'):null);
if(b64===null)throw Error('Base64 unavailable');
return {text:'base64:'+b64,length:utf8.length};
}
const api={categories,payments,dateKey,isDate,cents,isMoney,empty,migrate,valid,config,stats,due,insights,duplicate,csv,report,exportPayload};if(typeof module!=='undefined')module.exports=api;else root.Pocket=api;
})(typeof globalThis!=='undefined'?globalThis:this);
