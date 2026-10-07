const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),Pocket=require('../app/src/main/assets/core.js');
class El{constructor(){this.value='';this.style={};this.children=[];this.textContent='';this.hidden=false;this.dataset={};this.open=false;}append(...xs){this.children.push(...xs);if(!this.value&&xs[0]?.value)this.value=xs[0].value;}replaceChildren(){this.children=[];this.value='';}get options(){return this.children;}showModal(){this.open=true;}close(){this.open=false;}focus(){}click(){}setAttribute(){} }
const els={},get=id=>els[id]||=(new El());let saved=JSON.stringify(Pocket.empty()),fileExports=[],intent=null,delayed=[];const c={Pocket,console,Date,Math,JSON,Number,Object,Array,String,Map,Set,alert:m=>{throw Error('Unexpected alert: '+m)},confirm:()=>true,setTimeout:(fn)=>{delayed.push(fn);return delayed.length},clearTimeout:()=>{},setInterval:()=>{},document:{documentElement:{},querySelectorAll:()=>[],getElementById:get,createElement:()=>new El()},PocketNative:{read:()=>saved,save:s=>{saved=s;return true},exportFile:(...args)=>fileExports.push(args),pin:()=>{},printReport:(...args)=>fileExports.push(args),syncWidgets:()=>{},launchIntent:()=>intent}};vm.createContext(c);vm.runInContext(fs.readFileSync(require('node:path').join(__dirname,'../app/src/main/assets/app.js'),'utf8'),c);const run=s=>vm.runInContext(s,c),ev='{preventDefault(){}}';
run(`openAdd('Transport');$('value').value='50.75';$('payment').value='bKash';$('note').value='Bus';saveEntry(${ev});`);assert.equal(JSON.parse(saved).entries[0].amount,5075);assert.equal(JSON.parse(saved).lastCategory,'Transport');run('openAdd()');assert.equal(get('category').value,'Transport');assert.equal(get('payment').value,'bKash');run(`editEntry(state.entries[0]);$('value').value='60.25';saveEntry(${ev})`);assert.equal(JSON.parse(saved).entries.length,1);assert.equal(JSON.parse(saved).entries[0].amount,6025);
run('deleteEntry(state.entries[0])');assert.equal(JSON.parse(saved).entries.length,0);run('undoDelete()');assert.equal(JSON.parse(saved).entries[0].amount,6025);
run(`openBudget();$('budgetValue').value='1000';$('reserveValue').value='200';$('limitFood').value='300';saveBudget(${ev})`);assert.equal(JSON.parse(saved).reserve,20000);assert.equal(JSON.parse(saved).categoryBudgets.Food,30000);
run(`$('billNote').value='Electricity';$('billAmount').value='125';$('billDay').value='1';$('billCategory').value='Bills';$('billPayment').value='Bank';saveRecurring(${ev});payBill(state.recurring[0]);saveEntry(${ev});`);assert.equal(JSON.parse(saved).recurring[0].paid,Pocket.dateKey().slice(0,7));run('deleteEntry(state.entries[0])');assert.equal(JSON.parse(saved).recurring[0].paid,'');run('undoDelete()');assert.equal(JSON.parse(saved).recurring[0].paid,Pocket.dateKey().slice(0,7));
run('language()');delayed.splice(0).forEach(fn=>fn());assert.equal(JSON.parse(saved).language,'bn');run('exportCSV();backup()');assert.equal(fileExports[0][2],'text/csv');assert.equal(fileExports[1][2],'application/json');run('backupSaved(state.revision)');assert.equal(JSON.parse(saved).backupRevision,JSON.parse(saved).revision);
run("$('monthSelect').value=Pocket.dateKey().slice(0,7);exportPDF()");assert(fileExports[2][0].includes('Monthly expense report')||fileExports[2][0].includes('মাসিক খরচের প্রতিবেদন'));assert(fileExports[2][1].startsWith('Pocket-Expense-'));

// Home-screen privacy: the toggle persists and the widget is told to redraw at once.
run('hideAmounts()');delayed.splice(0).forEach(fn=>fn());assert.equal(JSON.parse(saved).allowHideAmounts,true);run('render()');assert.equal(get('hideAmounts').checked,true);
run('hideAmounts()');delayed.splice(0).forEach(fn=>fn());assert.equal(JSON.parse(saved).allowHideAmounts,false);

// Language toggle writes immediately so both widgets refresh instead of waiting for the 60-second render loop.
run('language()');delayed.splice(0).forEach(fn=>fn());assert.equal(JSON.parse(saved).language,'en');

// A widget shortcut arrives as an Android intent and opens the entry dialog with that category.
intent=JSON.stringify({add:true,category:'Groceries'});run('applyLaunchIntent()');assert.equal(get('category').value,'Groceries');assert.equal(get('entry').open,true);assert.equal(get('date').value,Pocket.dateKey());
intent=JSON.stringify({add:true,category:'Nope'});run('applyLaunchIntent()');assert(Pocket.categories.includes(get('category').value));
intent=JSON.stringify({add:true});run('applyLaunchIntent()');assert.equal(get('category').value,JSON.parse(saved).lastCategory,'no category falls back to the remembered one');
intent=null;run('applyLaunchIntent()');

// Native exports are handed over as base64 so Bangla notes and currency symbols survive the bridge.
assert(fileExports[0][0].startsWith('base64:'));assert(Buffer.from(fileExports[1][0].slice(7),'base64').toString('utf8').startsWith('{'));
console.log('PASS: app flow with DOM stubs: add, remembered category/payment, edit, delete/undo, budget/reserve/category limits, recurring confirmation/delete/undo, language, native CSV/JSON export, base64 payloads, backup acknowledgment, widget privacy toggle, widget launch intents. Not browser or device rendering.');
