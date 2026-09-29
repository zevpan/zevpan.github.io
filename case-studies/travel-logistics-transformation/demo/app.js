const SEED={
historical:{
 cutoff:"29 Sep 2026",
 uniqueOrders:10524,
 coreRoutes:87.4,
 top3Channels:94.2,
 top3Suppliers:71.3,
 within72h:35.9,
 qcCoverage:64.0,
 refundCoverage:5.1,
 accommodationCoverage:5.0,
 routeMix:[
  ["Hotel → Airport",34.4],
  ["Hotel → Hotel",26.8],
  ["Airport → Hotel",26.3],
  ["Other / specialist",12.5]
 ],
 leadTime:[
  ["<24h",3.3],
  ["24–72h",32.6],
  ["3–7d",24.1],
  [">7d",40.0]
 ]
},
orders:[
{id:"TRV-1042",source:"Direct",sourceId:"WEB-84219",market:"Tokyo",service:"Hotel → Airport",customer:"A. Morgan",date:"28 Sep",time:"13:30",status:"IN_SERVICE",supplier:"Partner East",dispatch:"ACCEPTED",owner:"Auto",slaRisk:false,manualTouches:0,validation:{run:true,passed:true,missingFlight:false},events:[["12:46","Driver en route","Partner event"],["09:02","Supplier accepted","Structured dispatch"],["08:58","Validation passed","Rules engine"],["08:57","Order created","Direct booking"]]},
{id:"TRV-1048",source:"Distributor A",sourceId:"DIST-59301",market:"Osaka",service:"Airport → Hotel",customer:"M. Chen",date:"28 Sep",time:"16:20",status:"READY",supplier:null,dispatch:"NOT_SENT",owner:"Ops Queue",slaRisk:false,manualTouches:0,validation:{run:true,passed:true,missingFlight:false},events:[["11:06","Validation passed","Rules engine"],["11:05","Canonical order created","Distributor adapter"],["11:05","Source payload received","Distributor channel"]]},
{id:"TRV-1051",source:"Distributor A",sourceId:"DIST-59344",market:"Seoul",service:"Hotel → Airport",customer:"J. Patel",date:"28 Sep",time:"18:00",status:"AWAITING_SUPPLIER",supplier:"Partner North",dispatch:"PENDING",owner:"Ops Queue",slaRisk:true,manualTouches:1,validation:{run:true,passed:true,missingFlight:false},events:[["10:40","Dispatch pending","Partner North"],["10:36","Validation passed","Rules engine"],["10:35","Order created","Distributor adapter"]]},
{id:"TRV-1054",source:"Direct",sourceId:"WEB-84302",market:"Singapore",service:"Hotel → Airport",customer:"R. Lim",date:"28 Sep",time:"19:10",status:"VALIDATION_REQUIRED",supplier:null,dispatch:"BLOCKED",owner:"CS Review",slaRisk:true,manualTouches:1,validation:{run:false,passed:false,missingFlight:true},events:[["12:15","Missing flight information","Validation pre-check"],["12:14","Order created","Direct booking"]]},
{id:"TRV-1058",source:"Distributor A",sourceId:"DIST-59388",market:"Kyoto",service:"Hotel → Hotel",customer:"S. Lee",date:"28 Sep",time:"15:00",status:"CONFIRMED",supplier:"Partner West",dispatch:"ACCEPTED",owner:"Auto",slaRisk:false,manualTouches:0,validation:{run:true,passed:true,missingFlight:false},events:[["09:31","Supplier accepted","Structured dispatch"],["09:27","Validation passed","Rules engine"],["09:26","Order created","Distributor adapter"]]},
{id:"TRV-1060",source:"Distributor A",sourceId:"DIST-59410",market:"Tokyo",service:"Airport → Hotel",customer:"T. Brown",date:"28 Sep",time:"20:30",status:"COMPLETED",supplier:"Partner East",dispatch:"ACCEPTED",owner:"Auto",slaRisk:false,manualTouches:0,validation:{run:true,passed:true,missingFlight:false},events:[["14:08","Delivered","Proof recorded"],["13:22","Picked up","Partner event"],["09:12","Supplier accepted","Structured dispatch"]]},
{id:"TRV-1062",source:"Distributor A",sourceId:"DIST-59428",market:"Osaka",service:"Hotel → Hotel",customer:"L. Tan",date:"28 Sep",time:"14:00",status:"COMPLETED",supplier:"Partner West",dispatch:"ACCEPTED",owner:"Auto",slaRisk:false,manualTouches:0,validation:{run:true,passed:true,missingFlight:false},events:[["18:42","Delivered","Proof recorded"],["11:14","Supplier accepted","Structured dispatch"]]},
{id:"TRV-1064",source:"Distributor B",sourceId:"DIST-59461",market:"Seoul",service:"Airport → Hotel",customer:"P. Singh",date:"28 Sep",time:"17:10",status:"COMPLETED",supplier:"Partner North",dispatch:"ACCEPTED",owner:"Auto",slaRisk:false,manualTouches:0,validation:{run:true,passed:true,missingFlight:false},events:[["20:05","Delivered","Proof recorded"],["08:42","Supplier accepted","Structured dispatch"]]},
{id:"TRV-1066",source:"Distributor A",sourceId:"DIST-59475",market:"Fukuoka",service:"Hotel → Airport",customer:"C. Ng",date:"29 Sep",time:"11:00",status:"CONFIRMED",supplier:"Partner South",dispatch:"ACCEPTED",owner:"Auto",slaRisk:false,manualTouches:0,validation:{run:true,passed:true,missingFlight:false},events:[["08:51","Supplier accepted","Structured dispatch"],["08:48","Validation passed","Rules engine"]]},
{id:"TRV-1069",source:"Direct",sourceId:"WEB-84402",market:"Tokyo",service:"Hotel → Hotel",customer:"H. Wong",date:"29 Sep",time:"10:30",status:"COMPLETED",supplier:"Partner East",dispatch:"ACCEPTED",owner:"Auto",slaRisk:false,manualTouches:0,validation:{run:true,passed:true,missingFlight:false},events:[["17:20","Delivered","Proof recorded"],["07:56","Supplier accepted","Structured dispatch"]]}
],
exceptions:[],
signals:[
{time:"12:15",title:"TRV-1054 needs information",text:"Flight detail missing; validation cannot complete.",type:"risk"},
{time:"10:40",title:"TRV-1051 supplier response pending",text:"Acknowledgement timer is approaching threshold.",type:"warn"},
{time:"09:31",title:"TRV-1058 confirmed",text:"Preferred partner accepted automatically.",type:"ok"}
],
audit:[
["12:15","Rules","validation.blocked","TRV-1054 missing flight information"],
["11:06","Rules","validation.passed","TRV-1048 passed deterministic checks"],
["10:40","Dispatch","supplier.pending","TRV-1051 awaiting acknowledgement"]
]
};

