const assert=require('node:assert/strict');const P=require('../app/src/main/assets/core.js');const d=P.empty();d.budget=1500000;d.reserve=200000;d.categoryBudgets.Food=300000;d.entries=[{id:'a',amount:12550,date:'2026-10-06',category:'Food',payment:'bKash',kind:'regular',note:'<script>alert(1)</script> & "Lunch"',created:1},{id:'b',amount:500000,date:'2026-09-30',category:'Bills',payment:'Cash',kind:'occasional',note:'September only',created:1}];const h=P.report(d,'2026-10');assert(h.includes('BDT 125.50'));assert(h.includes('BDT 13,000.00'));assert(h.includes('BDT 12,874.50'));assert(h.includes('&lt;script&gt;'));assert(!h.includes('<script>'));assert(!h.includes('September only'));assert(h.includes('bKash'));assert(h.includes('thead'));assert(h.includes('Save as PDF'));assert.throws(()=>P.report(d,'2026-99'));d.language='bn';assert(P.report(d,'2026-10').includes('মাসিক খরচের প্রতিবেদন'));assert(P.report(P.empty(),'2026-10').includes('No recorded expenses this month.'));// Category chart: one bar segment per category with spending or a limit, plus a text legend fallback.
assert(h.includes('class="chart"')&&h.includes('class="seg"')&&h.includes('class="legend"'));
// October holds one recorded category (Food) plus a limit-only category (Food's limit is the same record), so expect one segment.
assert.equal((h.match(/class="seg"/g)||[]).length,1);
assert(h.includes('Share'));
// Print readiness: explicit page margin, repeating table header and no row split across pages.
assert(h.includes('@page{size:A4;margin:13mm}'));assert(h.includes('display:table-header-group'));assert(h.includes('break-inside:avoid'));
assert(h.includes('border-collapse:collapse'));
// Chart labels are escaped too.
const chartEsc=P.report({...P.empty(),entries:[{id:'c',amount:500,date:'2026-10-02',category:'Food',payment:'Cash',kind:'regular',note:'',created:1}]},'2026-10');
assert(chartEsc.includes('class="chart"')&&!chartEsc.includes('<script'));

// A category with a limit but no spending keeps its breakdown row but draws no bar.
const limitOnly=P.empty();limitOnly.categoryBudgets.Bills=900000;
const hLimit=P.report(limitOnly,'2026-10');
assert(hLimit.includes('>Bills<')&&hLimit.includes('BDT 9,000.00'));assert(!hLimit.includes('class="chart"'));

// Spending plus a limit-only category charts one segment per listed category.
const mixed=P.empty();mixed.categoryBudgets.Bills=900000;
mixed.entries=[{id:'m',amount:5000,date:'2026-10-02',category:'Food',payment:'Cash',kind:'regular',note:'lunch',created:1}];
const hMixed=P.report(mixed,'2026-10');
assert.equal((hMixed.match(/class="seg"/g)||[]).length,2);assert(hMixed.includes('>Food<')&&hMixed.includes('>Bills<'));

// Bidi control characters in a note are stripped before escaping.
const bidi=P.empty();bidi.entries=[{id:'bid',amount:100,date:'2026-10-01',category:'Food',payment:'Cash',kind:'regular',note:'a\u202eb',created:1}];
assert(!P.report(bidi,'2026-10').includes('\u202e'));
console.log('PASS: report monthly filtering, totals, savings deduction, escaping, payment details, bilingual text, empty month, invalid month, category chart, limit-only categories, bidi stripping, print pagination styles.');
