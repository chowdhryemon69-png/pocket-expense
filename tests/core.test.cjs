const assert=require('node:assert/strict');const P=require('../app/src/main/assets/core.js');
const e=(id,amount,date,category='Food')=>({id,amount,date,category,payment:'Cash',kind:'regular',note:'Lunch',created:1000});
const d=P.empty();d.budget=100000;d.reserve=20000;d.entries=[e('a',12550,'2026-10-06'),e('b',5000,'2026-09-30')];
assert(P.valid(d));assert.equal(P.cents('125.50'),12550);let s=P.stats(d,'2026-10',new Date(2026,9,6,12));assert.equal(s.total,12550);assert.equal(s.today,12550);assert.equal(s.limit,80000);assert.equal(s.allowance,Math.floor(67450/26));assert.equal(s.pace,'ontrack');
d.entries[0].amount=90000;assert.equal(P.stats(d,'2026-10',new Date(2026,9,6)).pace,'over');d.entries[0].amount=30000;assert.equal(P.stats(d,'2026-10',new Date(2026,9,6)).pace,'ahead');
d.monthly['2026-09']={budget:50000,reserve:0,categoryBudgets:{}};assert.equal(P.stats(d,'2026-09').cfg.budget,50000);
assert.equal(P.isDate('2026-02-30'),false);assert.equal(P.isDate('2028-02-29'),true);assert.equal(P.isDate('2026-02-29'),false);
assert(!P.valid({...d,entries:[e('same',100,'2026-10-01'),e('same',200,'2026-10-02')]}));assert(!P.valid({...d,reserve:d.budget+1}));
const migrated=P.migrate({budget:50000,entries:[{id:'old',amount:1234,date:'2026-10-01',category:'Food',note:'x'}]});assert.equal(migrated.entries[0].payment,'Cash');assert.equal(migrated.entries[0].amount,1234);assert(P.valid(migrated));assert.throws(()=>P.migrate({budget:0,entries:[{id:'x',amount:-1,date:'2026-10-01',category:'Food',note:''}]}));
const r={id:'rent',amount:50000,day:31,note:'Rent',category:'Bills',payment:'Bank',paid:''};d.recurring=[r];assert.equal(P.due(d,new Date(2026,1,28)).length,1);r.paid='2026-02';assert.equal(P.due(d,new Date(2026,1,28)).length,0);assert.equal(P.due(d,new Date(2026,2,31)).length,1);
const weekly=P.empty();weekly.entries=[e('new',30000,'2026-10-05'),e('old',10000,'2026-09-25')];assert.equal(P.insights(weekly,new Date(2026,9,6))[0].change,20000);assert.equal(P.insights(P.empty()).length,0);
const du=P.empty();du.entries=[{...e('a',1000,'2026-10-06'),created:10000}];assert(P.duplicate(du,e('b',1000,'2026-10-06'),11000));assert(!P.duplicate(du,e('a',1000,'2026-10-06'),11000));assert(!P.duplicate(du,e('b',1000,'2026-10-06'),140001));
d.entries=[{...e('csv',100,'2026-10-06'),note:'=SUM(1,2) "test"'}];assert(P.csv(d).includes('"\'=SUM(1,2) ""test"""'));assert(P.valid(P.migrate(JSON.parse(JSON.stringify(d)))));

// Home-screen privacy flag: default, round trip through migrate, and rejection of a non-boolean value.
assert.equal(P.empty().allowHideAmounts,false);assert.equal(P.migrate(JSON.parse(JSON.stringify({...d,allowHideAmounts:true}))).allowHideAmounts,true);
assert.equal(P.migrate({budget:0,entries:[]}).allowHideAmounts,false);
assert(!P.valid({...d,allowHideAmounts:'yes'}));assert(!P.valid({...d,allowHideAmounts:true,version:3}));

// Month rollover: the same records produce day-dependent figures across a month and year boundary.
const roll=P.empty();roll.budget=310000;roll.reserve=0;
assert.equal(P.stats(roll,'2026-12',new Date(2026,11,31)).allowance,Math.floor(310000/1));
assert.equal(P.stats(roll,'2026-12',new Date(2026,11,1)).allowance,10000);
assert.equal(P.stats(roll,'2027-01',new Date(2027,0,1)).allowance,Math.floor(310000/31));
assert.equal(P.stats(roll,'2026-02',new Date(2026,1,28)).allowance,Math.floor(310000/1));
assert.equal(P.stats(roll,'2026-02',new Date(2026,1,28)).pace,'ontrack');
// A month without a recorded snapshot falls back to the current defaults.
roll.monthly['2026-11']={budget:62000,reserve:0,categoryBudgets:{}};
assert.equal(P.stats(roll,'2026-11',new Date(2026,10,10)).allowance,Math.floor(62000/21));
assert.equal(P.stats(roll,'2026-12',new Date(2026,11,1)).cfg.budget,310000);

// Native export payloads stay byte-identical through Base64 (Bangla notes, quotes, newlines).
const payload=P.exportPayload('নোট "Lunch"\n=SUM(1,2) ৳');
assert(payload.text.startsWith('base64:'));
assert.equal(Buffer.from(payload.text.slice(7),'base64').toString('utf8'),'নোট "Lunch"\n=SUM(1,2) ৳');
assert.equal(Buffer.from(P.exportPayload('{"a":1}').text.slice(7),'base64').toString('utf8'),'{"a":1}');

console.log('PASS: decimals, savings, monthly snapshots, pace, allowance, valid dates, migration, duplicate IDs, February bill dates, paid rollover, weekly comparisons, duplicate warning, CSV escaping, backup round trip, privacy flag validation, month/year rollover, base64 export payloads.');