const KEY="travel-control-tower-v2";
let state=JSON.parse(localStorage.getItem(KEY)||"null")||structuredClone(SEED);
const $=s=>document.querySelector(s),view=$("#view"),title=$("#title"),subtitle=$("#subtitle");

function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function setHead(t,s){title.textContent=t;subtitle.textContent=s}
function pill(o){return '<span class="status '+o.status+'">'+o.status.replaceAll("_"," ")+'</span>'}
function openExceptions(){return state.exceptions.filter(e=>e.status!=="RESOLVED")}
function pct(v){return Number(v).toFixed(1)+"%"}
function historicalCards(){
 const h=state.historical;
 return '<div class="calibration-strip">'+
  '<div class="calibration-stat"><small>Historical scale</small><b>'+h.uniqueOrders.toLocaleString()+'</b><span>unique orders analyzed through '+h.cutoff+'</span></div>'+
  '<div class="calibration-stat"><small>Core flows</small><b>'+pct(h.coreRoutes)+'</b><span>three dominant service types</span></div>'+
  '<div class="calibration-stat"><small>QC footprint</small><b>'+pct(h.qcCoverage)+'</b><span>unique orders in next-day QC</span></div>'+
  '<div class="calibration-stat"><small>Booked ≤72h</small><b>'+pct(h.within72h)+'</b><span>commerce-system matched orders</span></div>'+
 '</div>'
}
function queueRow(o){
 return '<div class="queue-row" onclick="openOrder(\''+o.id+'\')">'+
  '<div><div class="oid">'+o.id+'</div><div class="small">'+o.source+'</div></div>'+
  '<div><div class="name">'+o.market+" · "+o.service+'</div><div class="meta">'+o.customer+" · "+o.date+" "+o.time+'</div></div>'+
  '<div class="reason">'+(o.supplier||"Unassigned")+'</div><div class="owner">'+o.owner+'</div><div>'+pill(o)+'</div></div>'
}
function render(name){
 document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===name));
 ({tower,orders,dispatch,exceptions,metrics,evidence}[name]||tower)()
}

