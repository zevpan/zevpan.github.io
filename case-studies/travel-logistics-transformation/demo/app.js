const STORE_KEY="order-management-system-demo-v4";
const ROUTES=["Hotel → Airport","Airport → Hotel","Hotel → Hotel"];
const MARKETS=[
 {name:"Tokyo",zone:"Asia/Tokyo",offset:540},
 {name:"Osaka",zone:"Asia/Tokyo",offset:540},
 {name:"Seoul",zone:"Asia/Seoul",offset:540},
 {name:"Singapore",zone:"Asia/Singapore",offset:480},
 {name:"Kyoto",zone:"Asia/Tokyo",offset:540}
];
const SOURCES=[
 {name:"Direct website",type:"Direct",prefix:"WEB"},
 {name:"AeroVista Airways",type:"Airline",prefix:"AIR"},
 {name:"Harborlight Hotel Group",type:"Hotel",prefix:"HTL"},
 {name:"Wanderlane Online",type:"Online travel agency",prefix:"OTA"},
 {name:"Summit Travel Partners",type:"Travel agent",prefix:"AGT"}
];
const SUPPLIERS=[
 "Northstar Luggage Logistics Ltd",
 "HarborLink Ground Services Pte Ltd",
 "Skyport Porter Network Co.",
 "Metro Relay Mobility Ltd",
 "Eastgate Luggage Services K.K."
];
const OPERATORS=["Maya Chen","Daniel Tan","Sofia Lim","Jay Patel","Ravi Menon","Aiko Sato"];
const DRIVERS=["Kenji Watanabe","Min-jun Park","Ari Tan","Hana Kim","Jun Sato","Minh Tran","Soo-jin Lee","Marcus Lim"];
const FIRST=["Avery","Mina","Lucas","Noah","Hana","Maya","Ethan","Sofia","Kai","Leah","Jin","Ivy","Daniel","Nora","Ryan","Yuna","Alex","Mika"];
const LAST=["Morgan","Chen","Tan","Patel","Lim","Wong","Park","Sato","Ng","Lee","Brown","Singh","Kim","Koh","Ito","Chua"];
const $=(selector,root=document)=>root.querySelector(selector);
const view=$("#view"), pageTitle=$("#title"), pageSubtitle=$("#subtitle");
const DAY_KEY=dateInZone("Asia/Singapore",new Date());
function dateInZone(zone,instant){
 const parts=new Intl.DateTimeFormat("en-CA",{timeZone:zone,year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(instant);
 const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));
 return p.year+"-"+p.month+"-"+p.day;
}
function addDays(iso,days){
 const d=new Date(iso+"T12:00:00Z");d.setUTCDate(d.getUTCDate()+days);
 return d.toISOString().slice(0,10);
}
function timeFromMinutes(total){
 const h=Math.floor(total/60)%24,m=total%60;
 return String(h).padStart(2,"0")+":"+String(m).padStart(2,"0");
}
function localDateTimeMs(date,time,offset){
 const parts=date.split("-").map(Number),clock=time.split(":").map(Number);
 return Date.UTC(parts[0],parts[1]-1,parts[2],clock[0],clock[1])-offset*60000;
}
function dateLabel(iso,zone){
 const stamp=new Date(iso+"T12:00:00Z");
 return new Intl.DateTimeFormat("en-SG",{timeZone:zone,weekday:"short",day:"2-digit",month:"short",year:"numeric"}).format(stamp);
}
function relativeDay(order){
 const today=dateInZone(order.timeZone,new Date());
 return order.serviceDate===today?"Today":order.serviceDate===addDays(today,1)?"Tomorrow":dateLabel(order.serviceDate,order.timeZone);
}
function currentClock(zone){
 return new Intl.DateTimeFormat("en-SG",{timeZone:zone,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
}
function statusFor(route,minutesToService){
 if(route==="Airport → Hotel"){
  if(minutesToService>30)return "SCHEDULED";
  if(minutesToService>-20)return "ARRIVED_AT_AIRPORT";
  if(minutesToService>-65)return "LUGGAGE_COLLECTED";
  if(minutesToService>-180)return "LUGGAGE_DELIVERED";
  return "COMPLETED";
 }
 if(minutesToService>180)return "AWAITING_CUSTOMER_DROP";
 if(minutesToService>90)return "CUSTOMER_DROPPED";
 if(minutesToService>30)return "DRIVER_COLLECTED";
 if(minutesToService>-120)return route==="Hotel → Airport"?"ARRIVED_AT_AIRPORT":"ARRIVED_AT_DESTINATION";
 return "COMPLETED";
}
function makeOrder(dayOffset,index){
 const market=MARKETS[(index*2+dayOffset)%MARKETS.length];
 const route=index===0&&dayOffset===0?"Hotel → Airport":ROUTES[(index+dayOffset)%ROUTES.length];
 const serviceDate=addDays(dateInZone(market.zone,new Date()),dayOffset);
 const serviceTime=index===0&&dayOffset===0?"23:30":index<30?timeFromMinutes(360+index*17):timeFromMinutes(900+(index-30)*15);
 const minutesToService=(localDateTimeMs(serviceDate,serviceTime,market.offset)-Date.now())/60000;
 const status=statusFor(route,minutesToService);
 const source=SOURCES[index===0&&dayOffset===0?0:(index*3+dayOffset)%SOURCES.length];
 const dayToken=serviceDate.replaceAll("-","");
 const orderId="OMS-"+dayToken+"-"+String(index+1).padStart(3,"0");
 const supplier=SUPPLIERS[(index*3+dayOffset)%SUPPLIERS.length];
 const first=FIRST[(index*7+dayOffset*5)%FIRST.length];
 const last=LAST[(index*11+dayOffset*3)%LAST.length];
 const customer=first+" "+last;
 const assigned=OPERATORS[(index*5+dayOffset)%OPERATORS.length];
 const timeSuffix=market.offset===540?"JST":"SGT";
 let dispatchState=status==="COMPLETED"?"Completed":index%15===0?"Needs assignment":index%9===0?"Awaiting supplier":"Accepted";
 const tagRequired=route!=="Airport → Hotel";
 const tagUploaded=tagRequired&&status!=="AWAITING_CUSTOMER_DROP";
 const base={
  id:orderId,sourceName:source.name,sourceType:source.type,sourceId:source.prefix+"-"+dayToken+"-"+String(index+1).padStart(3,"0"),
  market:market.name,timeZone:market.zone,utcOffset:market.offset,timeSuffix,
  route:route,serviceDate:serviceDate,serviceWindow:dayOffset===0?"today":"tomorrow",serviceTime:serviceTime,
  customer:customer,customerChannel:["Customer chat","Messaging app","Booking portal"][index%3],
  pickup:route==="Airport → Hotel"?market.name+" Airport":(market.name+" hotel concierge"),
  delivery:route==="Hotel → Airport"?market.name+" Airport":(route==="Hotel → Hotel"?market.name+" hotel":"Customer hotel"),
  supplier:supplier,driver:DRIVERS[(index*3+dayOffset)%DRIVERS.length],owner:assigned,
  status:status,dispatchState:dispatchState,tagRequired:tagRequired,tagUploaded:tagUploaded,
  tagFileName:tagUploaded?"Tag image recorded for "+orderId:null,
  slaRisk:dispatchState==="Awaiting supplier"||dispatchState==="Needs assignment",
  events:[],exceptionIds:[]
 };
 base.events=[
  {time:"08:15",label:"Booking received",detail:base.sourceName+" · "+base.sourceId},
  {time:"08:16",label:"Order record created",detail:"Original booking reference retained"},
  {time:"08:18",label:"Supplier route checked",detail:base.supplier+" · "+base.dispatchState}
 ];
 if(status!=="SCHEDULED"&&status!=="AWAITING_CUSTOMER_DROP")base.events.unshift({time:serviceTime,label:statusLabel(status,base),detail:"Example service update"});
 return base;
}
function makeInitialState(){
 const orders=[];
 for(let day=0;day<2;day++)for(let i=0;i<60;i++)orders.push(makeOrder(day,i));
 const exceptions=[];
 const slots=[32,36,40,44,48,52,56];
 const types=["Supplier response overdue","Luggage-tag image missing","Customer details need confirmation","Driver milestone overdue","Flight details need review","Customer reply needed","Delivery evidence missing"];
 for(let day=0;day<2;day++){
  slots.forEach((index,j)=>{
   const o=orders[day*60+index];
   let type=types[j];
   if(type==="Luggage-tag image missing"&&!o.tagRequired)type="Flight details need review";
   if(type==="Delivery evidence missing"&&o.status!=="LUGGAGE_DELIVERED"&&o.status!=="COMPLETED")type="Supplier response overdue";
   const exception={
    id:"EX-"+o.id.slice(-3)+"-"+(day+1),orderId:o.id,type:type,
    priority:j%3===0?"High":"Medium",owner:OPERATORS[(index+j)%OPERATORS.length],
    dueMinutes:j%2===0?18+j:-(8+j),status:"OPEN"
   };
   if(type==="Luggage-tag image missing"){o.tagUploaded=false;o.tagFileName=null;o.status="AWAITING_CUSTOMER_DROP";}
   if(type==="Supplier response overdue"){o.dispatchState="Awaiting supplier";o.slaRisk=true;}
   if(type==="Flight details need review")o.status="SCHEDULED";
   o.owner=exception.owner;o.exceptionIds.push(exception.id);
   o.events.unshift({time:"09:12",label:"Exception opened",detail:type});
   exceptions.push(exception);
  });
 }
 const messages=[];
 const samples=[
  ["Customer","I have left two bags with the hotel concierge. The tag photo is attached."],
  ["Driver","I am at the pickup point. Please confirm when the bags are ready."],
  ["Team user","I checked the booking details and added the pickup note for the driver."],
  ["Customer","Can you confirm the driver has collected both bags?"],
  ["Driver","Collected two bags. Tag numbers match the order notes."],
  ["Team user","Please keep the customer updated if the arrival time changes."],
  ["Customer","My flight time changed. I have updated the itinerary in the booking."],
  ["Driver","Traffic is slow near the airport. Current arrival estimate is 18 minutes."]
 ];
 const threadOrders=orders.filter((o,i)=>i<24);
 threadOrders.forEach((o,i)=>{
  const group=[samples[i%samples.length],samples[(i+1)%samples.length],samples[(i+2)%samples.length]];
  group.forEach((sample,j)=>{
   messages.push({
    id:"MSG-"+o.id+"-"+(j+1),orderId:o.id,role:sample[0],
    actor:sample[0]==="Customer"?"Customer · "+o.customer:sample[0]==="Driver"?"Driver · "+o.driver:OPERATORS[(i+j)%OPERATORS.length]+" · Operations",
    audience:sample[0]==="Team user"?"Team":sample[0],channel:sample[0]==="Customer"?o.customerChannel:sample[0]==="Driver"?"Driver chat":"Operations team",
    direction:sample[0]==="Team user"?"internal":"inbound",text:group[j][1],
    createdAt:Date.now()-((24-i)*3600000)+(j*600000),unread:sample[0]!=="Team user"&&j===0
   });
  });
 });
 return {datasetDay:DAY_KEY,orders:orders,exceptions:exceptions,messages:messages,selectedOrderId:orders[0].id,messageCounter:0,orderPage:0,orderWindow:"all",orderQuery:"",orderRoute:"all",orderStatus:"all",dispatchWindow:"all",dispatchFilter:"all",messageFilter:"all"};
}
function loadState(){
 try{
  const saved=JSON.parse(localStorage.getItem(STORE_KEY)||"null");
  if(saved&&saved.datasetDay===DAY_KEY&&Array.isArray(saved.orders)&&saved.orders.length>=120)return saved;
 }catch(error){}
 return makeInitialState();
}
let state=loadState();
function save(){localStorage.setItem(STORE_KEY,JSON.stringify(state))}
function setHead(title,subtitle){pageTitle.textContent=title;pageSubtitle.textContent=subtitle}
function safe(value){
 return String(value==null?"":value).replace(/[&<>"']/g,function(ch){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]});
}
function orderById(id){return state.orders.find(function(o){return o.id===id})}
function exceptionForOrder(id){return state.exceptions.filter(function(e){return e.orderId===id&&e.status==="OPEN"})}
function openExceptions(){return state.exceptions.filter(function(e){return e.status==="OPEN"})}
function statusLabel(status,order){
 const labels={
  SCHEDULED:"Scheduled, awaiting airport arrival",
  AWAITING_CUSTOMER_DROP:"Awaiting customer luggage drop and tag upload",
  CUSTOMER_DROPPED:"Customer dropped luggage",
  DRIVER_COLLECTED:"Driver collected luggage",
  ARRIVED_AT_AIRPORT:"Driver and customer arrived at airport",
  ARRIVED_AT_DESTINATION:"Driver and customer arrived at destination hotel",
  LUGGAGE_COLLECTED:"Luggage collected",
  LUGGAGE_DELIVERED:"Luggage delivered",
  COMPLETED:"Completed"
 };
 return labels[status]||status.replaceAll("_"," ").toLowerCase();
}
function statusClass(status){
 return "status status-"+String(status||"").toLowerCase().replaceAll("_","-");
}
function pill(status,order){return '<span class="'+statusClass(status)+'">'+safe(statusLabel(status,order))+'</span>'}
function dispatchPill(value){
 const cls=value==="Accepted"||value==="Completed"?"ok":value==="Awaiting supplier"?"warn":value==="Needs assignment"?"risk":"neutral";
 return '<span class="dispatch-state dispatch-'+cls+'">'+safe(value)+'</span>';
}
function routeSteps(order){
 if(order.route==="Airport → Hotel")return [
  ["SCHEDULED","Scheduled"],
  ["ARRIVED_AT_AIRPORT","Driver and customer arrived at airport"],
  ["LUGGAGE_COLLECTED","Luggage collected"],
  ["LUGGAGE_DELIVERED","Luggage delivered"],
  ["COMPLETED","Completed"]
 ];
 return [
  ["AWAITING_CUSTOMER_DROP","Awaiting customer luggage drop and tag upload"],
  ["CUSTOMER_DROPPED","Customer dropped luggage"],
  ["DRIVER_COLLECTED","Driver collected luggage"],
  [order.route==="Hotel → Airport"?"ARRIVED_AT_AIRPORT":"ARRIVED_AT_DESTINATION",order.route==="Hotel → Airport"?"Driver and customer arrived at airport":"Driver and customer arrived at destination hotel"],
  ["COMPLETED","Completed"]
 ];
}
function stepIndex(order){
 const steps=routeSteps(order);
 const index=steps.findIndex(function(step){return step[0]===order.status});
 return index<0?0:index;
}
function nextStep(order){
 const steps=routeSteps(order),index=stepIndex(order);
 return index<steps.length-1?steps[index+1]:null;
}
function nextActionLabel(order){
 if(order.status==="AWAITING_CUSTOMER_DROP")return "Record customer drop and luggage-tag upload";
 const next=nextStep(order);
 return next?"Record: "+next[1]:"Order complete";
}
function appendEvent(order,label,detail){
 const now=new Date();
 order.events.unshift({time:new Intl.DateTimeFormat("en-SG",{timeZone:"Asia/Singapore",hour:"2-digit",minute:"2-digit",hour12:false}).format(now),label:label,detail:detail});
 order.lastUpdated=now.toISOString();
}
function localClock(ms,zone){
 return new Intl.DateTimeFormat("en-SG",{timeZone:zone,hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(ms));
}
function orderDateTime(order){
 return dateLabel(order.serviceDate,order.timeZone)+" · "+order.serviceTime+" "+order.timeSuffix;
}
function openOrder(id){
 const o=orderById(id);if(!o)return;
 setHead("Order details","Review the service route, current milestone, messages, and next action.");
 const exceptions=exceptionForOrder(id),steps=routeSteps(o),current=stepIndex(o),next=nextStep(o);
 const thread=state.messages.filter(function(m){return m.orderId===id}).sort(function(a,b){return a.createdAt-b.createdAt});
 const stepHtml=steps.map(function(s,i){
  const done=i<current,active=i===current;
  return '<div class="flow-step '+(done?"done":"")+(active?" active":"")+'"><span class="flow-dot">'+(done?"✓":String(i+1))+'</span><span>'+safe(s[1])+'</span></div>';
 }).join("");
 const nextButton=o.status==="AWAITING_CUSTOMER_DROP"
  ?'<div class="upload-box"><label for="tag-file">Luggage-tag image</label><input id="tag-file" type="file" accept="image/*"><small id="upload-error">Choose the image the customer supplied. The demo records the file name in this browser only.</small><button class="btn primary" onclick="recordCustomerDrop(\''+safe(o.id)+'\')">Record customer drop and tag</button></div>'
  :next?'<button class="btn primary" onclick="advanceOrder(\''+safe(o.id)+'\')">'+safe(nextActionLabel(o))+'</button>':'<span class="complete-note">All route milestones are recorded.</span>';
 const exceptionHtml=exceptions.length?'<div class="exception-list">'+exceptions.map(function(e){
  return '<div class="exception-card"><div><span class="priority priority-'+e.priority.toLowerCase()+'">'+safe(e.priority)+'</span><b>'+safe(e.type)+'</b><small>Owner: '+safe(e.owner)+' · '+safe(e.dueMinutes<0?"Overdue "+Math.abs(e.dueMinutes)+" min":"Due in "+e.dueMinutes+" min")+'</small></div><button class="btn" onclick="resolveException(\''+safe(e.id)+'\')">Resolve in demo</button></div>';
 }).join("")+'</div>':'<div class="empty-note">No open exception is linked to this order.</div>';
 const recent=thread.slice(-3).reverse();
 view.innerHTML=
  '<div class="toolbar"><button class="back" onclick="render(\'tower\')">← Back to overview</button><span class="demo-status">'+safe(relativeDay(o))+' · '+safe(o.market)+'</span></div>'+
  (o.demoMessage?'<div class="banner">'+safe(o.demoMessage)+'</div>':'')+
  '<div class="order-head"><div><div class="order-id">'+safe(o.id)+'</div><h2>'+safe(o.route)+'</h2><div class="meta">'+safe(orderDateTime(o))+' · '+safe(o.customer)+'</div><div class="status-row">'+pill(o.status,o)+(exceptions.length?'<span class="priority priority-high">'+exceptions.length+' open exception'+(exceptions.length===1?"":"s")+'</span>':'')+'</div></div><div class="actions">'+(o.dispatchState==="Needs assignment"?'<button class="btn primary" onclick="sendToSupplier(\''+safe(o.id)+'\')">Assign and dispatch</button>':o.dispatchState==="Awaiting supplier"?'<button class="btn primary" onclick="acceptSupplier(\''+safe(o.id)+'\')">Record supplier acceptance</button>':'')+nextButton+'</div></div>'+
  '<div class="flow-panel"><div class="panel-heading"><div><h3>Service milestones</h3><p>'+safe(o.route)+" · "+safe(o.pickup)+" → "+safe(o.delivery)+'</p></div><span>Order updates in demo</span></div><div class="flow-steps">'+stepHtml+'</div></div>'+
  '<div class="detail-grid"><div class="detail-column">'+
   '<section class="panel"><div class="panel-heading"><div><h3>Order record</h3><p>Source booking and service details</p></div><button class="btn" onclick="openCommunications(\''+safe(o.id)+'\')">Open messages</button></div><div class="field-grid">'+
   field("Order ID",o.id)+field("Booking source",o.sourceName+" · "+o.sourceType)+field("Original booking ref",o.sourceId)+field("Customer",o.customer)+field("Route",o.route)+field("Service date",dateLabel(o.serviceDate,o.timeZone))+field("Service time",o.serviceTime+" "+o.timeSuffix)+field("Market",o.market)+field("Pickup",o.pickup)+field("Delivery",o.delivery)+field("Supplier company",o.supplier)+field("Supplier dispatch",o.dispatchState)+field("Operations owner",o.owner)+field("Luggage tag",o.tagRequired?(o.tagUploaded?"Image recorded: "+(o.tagFileName||"tag image"):"Awaiting customer image"):"Recorded with airport collection")+
   '</div></section>'+
   '<section class="panel"><div class="panel-heading"><div><h3>Order checks</h3><p>Fields and evidence needed for the next service step</p></div></div><div class="panel-body">'+orderChecksHtml(o,exceptions)+'</div></section>'+
   '<section class="panel"><div class="panel-heading"><div><h3>Open exceptions</h3><p>Issues that still need an owner or decision</p></div><span>'+exceptions.length+' open</span></div><div class="panel-body">'+exceptionHtml+'</div></section>'+
   '</div><div class="detail-column">'+
   '<section class="panel"><div class="panel-heading"><div><h3>Recent messages</h3><p>Customer, driver, and team updates</p></div><span>'+thread.length+' in thread</span></div><div class="panel-body">'+(recent.length?recent.map(messageBubble).join(""):'<div class="empty-note">No conversation has been logged for this order.</div>')+'<button class="text-button" onclick="openCommunications(\''+safe(o.id)+'\')">Open full conversation</button></div></section>'+
   '<section class="panel"><div class="panel-heading"><div><h3>Event history</h3><p>Order and service updates</p></div><span>'+o.events.length+' events</span></div><div class="panel-body"><div class="timeline">'+o.events.slice(0,12).map(function(e){return '<div class="timeline-event"><time>'+safe(e.time)+'</time><div><b>'+safe(e.label)+'</b><span>'+safe(e.detail)+'</span></div></div>'}).join("")+'</div></div></section>'+
   '</div></div>';
}
function field(key,value){return '<div class="field"><small>'+safe(key)+'</small><b>'+safe(value)+'</b></div>'}
function orderChecksHtml(order,exceptions){
 const checks=[
  ["Booking source and original reference",Boolean(order.sourceName&&order.sourceId),"Keep the source company and original booking ID visible."],
  ["Service route and date",Boolean(order.route&&order.serviceDate&&order.serviceTime),"Route and scheduled service time are recorded."],
  ["Supplier company",order.dispatchState!=="Needs assignment","Assign an eligible supplier before dispatch."],
  ["Luggage-tag image",!order.tagRequired||order.tagUploaded,"Hotel-origin services need a tag image before driver collection."],
  ["Open exceptions",exceptions.length===0,"Resolve issues or record the decision before closing work."]
 ];
 return '<div class="check-list">'+checks.map(function(item){return '<div class="check-row"><span class="check-mark '+(item[1]?"passed":"blocked")+'">'+(item[1]?"✓":"!")+'</span><div><b>'+safe(item[0])+'</b><small>'+safe(item[2])+'</small></div><span class="check-result">'+(item[1]?"Recorded":"Needs action")+'</span></div>'}).join("")+'</div>';
}
function messageBubble(m){
 const role=m.role==="Customer"?"customer":m.role==="Driver"?"driver":m.role==="Operations user"||m.role==="Team user"?"team":"other";
 const stamp=new Intl.DateTimeFormat("en-SG",{timeZone:"Asia/Singapore",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date(m.createdAt));
 return '<article class="message-bubble '+role+'"><div class="message-meta"><b>'+safe(m.actor)+'</b><span>'+safe(m.channel)+' · '+stamp+'</span></div><p>'+safe(m.text)+'</p>'+(m.attachment?'<span class="attachment">📎 '+safe(m.attachment)+'</span>':'')+'</article>';
}
function recordCustomerDrop(id){
 const o=orderById(id),input=$("#tag-file"),error=$("#upload-error");
 if(!o||!input||!input.files||!input.files[0]){if(error)error.textContent="Select the luggage-tag image before recording the customer drop.";return}
 o.tagUploaded=true;o.tagFileName=input.files[0].name;o.status="CUSTOMER_DROPPED";o.demoMessage="Customer drop and tag image recorded in this browser-only scenario.";
 appendEvent(o,"Customer dropped luggage","Tag image recorded: "+o.tagFileName);
 save();openOrder(id);
}
function advanceOrder(id){
 const o=orderById(id);if(!o)return;
 const next=nextStep(o);if(!next)return;
 o.status=next[0];
 if(o.status==="ARRIVED_AT_AIRPORT")o.demoMessage="Airport arrival recorded. The order remains tied to its service date, source booking, and message history.";
 else if(o.status==="ARRIVED_AT_DESTINATION")o.demoMessage="Arrival at the destination hotel recorded.";
 else o.demoMessage=next[1]+" recorded in the local demo.";
 appendEvent(o,next[1],"Operations user recorded service milestone");
 save();openOrder(id);
}
function sendToSupplier(id){
 const o=orderById(id);if(!o)return;
 o.dispatchState="Awaiting supplier";o.slaRisk=true;
 appendEvent(o,"Supplier dispatch sent",o.supplier+" · awaiting acknowledgement");
 o.demoMessage="Dispatch state updated in the local demo. No supplier message was sent.";
 save();openOrder(id);
}
function acceptSupplier(id){
 const o=orderById(id);if(!o)return;
 o.dispatchState="Accepted";o.slaRisk=false;
 appendEvent(o,"Supplier accepted",o.supplier+" · acknowledgement recorded");
 o.demoMessage="Supplier acceptance recorded in the local demo.";
 save();openOrder(id);
}
function reassignSupplier(id){
 const o=orderById(id);if(!o)return;
 const index=SUPPLIERS.indexOf(o.supplier);
 o.supplier=SUPPLIERS[(index+1+SUPPLIERS.length)%SUPPLIERS.length];
 o.dispatchState="Awaiting supplier";o.slaRisk=true;
 appendEvent(o,"Supplier reassigned",o.supplier+" · acknowledgement required");
 save();openOrder(id);
}
function resolveException(id){
 const ex=state.exceptions.find(function(item){return item.id===id&&item.status==="OPEN"});if(!ex)return;
 ex.status="RESOLVED";ex.resolvedAt=new Date().toISOString();
 const o=orderById(ex.orderId);if(o)appendEvent(o,"Exception resolved in demo",ex.type+" · "+ex.owner);
 save();
 if(document.querySelector(".nav.active")?.dataset.view==="dispatch")render("dispatch");else if(document.querySelector(".nav.active")?.dataset.view==="exceptions")render("exceptions");else openOrder(ex.orderId);
}
function openCommunications(id){
 state.selectedOrderId=id||state.selectedOrderId;state.messageFilter="all";save();render("communications");
}
function selectThread(id){
 state.selectedOrderId=id;
 state.messages.forEach(function(m){if(m.orderId===id)m.unread=false});
 save();render("communications");
}
function sendMessage(){
 const input=$("#message-text"),target=$("#message-audience"),order=orderById(state.selectedOrderId);
 if(!input||!target||!order)return;
 const text=input.value.trim();if(!text)return;
 const audience=target.value;
 state.messageCounter=(state.messageCounter||0)+1;
 state.messages.push({
  id:"MSG-OUT-"+state.messageCounter,orderId:order.id,role:"Operations user",audience:audience,
  actor:"You · Operations",channel:audience==="Team"?"Operations team":audience+" chat",direction:audience==="Team"?"internal":"outbound",
  text:text,createdAt:Date.now(),unread:false
 });
 appendEvent(order,"Message logged",audience+" · browser-only demo");
 save();render("communications");
}
function threadOrders(filter,query){
 const grouped=new Map();
 state.messages.forEach(function(m){
  if(filter!=="all"&&m.audience.toLowerCase()!==filter)return;
  const o=orderById(m.orderId);if(!o)return;
  const hay=(o.id+" "+o.customer+" "+o.market+" "+o.route+" "+m.text).toLowerCase();
  if(query&&!hay.includes(query.toLowerCase()))return;
  const current=grouped.get(o.id)||{order:o,messages:[]};
  current.messages.push(m);grouped.set(o.id,current);
 });
 return Array.from(grouped.values()).map(function(item){
  item.messages.sort(function(a,b){return a.createdAt-b.createdAt});
  item.last=item.messages[item.messages.length-1];
  return item;
 }).sort(function(a,b){return b.last.createdAt-a.last.createdAt});
}
function communications(){
 setHead("Communications","Customer, driver, and team conversations linked to each order.");
 const filter=state.messageFilter||"all",query=state.messageQuery||"";
 const threads=threadOrders(filter,query);
 const selectedId=threads.some(function(t){return t.order.id===state.selectedOrderId})?state.selectedOrderId:(threads[0]?.order.id||state.selectedOrderId);
 const selected=orderById(selectedId)||state.orders[0];
 const messages=state.messages.filter(function(m){return m.orderId===selected.id}).sort(function(a,b){return a.createdAt-b.createdAt});
 const count=(role)=>state.messages.filter(function(m){return m.audience.toLowerCase()===role}).length;
 const listHtml=threads.map(function(t){
  const unread=t.messages.some(function(m){return m.unread});
  return '<button class="thread-row '+(t.order.id===selected.id?"selected":"")+'" data-thread="'+safe(t.order.id)+'"><span class="thread-top"><b>'+safe(t.order.customer)+'</b><small>'+safe(t.order.id)+'</small></span><span class="thread-route">'+safe(t.order.route)+' · '+safe(t.order.market)+'</span><span class="thread-preview">'+safe(t.last.text)+'</span><span class="thread-bottom"><small>'+safe(t.last.channel)+'</small>'+(unread?'<em>New</em>':'')+'</span></button>';
 }).join("");
 const filterButton=(key,label,num)=>'<button class="filter-chip '+(filter===key?"active":"")+'" data-message-filter="'+key+'">'+label+'<span>'+num+'</span></button>';
 view.innerHTML=
  '<div class="comms-note"><b>Example conversations.</b> Messages and replies stay in this browser. No customer, driver, WhatsApp, LINE, or team account is connected.</div>'+
  '<div class="comms-layout"><aside class="panel inbox-panel"><div class="panel-heading"><div><h3>Order conversations</h3><p>'+threads.length+' visible threads</p></div><span>'+state.messages.length+' messages</span></div><div class="filter-row">'+filterButton("all","All",state.messages.length)+filterButton("customer","Customers",count("customer"))+filterButton("driver","Drivers",count("driver"))+filterButton("team","Team",count("team"))+'</div><div class="search-row"><input id="thread-search" type="search" placeholder="Search orders or messages" value="'+safe(query)+'"></div><div class="thread-list">'+(listHtml||'<div class="empty-note">No conversations match this filter.</div>')+'</div></aside>'+
  '<section class="panel conversation-panel"><div class="conversation-head"><div><small>'+safe(selected.id)+' · '+safe(selected.market)+'</small><h3>'+safe(selected.customer)+'</h3><p>'+safe(selected.route)+' · '+safe(dateLabel(selected.serviceDate,selected.timeZone))+' · '+safe(selected.serviceTime+" "+selected.timeSuffix)+'</p></div><button class="btn" onclick="openOrder(\''+safe(selected.id)+'\')">Open order</button></div><div class="conversation-context"><span>Customer: '+safe(selected.customerChannel)+'</span><span>Driver: driver chat</span><span>Team: operations workspace</span></div><div class="message-list">'+(messages.length?messages.map(messageBubble).join(""):'<div class="empty-note">No messages in this order thread yet.</div>')+'</div><div class="composer"><label for="message-audience">Send to</label><select id="message-audience"><option>Customer</option><option>Driver</option><option>Team</option></select><textarea id="message-text" rows="3" placeholder="Write a note or response for this demo thread"></textarea><div class="composer-foot"><small>Saving adds a local demo message only. Nothing is sent.</small><button id="send-message" class="btn primary">Save message</button></div></div></section></div>';
 view.querySelectorAll("[data-message-filter]").forEach(function(button){
  button.addEventListener("click",function(){state.messageFilter=button.dataset.messageFilter;state.messageQuery=$("#thread-search")?.value||"";render("communications")});
 });
 view.querySelectorAll("[data-thread]").forEach(function(button){button.addEventListener("click",function(){selectThread(button.dataset.thread)})});
 const search=$("#thread-search");
 if(search)search.addEventListener("input",function(){state.messageQuery=search.value;render("communications");const next=$("#thread-search");if(next){next.focus();next.setSelectionRange(next.value.length,next.value.length)}});
 const send=$("#send-message");if(send)send.addEventListener("click",sendMessage);
}
function orderWindowOrders(windowName){
 return state.orders.filter(function(o){return windowName==="all"||o.serviceWindow===windowName});
}
function matchesOrder(o,query){
 const value=(o.id+" "+o.customer+" "+o.market+" "+o.route+" "+o.sourceName+" "+o.supplier+" "+o.sourceId).toLowerCase();
 return !query||value.includes(query.toLowerCase());
}
function orders(){
 setHead("Orders","Browse a two-day schedule of example service orders, with route and owner context.");
 const options=[
  ["all","Next two service days"],["today","Today"],["tomorrow","Tomorrow"]
 ];
 const dateOptions=options.map(function(o){return '<option value="'+o[0]+'" '+(state.orderWindow===o[0]?"selected":"")+'>'+o[1]+'</option>'}).join("");
 view.innerHTML='<div class="list-toolbar"><div class="filters"><label>Service date<select id="order-window">'+dateOptions+'</select></label><label>Route<select id="order-route"><option value="all">All routes</option>'+ROUTES.map(function(r){return '<option value="'+safe(r)+'" '+(state.orderRoute===r?"selected":"")+'>'+safe(r)+'</option>'}).join("")+'</select></label><label>Status<select id="order-status"><option value="all">All milestones</option>'+Array.from(new Set(state.orders.map(function(o){return o.status}))).sort().map(function(s){return '<option value="'+s+'" '+(state.orderStatus===s?"selected":"")+'>'+safe(statusLabel(s))+'</option>'}).join("")+'</select></label></div><label class="search-label">Search<input id="order-search" type="search" placeholder="Order, customer, source, supplier" value="'+safe(state.orderQuery||"")+'"></label></div><div id="orders-results"></div>';
 function renderRows(){
  const filtered=orderWindowOrders(state.orderWindow).filter(function(o){
   return matchesOrder(o,state.orderQuery||"")&&(state.orderRoute==="all"||o.route===state.orderRoute)&&(state.orderStatus==="all"||o.status===state.orderStatus);
  }).sort(function(a,b){return a.serviceDate.localeCompare(b.serviceDate)||a.serviceTime.localeCompare(b.serviceTime)});
  const pages=Math.max(1,Math.ceil(filtered.length/20));
  state.orderPage=Math.min(state.orderPage||0,pages-1);
  const rows=filtered.slice(state.orderPage*20,(state.orderPage+1)*20);
  const today=state.orders.filter(function(o){return o.serviceWindow==="today"}).length;
  const tomorrow=state.orders.filter(function(o){return o.serviceWindow==="tomorrow"}).length;
  const dayCounts='<div class="day-volume"><span><b>'+today+'</b> orders scheduled today</span><span><b>'+tomorrow+'</b> orders scheduled tomorrow</span><span><b>'+state.orders.length+'</b> orders in this two-day view</span></div>';
  $("#orders-results").innerHTML=dayCounts+'<div class="panel"><div class="panel-heading"><div><h3>Service orders</h3><p>Booking sources stay visible beside the OMS order ID</p></div><span>'+filtered.length+' matching</span></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Service date</th><th>Order and customer</th><th>Route</th><th>Booking source</th><th>Supplier company</th><th>Milestone</th><th>Owner</th></tr></thead><tbody>'+rows.map(orderRow).join("")+'</tbody></table></div><div class="pagination"><span>Showing '+(filtered.length?state.orderPage*20+1:0)+' to '+Math.min(filtered.length,(state.orderPage+1)*20)+' of '+filtered.length+'</span><div><button class="btn" id="order-prev" '+(state.orderPage===0?"disabled":"")+'>Previous</button><span>Page '+(state.orderPage+1)+' of '+pages+'</span><button class="btn" id="order-next" '+(state.orderPage>=pages-1?"disabled":"")+'>Next</button></div></div></div>';
  $("#order-prev")?.addEventListener("click",function(){state.orderPage--;renderRows()});
  $("#order-next")?.addEventListener("click",function(){state.orderPage++;renderRows()});
 }
 view.querySelector("#order-window").addEventListener("change",function(e){state.orderWindow=e.target.value;state.orderPage=0;renderRows()});
 view.querySelector("#order-route").addEventListener("change",function(e){state.orderRoute=e.target.value;state.orderPage=0;renderRows()});
 view.querySelector("#order-status").addEventListener("change",function(e){state.orderStatus=e.target.value;state.orderPage=0;renderRows()});
 view.querySelector("#order-search").addEventListener("input",function(e){state.orderQuery=e.target.value;state.orderPage=0;renderRows()});
 renderRows();
}
function orderRow(o){
 const ex=exceptionForOrder(o.id).length;
 return '<tr class="table-click" data-open-order="'+safe(o.id)+'"><td><b>'+safe(dateLabel(o.serviceDate,o.timeZone))+'</b><small>'+safe(o.serviceTime+" "+o.timeSuffix)+'</small></td><td><b>'+safe(o.id)+'</b><small>'+safe(o.customer)+(ex?' · '+ex+' open issue'+(ex===1?"":"s"):'')+'</small></td><td>'+safe(o.market)+'<small>'+safe(o.route)+'</small></td><td><b>'+safe(o.sourceName)+'</b><small>'+safe(o.sourceType)+' · '+safe(o.sourceId)+'</small></td><td>'+safe(o.supplier)+'</td><td>'+pill(o.status,o)+'</td><td>'+safe(o.owner)+'</td></tr>';
}
function dispatchAction(o){
 if(o.dispatchState==="Needs assignment")return '<button class="btn mini primary" data-dispatch-action="send" data-order="'+safe(o.id)+'">Assign and send</button>';
 if(o.dispatchState==="Awaiting supplier")return '<div class="dispatch-actions"><button class="btn mini" data-dispatch-action="accept" data-order="'+safe(o.id)+'">Record acceptance</button><button class="btn mini" data-dispatch-action="reassign" data-order="'+safe(o.id)+'">Reassign</button></div>';
 return '<button class="btn mini" data-open-order="'+safe(o.id)+'">Open</button>';
}
function dispatch(){
 setHead("Dispatch","Plan the next two service days and work exceptions that are still waiting for action.");
 const exceptions=openExceptions();
 const all=state.orders.filter(function(o){return o.serviceWindow==="today"||o.serviceWindow==="tomorrow"});
 const counts={
  today:all.filter(function(o){return o.serviceWindow==="today"}).length,
  tomorrow:all.filter(function(o){return o.serviceWindow==="tomorrow"}).length,
  assignment:all.filter(function(o){return o.dispatchState==="Needs assignment"}).length,
  waiting:all.filter(function(o){return o.dispatchState==="Awaiting supplier"}).length
 };
 const windowOptions=[["all","Both days"],["today","Today"],["tomorrow","Tomorrow"]].map(function(x){return '<option value="'+x[0]+'" '+(state.dispatchWindow===x[0]?"selected":"")+'>'+x[1]+'</option>'}).join("");
 const filterOptions=[["all","All orders"],["assignment","Needs assignment"],["supplier","Awaiting supplier"],["exceptions","Has open exception"]].map(function(x){return '<button class="filter-chip '+(state.dispatchFilter===x[0]?"active":"")+'" data-dispatch-filter="'+x[0]+'">'+x[1]+'</button>'}).join("");
 view.innerHTML=
  '<div class="dispatch-summary"><div class="summary-card"><small>Today</small><b>'+counts.today+'</b><span>scheduled service orders</span></div><div class="summary-card"><small>Tomorrow</small><b>'+counts.tomorrow+'</b><span>scheduled service orders</span></div><div class="summary-card"><small>Two-day load</small><b>'+all.length+'</b><span>orders in this workspace</span></div><div class="summary-card alert"><small>Exceptions waiting</small><b>'+exceptions.length+'</b><span>need an operator action</span></div></div>'+
  '<section class="panel exception-panel"><div class="panel-heading"><div><h3>Exceptions awaiting action</h3><p>Open the order, contact the right party, or update the dispatch plan</p></div><span>'+exceptions.length+' open</span></div><div class="exception-table-wrap"><table class="data-table"><thead><tr><th>Priority</th><th>Issue</th><th>Order</th><th>Service date</th><th>Owner</th><th>Due</th><th>Action</th></tr></thead><tbody>'+(exceptions.length?exceptions.map(function(e){
   const o=orderById(e.orderId);
   return '<tr><td><span class="priority priority-'+e.priority.toLowerCase()+'">'+safe(e.priority)+'</span></td><td><b>'+safe(e.type)+'</b></td><td><button class="link-button" data-open-order="'+safe(e.orderId)+'">'+safe(e.orderId)+'</button></td><td>'+safe(o?dateLabel(o.serviceDate,o.timeZone):"")+'<small>'+safe(o?o.serviceTime+" "+o.timeSuffix:"")+'</small></td><td>'+safe(e.owner)+'</td><td>'+safe(e.dueMinutes<0?"Overdue "+Math.abs(e.dueMinutes)+" min":"Due in "+e.dueMinutes+" min")+'</td><td><button class="btn mini" data-exception-action="'+safe(e.id)+'">Resolve in demo</button></td></tr>';
  }).join(""):'<tr><td colspan="7">No open exceptions.</td></tr>')+'</tbody></table></div></section>'+
  '<section class="panel schedule-panel"><div class="panel-heading"><div><h3>Upcoming dispatch plan</h3><p>All service orders across the next two calendar days</p></div><label class="compact-select">Show<select id="dispatch-window">'+windowOptions+'</select></label></div><div class="filter-row">'+filterOptions+'<span class="filter-spacer"></span><small>Example channel and supplier names</small></div><div id="dispatch-results"></div></section>';
 function renderDispatchRows(){
  let rows=all.filter(function(o){
   if(state.dispatchWindow!=="all"&&o.serviceWindow!==state.dispatchWindow)return false;
   if(state.dispatchFilter==="assignment"&&o.dispatchState!=="Needs assignment")return false;
   if(state.dispatchFilter==="supplier"&&o.dispatchState!=="Awaiting supplier")return false;
   if(state.dispatchFilter==="exceptions"&&!exceptionForOrder(o.id).length)return false;
   return true;
  }).sort(function(a,b){return a.serviceDate.localeCompare(b.serviceDate)||a.serviceTime.localeCompare(b.serviceTime)});
  const byDate={};
  rows.forEach(function(o){(byDate[o.serviceDate]||(byDate[o.serviceDate]=[])).push(o)});
  $("#dispatch-results").innerHTML=Object.keys(byDate).sort().map(function(date){
   const group=byDate[date],first=group[0];
   return '<div class="day-group"><div class="day-group-head"><b>'+safe(relativeDay(first))+' · '+safe(dateLabel(date,first.timeZone))+'</b><span>'+group.length+' orders</span></div><div class="table-scroll"><table class="data-table dispatch-table"><thead><tr><th>Time</th><th>Order and customer</th><th>Route</th><th>Booking source</th><th>Supplier company</th><th>Supplier response</th><th>Service status</th><th>Owner and action</th></tr></thead><tbody>'+group.map(function(o){
    return '<tr><td><b>'+safe(o.serviceTime)+'</b><small>'+safe(o.timeSuffix)+'</small></td><td><b>'+safe(o.id)+'</b><small>'+safe(o.customer)+'</small></td><td>'+safe(o.market)+'<small>'+safe(o.route)+'</small></td><td><b>'+safe(o.sourceName)+'</b><small>'+safe(o.sourceType)+'</small></td><td>'+safe(o.supplier)+'</td><td>'+dispatchPill(o.dispatchState)+'</td><td>'+pill(o.status,o)+(exceptionForOrder(o.id).length?'<small class="issue-flag">Exception open</small>':'')+'</td><td><span class="owner-name">'+safe(o.owner)+'</span>'+dispatchAction(o)+'</td></tr>';
   }).join("")+'</tbody></table></div></div>';
  }).join("")||'<div class="empty-note">No orders match this view.</div>';
  $("#dispatch-results").querySelectorAll("[data-open-order]").forEach(function(button){button.addEventListener("click",function(){openOrder(button.dataset.openOrder)})});
  $("#dispatch-results").querySelectorAll("[data-dispatch-action]").forEach(function(button){button.addEventListener("click",function(){if(button.dataset.dispatchAction==="send")sendToSupplier(button.dataset.order);else if(button.dataset.dispatchAction==="reassign")reassignSupplier(button.dataset.order);else acceptSupplier(button.dataset.order)})});
 }
 view.querySelector("#dispatch-window").addEventListener("change",function(e){state.dispatchWindow=e.target.value;renderDispatchRows()});
 view.querySelectorAll("[data-dispatch-filter]").forEach(function(button){button.addEventListener("click",function(){state.dispatchFilter=button.dataset.dispatchFilter;render("dispatch")})});
 view.querySelectorAll("[data-open-order]").forEach(function(button){button.addEventListener("click",function(){openOrder(button.dataset.openOrder)})});
 view.querySelectorAll("[data-exception-action]").forEach(function(button){button.addEventListener("click",function(){resolveException(button.dataset.exceptionAction)})});
 renderDispatchRows();
}
function exceptions(){
 setHead("Exceptions","Open service issues, their owner, due time, and next action.");
 const open=openExceptions(),closed=state.exceptions.filter(function(e){return e.status==="RESOLVED"});
 view.innerHTML='<div class="dispatch-summary"><div class="summary-card alert"><small>Awaiting action</small><b>'+open.length+'</b><span>open exceptions</span></div><div class="summary-card"><small>Resolved in this demo</small><b>'+closed.length+'</b><span>local test actions</span></div><div class="summary-card"><small>Service dates</small><b>2</b><span>today and tomorrow</span></div><div class="summary-card"><small>Orders in scope</small><b>'+state.orders.length+'</b><span>illustrative two-day schedule</span></div></div><div class="panel"><div class="panel-heading"><div><h3>Open exception queue</h3><p>Each issue links to the order, conversation, and service milestone</p></div><span>'+open.length+' need action</span></div><div class="table-scroll"><table class="data-table"><thead><tr><th>Priority</th><th>Issue</th><th>Order and route</th><th>Service date</th><th>Owner</th><th>Due</th><th>Action</th></tr></thead><tbody>'+(open.length?open.map(function(e){
  const o=orderById(e.orderId);
  return '<tr><td><span class="priority priority-'+e.priority.toLowerCase()+'">'+safe(e.priority)+'</span></td><td><b>'+safe(e.type)+'</b></td><td><button class="link-button" data-open-order="'+safe(e.orderId)+'">'+safe(e.orderId)+'</button><small>'+safe(o?o.market+" · "+o.route:"")+'</small></td><td>'+safe(o?dateLabel(o.serviceDate,o.timeZone):"")+'<small>'+safe(o?o.serviceTime+" "+o.timeSuffix:"")+'</small></td><td>'+safe(e.owner)+'</td><td>'+safe(e.dueMinutes<0?"Overdue "+Math.abs(e.dueMinutes)+" min":"Due in "+e.dueMinutes+" min")+'</td><td><button class="btn mini" data-exception-action="'+safe(e.id)+'">Resolve in demo</button></td></tr>';
 }).join(""):'<tr><td colspan="7">No exceptions are waiting for action.</td></tr>')+'</tbody></table></div></div><div class="comms-note"><b>Demo control:</b> resolving an exception changes only this browser. It does not notify a supplier, driver, or customer.</div>';
 view.querySelectorAll("[data-open-order]").forEach(function(button){button.addEventListener("click",function(){openOrder(button.dataset.openOrder)})});
 view.querySelectorAll("[data-exception-action]").forEach(function(button){button.addEventListener("click",function(){resolveException(button.dataset.exceptionAction)})});
}
function tower(){
 setHead("Overview","See service volume, upcoming dispatch, and the issues that need an operator.");
 const today=state.orders.filter(function(o){return o.serviceWindow==="today"}).length;
 const tomorrow=state.orders.filter(function(o){return o.serviceWindow==="tomorrow"}).length;
 const open=openExceptions(),notAssigned=state.orders.filter(function(o){return o.dispatchState==="Needs assignment"}).length;
 const recent=state.messages.slice().sort(function(a,b){return b.createdAt-a.createdAt}).slice(0,5);
 const exceptionRows=open.slice(0,8).map(function(e){
  const o=orderById(e.orderId);
  return '<div class="attention-row"><span class="priority priority-'+e.priority.toLowerCase()+'">'+safe(e.priority)+'</span><div><b>'+safe(e.type)+'</b><small>'+safe(o?o.id+" · "+o.customer:"")+" · "+safe(e.owner)+'</small></div><button class="btn mini" onclick="openOrder(\''+safe(e.orderId)+'\')">Review</button></div>';
 }).join("");
 view.innerHTML='<div class="overview-banner"><div><small>ORDER MANAGEMENT WORKSPACE</small><h2>One view for the booking, the service, and the conversation.</h2><p>Orders arrive from websites and distribution companies. Operations can see the source, assign a supplier, follow route-specific milestones, and keep customer, driver, and team messages with the order.</p></div><button class="btn primary" onclick="render(\'dispatch\')">Open two-day dispatch plan</button></div><div class="dispatch-summary"><div class="summary-card"><small>Today</small><b>'+today+'</b><span>scheduled orders</span></div><div class="summary-card"><small>Tomorrow</small><b>'+tomorrow+'</b><span>scheduled orders</span></div><div class="summary-card"><small>Next two days</small><b>'+state.orders.length+'</b><span>orders in demo fixture</span></div><div class="summary-card alert"><small>Needs action</small><b>'+open.length+'</b><span>open exceptions</span></div></div><div class="overview-grid"><section class="panel"><div class="panel-heading"><div><h3>Exceptions awaiting action</h3><p>Prioritized by priority and due time</p></div><button class="text-button" onclick="render(\'exceptions\')">View all</button></div><div class="attention-list">'+(exceptionRows||'<div class="empty-note">No issues are waiting for action.</div>')+'</div></section><section class="panel"><div class="panel-heading"><div><h3>Recent messages</h3><p>Customer, driver, and team updates</p></div><button class="text-button" onclick="render(\'communications\')">Open inbox</button></div><div class="recent-list">'+recent.map(function(m){const o=orderById(m.orderId);return '<button class="recent-message" onclick="openCommunications(\''+safe(m.orderId)+'\')"><span><b>'+safe(m.role==="Customer"?o.customer:m.role==="Driver"?m.actor.split(" · ")[1]:"Operations team")+'</b><small>'+safe(o.id)+' · '+safe(m.role)+'</small></span><p>'+safe(m.text)+'</p></button>'}).join("")+'</div></section></div><div class="footnote">Example orders, company labels, messages, and service events. No booking, supplier, driver, or chat connection is active.</div>';
}
function metrics(){
 setHead("Demo metrics","Counts from the current two-day browser scenario, not historical performance.");
 const daily=state.orders.filter(function(o){return o.serviceWindow==="today"}).length;
 const tomorrow=state.orders.filter(function(o){return o.serviceWindow==="tomorrow"}).length;
 const assigned=state.orders.filter(function(o){return o.dispatchState!=="Needs assignment"}).length;
 const open=openExceptions().length;
 const byRoute=ROUTES.map(function(route){return [route,state.orders.filter(function(o){return o.route===route}).length]});
 const bySource=SOURCES.map(function(source){return [source.name,state.orders.filter(function(o){return o.sourceName===source.name}).length]});
 function metricCard(label,value,detail){return '<div class="summary-card"><small>'+safe(label)+'</small><b>'+safe(value)+'</b><span>'+safe(detail)+'</span></div>'}
 function rows(items){return items.map(function(row){return '<div class="breakdown-row"><span>'+safe(row[0])+'</span><b>'+row[1]+'</b></div>'}).join("")}
 view.innerHTML='<div class="dispatch-summary">'+metricCard("Orders today",daily,"illustrative service orders")+metricCard("Orders tomorrow",tomorrow,"illustrative service orders")+metricCard("Two-day volume",state.orders.length,"60 orders per day in this demo")+metricCard("Open exceptions",open,"items waiting for action")+'</div><div class="overview-grid"><section class="panel"><div class="panel-heading"><div><h3>Orders by service route</h3><p>Current demo fixture</p></div></div><div class="panel-body">'+rows(byRoute)+'</div></section><section class="panel"><div class="panel-heading"><div><h3>Orders by booking source</h3><p>Example channel mix</p></div></div><div class="panel-body">'+rows(bySource)+'</div></section></div><div class="comms-note"><b>Interpretation:</b> volume and channel counts are generated examples for interaction testing. They do not describe the company’s actual transaction history, partner relationships, or operating performance. '+assigned+' of '+state.orders.length+' example orders have a supplier assigned.</div>';
}
function render(name){
 document.querySelectorAll(".nav").forEach(function(item){item.classList.toggle("active",item.dataset.view===name)});
 ({tower:tower,orders:orders,dispatch:dispatch,communications:communications,exceptions:exceptions,metrics:metrics}[name]||tower)();
}
function mountTravelCommand(){
 if(!window.AgentCommandSurface)return;
 window.AgentCommandSurface.mount({
  product:"Order Management System",
  placeholder:"Ask about orders, dispatch, or conversations",
  suggestions:["Show the next two days of dispatch","Find orders awaiting luggage-tag upload","Open communications"],
  fallback:["Review upcoming orders","Find exceptions awaiting action","Open customer and driver messages"],
  resolve:function(text){
   const query=text.toLowerCase(),match=text.match(/OMS-\d{8}-\d{3}/i);
   const order=match?orderById(match[0].toUpperCase()):null;
   if(/communicat|message|chat/.test(query))return{
    objective:"Open the linked customer, driver, and team conversations",
    steps:[{agent:"Order Context",task:"Find the selected order and its conversation history."},{agent:"Communications",task:"Display messages by customer, driver, and internal team."}],
    run:function(){render("communications");return{title:"Order conversations",summary:"The communications workspace groups local example messages by order and participant.",checked:state.messages.length+" browser-local example messages",freshness:"Current demo state",sources:["Order record","Customer chat examples","Driver chat examples","Operations team notes"],exception:"No message will be sent to a real person."}}
   };
   if(/dispatch|next two|next 2|upcoming/.test(query))return{
    objective:"Review orders and exceptions for the next two service days",
    steps:[{agent:"Dispatch Planner",task:"Filter orders by the two-day service window."},{agent:"Exception Monitor",task:"Show cases with a pending owner action."}],
    run:function(){render("dispatch");return{title:"Two-day dispatch plan",summary:"The dispatch view contains all example orders for today and tomorrow, plus open exceptions.",facts:["60 example orders per service date",openExceptions().length+" exceptions awaiting action"],checked:state.orders.length+" orders · two service days",freshness:"Current browser-local scenario",sources:["Order list","Supplier dispatch state","Exception queue"],exception:"All values are examples and no supplier was contacted."}}
   };
   if(/tag|drop/.test(query))return{
    objective:"Find orders waiting for the customer to drop luggage and upload a tag",
    steps:[{agent:"Order Search",task:"Find hotel-origin routes before driver collection."},{agent:"Work Planner",task:"Open an order with missing luggage-tag evidence."}],
    run:function(){const target=state.orders.find(function(o){return o.status==="AWAITING_CUSTOMER_DROP"});if(target)openOrder(target.id);return{title:"Waiting for customer drop and tag",summary:target?target.id+" is waiting for a customer luggage drop and tag image.":"No such order is currently in the two-day example data.",facts:target?[target.route,target.market,orderDateTime(target)]:[],checked:state.orders.length+" example orders",freshness:"Current browser-local state",sources:["Order milestone","Luggage-tag evidence"],exception:"The demo does not store or send uploaded files outside this browser.",action:target?{label:"Open order",run:function(){openOrder(target.id)}}:null}}
   };
   if(order)return{
    objective:"Review an order and its next safe action",
    steps:[{agent:"Order Context",task:"Show the booking source, service date, supplier, and current milestone."},{agent:"Work Planner",task:"Offer the next route-specific service update."}],
    run:function(){openOrder(order.id);return{title:order.id+" · "+statusLabel(order.status,order),summary:order.customer+" · "+order.route+" · "+orderDateTime(order),facts:["Supplier: "+order.supplier,"Dispatch: "+order.dispatchState,"Open exceptions: "+exceptionForOrder(order.id).length],checked:"1 browser-local order",freshness:"Current demo state",sources:["Order record","Event history","Conversation thread"],exception:"No external action occurs unless a connected production integration is implemented.",action:{label:"Open order",run:function(){openOrder(order.id)}}}}
   };
   if(/exception|needs action|waiting/.test(query))return{
    objective:"Find exceptions that need an operator",
    steps:[{agent:"Exception Monitor",task:"List open issues and owners."},{agent:"Work Planner",task:"Open the selected order and its messages."}],
    run:function(){render("exceptions");return{title:openExceptions().length+" exceptions awaiting action",summary:"The exception list includes its order, service date, owner, and due time.",checked:state.orders.length+" orders · "+openExceptions().length+" open exceptions",freshness:"Current browser-local state",sources:["Exception queue","Order records"],exception:"Example exceptions only."}}
   };
   return null;
  }
 });
}
function resetDemo(){
 localStorage.removeItem(STORE_KEY);
 location.reload();
}
function openFeaturedOrder(){openOrder(state.orders[0].id)}
document.querySelectorAll(".nav").forEach(function(button){button.addEventListener("click",function(){render(button.dataset.view)})});
$("#reset").addEventListener("click",resetDemo);
$("#global-search").addEventListener("keydown",function(event){
 if(event.key!=="Enter")return;
 state.orderQuery=event.currentTarget.value.trim();state.orderWindow="all";state.orderPage=0;render("orders");
});
mountTravelCommand();
render("tower");
window.render=render;
window.openOrder=openOrder;
window.openFeaturedOrder=openFeaturedOrder;
window.openCommunications=openCommunications;
window.advanceOrder=advanceOrder;
window.recordCustomerDrop=recordCustomerDrop;
window.sendToSupplier=sendToSupplier;
window.acceptSupplier=acceptSupplier;
window.reassignSupplier=reassignSupplier;
window.resolveException=resolveException;