function tower(){
 setHead("Operations Control Tower","One view of today's workload, dispatch risk, exceptions and SLA exposure.");
 const total=state.orders.length;
 const awaiting=state.orders.filter(o=>o.dispatch==="PENDING"||o.dispatch==="NOT_SENT").length;
 const ex=openExceptions().length;
 const risk=state.orders.filter(o=>o.slaRisk).length;
 const auto=state.orders.filter(o=>o.manualTouches===0).length;
 view.innerHTML=
 historicalCards()+
 '<div class="intro"><div><h2>Shift focus from monitoring every order to managing what needs intervention.</h2><p>The demo records are synthetic. The operating emphasis is calibrated to observed route concentration, time pressure, QC workload and supplier-routing patterns.</p></div><div class="demo-path"><b>Featured walkthrough:</b> open <strong>TRV-1048</strong>. Dispatch Partner A, simulate rejection, fall back to Partner B, record Customer Ready, create a recipient exception, generate AI support, then approve the action.</div></div>'+
 '<div class="split-label">Live synthetic demo state</div>'+
 '<div class="metrics">'+
  '<div class="metric"><div class="metric-top"><b>'+total+'</b><span class="micro">synthetic</span></div><span>Orders in demo dataset</span></div>'+
  '<div class="metric warn"><div class="metric-top"><b>'+awaiting+'</b><span class="micro">live</span></div><span>Dispatch attention</span></div>'+
  '<div class="metric risk"><div class="metric-top"><b>'+risk+'</b><span class="micro">live</span></div><span>SLA risk</span></div>'+
  '<div class="metric risk"><div class="metric-top"><b>'+ex+'</b><span class="micro">live</span></div><span>Open exceptions</span></div>'+
  '<div class="metric"><div class="metric-top"><b>'+Math.round(auto/total*100)+'%</b><span class="micro">synthetic</span></div><span>Zero-touch demo orders</span></div>'+
 '</div>'+
 '<div class="layout"><div class="panel"><div class="panel-head"><h3>Operational queue</h3><span>Risk and intervention first</span></div><div class="panel-body">'+
 state.orders.filter(o=>o.status!=="COMPLETED").sort((a,b)=>(b.slaRisk-a.slaRisk)).map(queueRow).join("")+
 '</div></div><div class="panel"><div class="panel-head"><h3>What changed</h3><span>Latest events</span></div><div class="panel-body">'+
 state.signals.slice(0,5).map(s=>'<div class="signal"><div class="signal-top"><b>'+s.title+'</b><time>'+s.time+'</time></div><p>'+s.text+'</p></div>').join("")+
 '</div></div></div>'
}

function evidence(){
 setHead("Historical Evidence","Aggregate operating evidence used to calibrate the target model.");
 const h=state.historical;
 view.innerHTML=
 '<div class="evidence-banner"><b>Historical aggregates, synthetic records.</b><p>The metrics on this screen come from private 2026 operational data through '+h.cutoff+'. No customer names, addresses, booking IDs or individual historical records are exposed in the public prototype.</p></div>'+
 '<div class="historical-grid">'+
  '<div class="historical-card"><div class="kind">Historical scale</div><b>'+h.uniqueOrders.toLocaleString()+'</b><p>unique historical order IDs</p></div>'+
  '<div class="historical-card"><div class="kind">Core route concentration</div><b>'+pct(h.coreRoutes)+'</b><p>three dominant service types</p></div>'+
  '<div class="historical-card"><div class="kind">Top-3 channels</div><b>'+pct(h.top3Channels)+'</b><p>share of historical order rows</p></div>'+
  '<div class="historical-card"><div class="kind">Top-3 suppliers</div><b>'+pct(h.top3Suppliers)+'</b><p>share of historical order rows</p></div>'+
  '<div class="historical-card"><div class="kind">Booked within 72h</div><b>'+pct(h.within72h)+'</b><p>matched historical orders</p></div>'+
  '<div class="historical-card"><div class="kind">QC workflow</div><b>'+pct(h.qcCoverage)+'</b><p>unique historical orders</p></div>'+
  '<div class="historical-card"><div class="kind">Refund workflow</div><b>'+pct(h.refundCoverage)+'</b><p>unique historical orders</p></div>'+
  '<div class="historical-card"><div class="kind">Accommodation workflow</div><b>'+pct(h.accommodationCoverage)+'</b><p>unique historical orders</p></div>'+
 '</div>'+
 '<div class="layout" style="margin-top:12px">'+
  '<div class="panel"><div class="panel-head"><h3>Historical service-pattern mix</h3><span>share of order rows</span></div><div class="barlist">'+barRows(h.routeMix)+'</div></div>'+
  '<div class="panel"><div class="panel-head"><h3>Booking lead-time mix</h3><span>matched orders</span></div><div class="barlist">'+barRows(h.leadTime)+'</div></div>'+
 '</div>'+
 '<div class="evidence-note"><b>What this evidence supports:</b> standardize the dominant transaction paths; prioritize high-volume channel integrations; encode supplier routing and fallback explicitly; use lead time in urgency controls; treat QC as a core operating layer; and govern refunds / accommodation exceptions as structured workflows.<br><br><b>What it does not prove:</b> ROI, headcount savings, supplier quality ranking, post-redesign SLA improvement or a fully automatable percentage. <a class="evidence-link" href="../index.html">See the full case-study evidence →</a></div>'
}
function barRows(items){
 return items.map(x=>'<div class="barrow"><label>'+x[0]+'</label><div class="bartrack"><div class="barfill" style="width:'+x[1]+'%"></div></div><b>'+pct(x[1])+'</b></div>').join("")
}

function orders(){
 setHead("Orders","Every source resolves to one canonical operational record.");
 view.innerHTML='<div class="evidence-note" style="margin-bottom:10px"><b>Demo calibration:</b> the 10 synthetic records deliberately over-sample the three historically dominant service types. They are illustrative scenarios, not a statistically representative sample.</div>'+
 '<div class="panel"><div class="panel-head"><h3>Canonical Orders</h3><span>'+state.orders.length+' synthetic records</span></div><table><thead><tr><th>Order</th><th>Source</th><th>Route</th><th>Supplier</th><th>Owner</th><th>Status</th></tr></thead><tbody>'+
 state.orders.map(o=>'<tr class="click" onclick="openOrder(\''+o.id+'\')"><td><b>'+o.id+'</b><div class="small">'+o.sourceId+'</div></td><td>'+o.source+'</td><td>'+o.market+'<div class="small">'+o.service+'</div></td><td>'+(o.supplier||"Unassigned")+'</td><td>'+o.owner+'</td><td>'+pill(o)+'</td></tr>').join("")+
 '</tbody></table></div>'
}

function dispatch(){
 setHead("Dispatch","Structured assignment, acknowledgement timers, fallback and human override.");
 const list=state.orders.filter(o=>o.status!=="COMPLETED"&&o.status!=="IN_SERVICE");
 view.innerHTML='<div class="evidence-note" style="margin-bottom:10px"><b>Historical design input:</b> the top three supplier values cover 71.3% of historical rows, supporting explicit supplier master data, eligibility, acknowledgement and fallback logic.</div>'+
 '<div class="panel"><div class="panel-head"><h3>Dispatch Queue</h3><span>Eligibility before ranking</span></div><table><thead><tr><th>Order</th><th>Market</th><th>Assigned supplier</th><th>Dispatch state</th><th>Status</th></tr></thead><tbody>'+
 list.map(o=>'<tr class="click" onclick="openOrder(\''+o.id+'\')"><td><b>'+o.id+'</b></td><td>'+o.market+'</td><td>'+(o.supplier||"—")+'</td><td>'+o.dispatch+'</td><td>'+pill(o)+'</td></tr>').join("")+
 '</tbody></table></div>'
}

function exceptions(){
 setHead("Exceptions","Only cases requiring intervention should compete for Operations attention.");
 const ex=openExceptions();
 view.innerHTML='<div class="evidence-note" style="margin-bottom:10px"><b>Historical design input:</b> next-day QC touches roughly 64% of unique historical orders. The target model therefore converts broad monitoring into explicit risk, timer and evidence-based exception states.</div>'+
 (ex.length?
 '<div class="panel"><div class="panel-head"><h3>Exception Queue</h3><span>'+ex.length+' open</span></div><table><thead><tr><th>Case</th><th>Order</th><th>Type</th><th>Severity</th><th>Owner</th><th>Status</th></tr></thead><tbody>'+
 ex.map(e=>'<tr class="click" onclick="openOrder(\''+e.orderId+'\')"><td><b>'+e.id+'</b></td><td>'+e.orderId+'</td><td>'+e.type+'</td><td>'+e.severity+'</td><td>'+e.owner+'</td><td>'+e.status+'</td></tr>').join("")+
 '</tbody></table></div>':
 '<div class="panel empty">No open exceptions yet. Open TRV-1048 and create the recipient-verification scenario.</div>')
}

function metrics(){
 setHead("Process Metrics","Historical baseline context separated from synthetic live-demo measures.");
 const total=state.orders.length;
 const zero=state.orders.filter(o=>o.manualTouches===0).length;
 const manual=state.orders.reduce((a,o)=>a+o.manualTouches,0);
 const accepted=state.orders.filter(o=>o.dispatch==="ACCEPTED").length;
 const ex=state.exceptions.length;
 const touch=Math.round(zero/total*100),avg=(manual/total).toFixed(1),confirm=Math.round(accepted/total*100),exRate=Math.round(ex/total*100);
 const h=state.historical;
 view.innerHTML=
 '<div class="split-label">Verified historical aggregate context</div>'+
 '<div class="metric-grid">'+
  '<div class="metric-card"><b>'+h.uniqueOrders.toLocaleString()+'</b><span>Unique historical orders analyzed</span></div>'+
  '<div class="metric-card"><b>'+pct(h.qcCoverage)+'</b><span>Unique orders appearing in QC workflow</span></div>'+
  '<div class="metric-card"><b>'+pct(h.within72h)+'</b><span>Matched orders booked within 72h</span></div>'+
  '<div class="metric-card"><b>'+pct(h.refundCoverage)+'</b><span>Unique orders appearing in refund workflow</span></div>'+
 '</div>'+
 '<div class="split-label">Current synthetic demo state</div>'+
 '<div class="metric-note">The metrics below are calculated only from the 10 synthetic demo records. They are not historical business results.</div>'+
 '<div class="metric-grid">'+
  '<div class="metric-card"><b>'+touch+'%</b><span>Zero-touch demo rate</span></div>'+
  '<div class="metric-card"><b>'+avg+'</b><span>Manual touches / demo order</span></div>'+
  '<div class="metric-card"><b>'+confirm+'%</b><span>Supplier accepted / demo total</span></div>'+
  '<div class="metric-card"><b>'+exRate+'%</b><span>Demo exception rate</span></div>'+
 '</div>'+
 '<div class="formula"><b>Why this matters:</b> once orders, events, supplier responses, exceptions and human overrides are structured, measures can be calculated from the event model instead of reconstructed manually. Historical performance and prototype-state metrics remain explicitly separated.<br><br><code>touchless_rate = zero_touch_orders / total_demo_orders</code><br><code>exception_rate = demo_exception_cases / total_demo_orders</code></div>'
}

function openOrder(id){
 const o=state.orders.find(x=>x.id===id);if(!o)return;
 setHead("Canonical Booking Record","One source of truth regardless of booking channel.");
 const ex=state.exceptions.find(e=>e.orderId===o.id&&e.status!=="RESOLVED");
 view.innerHTML=
 '<div class="toolbar"><button class="back" onclick="render(\'tower\')">← Back to Control Tower</button><span class="demo-status">'+(o.id==="TRV-1048"?"Featured end-to-end walkthrough":"Synthetic order")+'</span></div>'+
 (o.demoMessage?'<div class="banner">'+o.demoMessage+'</div>':'')+
 '<div class="order-head"><div class="order-icon">↔</div><div><h2>'+o.id+'</h2><div class="meta">'+o.market+" · "+o.service+" · "+o.date+" "+o.time+'</div><div style="margin-top:7px">'+pill(o)+'</div></div><div class="actions">'+actionButtons(o,ex)+'</div></div>'+
 '<div class="detail-grid"><div>'+
 '<div class="card"><div class="card-title"><h3>Canonical order</h3><span>system of record</span></div><div class="field-grid">'+field("Source",o.source)+field("Source ID",o.sourceId)+field("Customer",o.customer)+field("Service",o.service)+field("Market",o.market)+field("Assigned supplier",o.supplier||"Unassigned")+field("Dispatch state",o.dispatch)+field("Owner",o.owner)+'</div></div>'+
 '<div class="card" style="margin-top:12px"><div class="card-title"><h3>Source → canonical mapping</h3><span>normalization</span></div><div class="mapping"><div class="mapping-col"><h4>'+o.source+' source payload</h4><p>external_order_id: '+o.sourceId+'</p><p>market: '+o.market+'</p><p>service_time: '+o.time+'</p><p>customer_name: '+o.customer+'</p></div><div class="map-arrow">→</div><div class="mapping-col"><h4>Canonical order</h4><p>order_id: '+o.id+'</p><p>market_code: '+o.market.toUpperCase().slice(0,3)+'</p><p>scheduled_at: '+o.date+' '+o.time+'</p><p>lifecycle_state: '+o.status+'</p></div></div></div>'+
 '<div class="card" style="margin-top:12px"><div class="card-title"><h3>Validation & rule decisions</h3><span>deterministic</span></div>'+validationHtml(o)+'</div>'+
 '<div class="card" style="margin-top:12px"><div class="card-title"><h3>Supplier dispatch</h3><span>structured fallback</span></div>'+dispatchHtml(o)+'</div>'+
 '</div><div>'+
 '<div class="card"><div class="card-title"><h3>Event timeline</h3><span>append-only demo history</span></div><div class="timeline">'+o.events.map(e=>'<div class="tl"><b>'+e[0]+" · "+e[1]+'</b><p>'+e[2]+'</p></div>').join("")+'</div></div>'+
 (ex?exceptionHtml(ex,o):'<div class="card" style="margin-top:12px"><div class="card-title"><h3>Exception state</h3><span>none open</span></div><div class="small">No active exception is linked to this order.</div></div>')+
 '</div></div>'
}
function field(k,v){return '<div class="field"><b>'+k+'</b><span>'+v+'</span></div>'}
function validationHtml(o){
 const checks=[
  ["Required fields",!o.validation.missingFlight||o.service.indexOf("Airport")<0,"Rule V-01"],
  ["Service area",true,"Rule V-04"],
  ["Lead time",true,"Rule V-07"],
  ["Airport / itinerary data",!o.validation.missingFlight,"Rule V-09"]
 ];
 return '<div class="checks">'+checks.map(c=>'<div class="check-row"><div class="check-icon '+(c[1]?"":"fail")+'">'+(c[1]?"✓":"!")+'</div><div><b>'+c[0]+'</b><p>'+(c[1]?"Condition satisfied":"Needs human / customer resolution")+'</p></div><span class="rule">'+c[2]+'</span></div>').join("")+'</div>'
}
function dispatchHtml(o){
 const aState=o.supplier==="Partner A"?(o.dispatch==="REJECTED"?"Rejected":"Pending"):o.supplier==="Partner B"?"Fallback used":"Eligible";
 return '<div class="dispatch-card">'+
 '<div class="supplier"><div><b>Partner A</b><p>Preferred for market · structured job link</p></div><span class="rank">'+aState+'</span></div>'+
 '<div class="supplier"><div><b>Partner B</b><p>Fallback coverage · structured job link</p></div><span class="rank">'+(o.supplier==="Partner B"?"Accepted":"Eligible")+'</span></div>'+
 '<div class="supplier"><div><b>Human override</b><p>Available when policy or route complexity requires judgement</p></div><span class="rank">Controlled</span></div>'+
 '</div>'
}
function actionButtons(o,ex){
 if(o.id!=="TRV-1048") return '<button class="btn" onclick="render(\'orders\')">View all orders</button>';
 if(o.validation.missingFlight) return '<button class="btn primary" onclick="restoreValidation()">Restore required info</button>';
 if(o.dispatch==="NOT_SENT") return '<button class="btn primary" onclick="dispatchA()">Dispatch Partner A</button><button class="btn danger" onclick="breakValidation()">Simulate missing flight</button>';
 if(o.dispatch==="PENDING") return '<button class="btn danger" onclick="rejectA()">Simulate rejection</button>';
 if(o.dispatch==="REJECTED") return '<button class="btn primary" onclick="fallbackB()">Fallback to Partner B</button>';
 if(o.dispatch==="ACCEPTED"&&!o.ready) return '<button class="btn primary" onclick="customerReady()">Record Customer Ready</button>';
 if(o.ready&&!ex&&!o.exceptionResolved) return '<button class="btn danger" onclick="createRecipientException()">Create recipient exception</button>';
 if(ex&&!ex.ai) return '<button class="btn primary" onclick="generateAI()">Generate AI support</button>';
 if(ex&&ex.ai&&!ex.approved) return '<button class="btn success" onclick="approveAction()">Approve recommended action</button>';
 if(o.exceptionResolved) return '<button class="btn" onclick="render(\'metrics\')">View resulting metrics</button>';
 return ''
}
function breakValidation(){
 const o=state.orders.find(x=>x.id==="TRV-1048");
 o.validation.missingFlight=true;o.validation.passed=false;o.status="VALIDATION_REQUIRED";o.dispatch="BLOCKED";o.owner="CS Review";o.manualTouches+=1;
 o.demoMessage="Validation changed: airport itinerary data is now missing, so dispatch has been blocked.";
 o.events.unshift(["Now","Validation failed","Rule V-09 · missing itinerary detail"]);
 state.signals.unshift({time:"Now",title:o.id+" validation blocked",text:"Required airport information is missing.",type:"risk"});
 save();openOrder(o.id)
}
function restoreValidation(){
 const o=state.orders.find(x=>x.id==="TRV-1048");
 o.validation.missingFlight=false;o.validation.passed=true;o.status="READY";o.dispatch="NOT_SENT";o.owner="Ops Queue";
 o.demoMessage="Required information restored. Deterministic validation passes and the order is ready for dispatch.";
 o.events.unshift(["Now","Validation passed","Required information restored"]);
 save();openOrder(o.id)
}
function dispatchA(){
 const o=state.orders.find(x=>x.id==="TRV-1048");
 o.supplier="Partner A";o.dispatch="PENDING";o.status="AWAITING_SUPPLIER";
 o.demoMessage="Structured job dispatched to Partner A. The acknowledgement timer is now active.";
 o.events.unshift(["Now","Dispatch sent","Partner A · structured job link"]);
 save();openOrder(o.id)
}
function rejectA(){
 const o=state.orders.find(x=>x.id==="TRV-1048");
 o.dispatch="REJECTED";o.status="AWAITING_SUPPLIER";o.slaRisk=true;o.manualTouches+=1;
 o.demoMessage="Partner A rejected the job. The order is now surfaced for fallback routing.";
 o.events.unshift(["Now","Supplier rejected","Partner A"]);
 state.signals.unshift({time:"Now",title:o.id+" supplier rejected",text:"Preferred partner rejected; fallback available.",type:"warn"});
 save();openOrder(o.id)
}
function fallbackB(){
 const o=state.orders.find(x=>x.id==="TRV-1048");
 o.supplier="Partner B";o.dispatch="ACCEPTED";o.status="CONFIRMED";o.slaRisk=false;o.owner="Auto";
 o.demoMessage="Fallback routing succeeded. Partner B accepted and the canonical order was updated.";
 o.events.unshift(["Now","Fallback supplier accepted","Partner B"]);
 save();openOrder(o.id)
}
function customerReady(){
 const o=state.orders.find(x=>x.id==="TRV-1048");
 o.ready=true;o.status="IN_SERVICE";
 o.demoMessage="Customer Ready recorded as a structured event. Supplier execution and customer status can now update from the event model.";
 o.events.unshift(["Now","Customer Ready","Customer event"]);
 save();openOrder(o.id)
}
function createRecipientException(){
 const o=state.orders.find(x=>x.id==="TRV-1048");
 const e={id:"EX-1048-1",orderId:o.id,type:"Recipient verification",severity:"High",owner:"Operations",status:"OPEN",sla:"18 min",ai:false,approved:false};
 state.exceptions.push(e);o.status="EXCEPTION";o.owner="Operations";o.manualTouches+=1;
 o.demoMessage="Recipient-verification exception created and linked to the canonical order.";
 o.events.unshift(["Now","Exception opened","Hotel handover recipient mismatch"]);
 state.signals.unshift({time:"Now",title:o.id+" recipient exception",text:"Handover requires identity verification before release.",type:"risk"});
 save();openOrder(o.id)
}
function exceptionHtml(e,o){
 return '<div class="exception"><div class="exception-top"><div><h3>'+e.id+' · '+e.type+'</h3><div class="small">Owner: '+e.owner+' · SLA clock: '+e.sla+'</div></div><span class="severity">'+e.severity+'</span></div><p>Hotel reception reports that the recipient details do not match the booking record. Handover should not continue until the identity / booking context is resolved.</p>'+
 (e.ai?'<div class="ai-box"><div class="label">SIMULATED AI DECISION SUPPORT</div><b>Case summary</b><p>Recipient context conflicts with the canonical booking. The latest evidence does not establish a safe handover.</p><b>Proposed next action</b><p>Hold release, verify booking and recipient identity, then escalate to Operations if the mismatch cannot be resolved.</p><div class="source-ref"><b>Retrieved rule</b><br>R-CHAIN-04 · Recipient verification: proof of handover must establish the correct receiving party. Policy exception remains human-controlled.</div></div>':'')+
 (e.approved?'<div class="banner" style="margin-top:9px">Human approval recorded. Release remains on hold pending verification; the AI recommendation did not execute autonomously.</div>':'')+
 '</div>'
}
function generateAI(){
 const e=state.exceptions.find(x=>x.orderId==="TRV-1048"&&x.status!=="RESOLVED");
 e.ai=true;
 state.audit.unshift(["Now","AI","exception.support.proposed","Summary + retrieved rule generated for "+e.id]);
 save();openOrder("TRV-1048")
}
function approveAction(){
 const e=state.exceptions.find(x=>x.orderId==="TRV-1048"&&x.status!=="RESOLVED");
 const o=state.orders.find(x=>x.id==="TRV-1048");
 e.approved=true;e.status="RESOLVED";o.exceptionResolved=true;o.status="IN_SERVICE";o.owner="Operations";
 o.demoMessage="Human decision recorded. The case is resolved with the handover held until verification; AI remained advisory.";
 o.events.unshift(["Now","Human action approved","Hold release pending recipient verification"]);
 state.audit.unshift(["Now","Human","exception.action.approved","Operations approved controlled hold / verification"]);
 save();openOrder(o.id)
}
function resetDemo(){localStorage.removeItem(KEY);location.reload()}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>render(b.dataset.view));
$("#reset").onclick=resetDemo;
render("tower");