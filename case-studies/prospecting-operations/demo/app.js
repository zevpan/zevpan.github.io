const SEED={
capacity:{weekly:40,reservedInbound:10,reservedNewAccepts:8,plannedFollowups:17,usedInbound:5,usedNewAccepts:4,usedFollowups:14},
people:[
{id:"maya",name:"Maya Chen",title:"Head of Operations",company:"Arcadia Systems",initials:"MC",state:"OUTBOUND_LAST",label:"Outbound last",eligible:true,priority:"P1",why:"Follow-up due today",action:"Follow up",actionStatus:"OPEN",summary:"Maya previously discussed manual reconciliation across regional teams. A follow-up is due, but there has been no new interaction since the last outbound message.",memory:[["Priority","Reduce manual reconciliation"],["Known objection","Do not replace existing CRM"],["Commitment","Send integration approach"],["Stakeholder","VP Operations sponsors"]],timeline:[["12 Sep","Follow-up sent","Shared a workflow example."],["29 Aug","Discovery meeting","Discussed fragmented relationship context."],["18 Aug","Connected","Relationship entered the operating layer."]],evidence:["Latest interaction is outbound","Reconnect window is open","No DNC restriction","No newer inbound context"],history:[["FOLLOW_UP_MAYA","OPEN","Created from state + eligibility + capacity"]]},
{id:"daniel",name:"Daniel Wong",title:"Commercial Director",company:"Northstar Freight",initials:"DW",state:"RECONNECT_DUE",label:"Reconnect due",eligible:true,priority:"P1",why:"Agreed reconnect date reached",action:"Reconnect",actionStatus:"OPEN",summary:"Daniel asked to reconnect after budget review. No newer interaction supersedes that commitment.",memory:[["Priority","Partner follow-up"],["Known objection","Budget timing"],["Commitment","Reconnect after September review"],["Stakeholder","Finance Director influences approval"]],timeline:[["Today","Reconnect date reached","Rule opened action."],["02 Sep","Snoozed","Daniel requested later follow-up."]],evidence:["Reconnect date reached","No newer inbound","No duplicate action"],history:[["RECONNECT_DANIEL","OPEN","Agreement date reached"]]},
{id:"sarah",name:"Sarah Lim",title:"VP Customer Success",company:"Vector Labs",initials:"SL",state:"OPPORTUNITY",label:"Opportunity",eligible:true,priority:"P1",why:"New project signal",action:"Review opportunity",actionStatus:"OPEN",summary:"Sarah mentioned an upcoming consolidation project and asked how teams preserve context across handoffs.",memory:[["Priority","Handoff continuity"],["Known objection","Security review"],["Signal","Project next quarter"],["Stakeholder","COO owns budget"]],timeline:[["Yesterday","Signal detected","Upcoming consolidation project mentioned."],["16 Sep","Meeting note","Asked about context continuity."]],evidence:["Explicit project timing","Relevant pain point","Human qualification required"],history:[["REVIEW_SARAH","OPEN","Opportunity signal detected"]]},
{id:"priya",name:"Priya Nair",title:"COO",company:"Helix Advisory",initials:"PN",state:"AMBIGUOUS_IDENTITY",label:"Identity review",eligible:false,priority:"BLOCKED",why:"Identity not resolved",action:"Resolve identity",actionStatus:"BLOCKED",summary:"A new message may belong to an existing person with a changed domain. Automatic merge is blocked.",memory:[["Match candidate","Previous Priya Nair record"],["Confidence","0.78"],["Conflict","Company changed"],["Control","Human review required"]],timeline:[["Today","Ambiguous match","New domain detected."]],evidence:["Name match","Role similarity","Domain mismatch","No deterministic key"],history:[["FOLLOW_UP_PRIYA","BLOCKED","Identity gate failed"]]},
{id:"leo",name:"Leo Goh",title:"Founder",company:"BrightPath AI",initials:"LG",state:"DO_NOT_CONTACT",label:"Do not contact",eligible:false,priority:"BLOCKED",why:"Suppression rule",action:"No action",actionStatus:"BLOCKED",summary:"Explicit suppression blocks action generation regardless of priority or AI interpretation.",memory:[["Suppression","Do not contact"],["Source","Human override"],["Effective date","08 Sep"],["Control","Fail closed"]],timeline:[["08 Sep","DNC set","Human override applied."]],evidence:["Explicit DNC flag","Eligibility = false","No action generation permitted"],history:[["FOLLOW_UP_LEO","SUPERSEDED","Suppression override"]]},
{id:"jordan",name:"Jordan Tan",title:"Head of Partnerships",company:"Meridian Commerce",initials:"JT",state:"NURTURE",label:"Nurture",eligible:true,priority:"P2",why:"Future touchpoint scheduled",action:"Keep warm",actionStatus:"SNOOZED",summary:"No current project. Relationship remains in nurture.",memory:[["Priority","Partnership visibility"],["Known objection","No active project"],["Commitment","Share quarterly update"],["Stakeholder","Founder joins major decisions"]],timeline:[["10 Sep","Nurture update","No immediate project."]],evidence:["No active opportunity","Future touchpoint already scheduled"],history:[["NURTURE_JORDAN","SNOOZED","Next touchpoint not due"]]}
],
audit:[
["14:10","Rules","eligibility.checked","Maya Chen eligible for follow-up"],
["13:42","Identity","match.review_required","Priya Nair automatic merge blocked"],
["09:00","Rules","reconnect.opened","Daniel Wong reconnect window opened"],
["08 Sep","Human","suppression.applied","Leo Goh set to Do Not Contact"]
]};
const KEY="relationship-ops-demo-v1";let state=JSON.parse(localStorage.getItem(KEY)||"null")||structuredClone(SEED);
const $=s=>document.querySelector(s),view=$("#view"),title=$("#title"),subtitle=$("#subtitle");
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function setHead(t,s){title.textContent=t;subtitle.textContent=s}
function pill(p){return '<span class="state '+p.state+'">'+p.label+'</span>'}
function usedCapacity(){const c=state.capacity;return c.usedInbound+c.usedNewAccepts+c.usedFollowups}
function updateCap(){const left=state.capacity.weekly-usedCapacity();$("#capacityPill").textContent=left+" of "+state.capacity.weekly+" weekly slots remain"}
function queueRow(p){return '<div class="queue-row" onclick="openPerson(\''+p.id+'\')"><div class="avatar">'+p.initials+'</div><div><div class="name">'+p.name+'</div><div class="meta">'+p.title+" · "+p.company+'</div></div><div class="why">'+p.why+'</div><div class="action">'+p.action+'</div><div class="state-cell">'+pill(p)+'</div></div>'}
function render(name){updateCap();document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===name));({queue,people,reconcile,capacity,audit}[name]||queue)()}
function queue(){
 setHead("Action Queue","Current, eligible actions within limited human capacity.");
 const open=state.people.filter(p=>p.actionStatus==="OPEN").length,blocked=state.people.filter(p=>!p.eligible).length,sup=state.people.reduce((n,p)=>n+p.history.filter(h=>h[1]==="SUPERSEDED").length,0),left=state.capacity.weekly-usedCapacity();
 view.innerHTML='<div class="intro"><div><h2>State before priority. Eligibility before capacity.</h2><p>The queue only contains actions that survive identity, suppression, timing and duplicate-action controls.</p></div><div class="demo-path"><b>Featured walkthrough:</b> open <strong>Maya Chen</strong>, ingest a new reply, and watch the old follow-up become <strong>SUPERSEDED</strong> before a replacement action appears.</div></div>'+
 '<div class="metrics"><div class="metric"><b>'+open+'</b><span>Open actions</span></div><div class="metric risk"><b>'+blocked+'</b><span>Blocked by policy / identity</span></div><div class="metric warn"><b>'+sup+'</b><span>Superseded actions</span></div><div class="metric"><b>'+left+'</b><span>Capacity slots remaining</span></div></div>'+
 '<div class="panel"><div class="panel-head"><h3>Priority queue</h3><span>Why now → action</span></div><div class="panel-body">'+state.people.filter(p=>p.actionStatus==="OPEN").sort((a,b)=>a.priority.localeCompare(b.priority)).map(queueRow).join("")+'</div></div>'
}
function people(){
 setHead("Relationships","Persistent state separated from temporary actions.");
 view.innerHTML='<div class="panel"><div class="panel-head"><h3>Relationship state</h3><span>'+state.people.length+' synthetic people</span></div><table><thead><tr><th>Person</th><th>Company</th><th>State</th><th>Eligible?</th><th>Current action</th></tr></thead><tbody>'+state.people.map(p=>'<tr class="click" onclick="openPerson(\''+p.id+'\')"><td><b>'+p.name+'</b><div class="small">'+p.title+'</div></td><td>'+p.company+'</td><td>'+pill(p)+'</td><td>'+(p.eligible?"Yes":"No")+'</td><td>'+p.action+'</td></tr>').join("")+'</tbody></table></div>'
}
function reconcile(){
 setHead("Reconciliation","New information can invalidate actions that were previously correct.");
 const p=state.people.find(x=>x.state==="AMBIGUOUS_IDENTITY");
 view.innerHTML=p?'<div class="panel"><div class="panel-head"><h3>Identity reconciliation</h3><span class="state AMBIGUOUS_IDENTITY">Human review required</span></div><div class="detail-grid" style="padding:15px"><div><div class="brief"><div class="label">MATCH REVIEW</div><b>'+p.name+'</b><p>'+p.summary+'</p></div><div class="evidence">'+p.evidence.map(e=>'<div>• '+e+'</div>').join("")+'</div></div><div><div class="card-title"><h3>Candidate memory</h3><span>do not auto-merge</span></div><div class="memory">'+p.memory.map(m=>'<div><b>'+m[0]+'</b><span>'+m[1]+'</span></div>').join("")+'</div><p><button class="btn primary" onclick="resolveIdentity()">Confirm same person</button></p></div></div></div>':'<div class="panel empty">No unresolved identity cases. Reset the demo to restore the reconciliation scenario.</div>'
}
function capacity(){
 setHead("Capacity","A weekly ceiling is a resource constraint, not a target to maximize.");
 const c=state.capacity,left=c.weekly-usedCapacity(),used=usedCapacity();
 view.innerHTML='<div class="cap-grid"><div class="cap-card"><h3>Weekly working capacity</h3><div style="font-size:28px;font-weight:900">'+used+' / '+c.weekly+'</div><div class="progress"><span style="width:'+Math.round(used/c.weekly*100)+'%"></span></div><div class="cap-note">'+left+' slots remain unallocated for emergent work.</div></div><div class="cap-card"><h3>Protected allocation</h3><div class="alloc">'+alloc("Inbound replies",c.usedInbound,c.reservedInbound)+alloc("New accepts",c.usedNewAccepts,c.reservedNewAccepts)+alloc("Planned follow-ups",c.usedFollowups,c.plannedFollowups)+'</div><div class="cap-note">The demo deliberately does not fill the entire weekly ceiling with generic follow-up.</div></div></div>'
}
function alloc(label,used,total){return '<div class="alloc-row"><span>'+label+'</span><div class="bar"><span style="width:'+Math.min(100,Math.round(used/total*100))+'%"></span></div><b>'+used+'/'+total+'</b></div>'}
function audit(){
 setHead("Audit","Decision provenance for state, policy and action changes.");
 view.innerHTML='<div class="panel"><div class="panel-head"><h3>Decision audit</h3><span>latest first</span></div><table><thead><tr><th>Time</th><th>Actor</th><th>Event</th><th>Detail</th></tr></thead><tbody>'+state.audit.map(a=>'<tr><td>'+a[0]+'</td><td>'+a[1]+'</td><td><code>'+a[2]+'</code></td><td>'+a[3]+'</td></tr>').join("")+'</tbody></table></div>'
}
function openPerson(id){
 const p=state.people.find(x=>x.id===id);if(!p)return;
 setHead("Relationship Detail","State, eligibility, evidence and action history in one place.");
 view.innerHTML='<div class="toolbar"><button class="back" onclick="render(\'queue\')">← Back to Action Queue</button><span class="demo-status">'+(p.id==="maya"?"Featured action-reconciliation walkthrough":"Synthetic relationship record")+'</span></div>'+
 (p.changed?'<div class="banner">Reconciliation complete: the new inbound reply changed relationship state and superseded the previous follow-up.</div>':'')+
 (!p.eligible?'<div class="banner warn-banner">Fail-closed control: this relationship is not eligible for an external action.</div>':'')+
 '<div class="detail"><div class="avatar">'+p.initials+'</div><div><h2>'+p.name+'</h2><div class="meta">'+p.title+" · "+p.company+'</div><div style="margin-top:7px">'+pill(p)+'</div></div><div class="actions">'+buttons(p)+'</div></div>'+
 '<div class="detail-grid"><div><div class="card"><div class="card-title"><h3>AI relationship analysis</h3><span>proposal + evidence</span></div><div class="brief"><div class="label">SIMULATED AI-ASSISTED ANALYSIS</div><b>Current interpretation</b><p>'+p.summary+'</p></div><div class="evidence">'+p.evidence.map(e=>'<div>✓ '+e+'</div>').join("")+'</div></div>'+
 '<div class="card" style="margin-top:12px"><div class="card-title"><h3>Interaction timeline</h3><span>chronology</span></div><div class="timeline">'+p.timeline.map(t=>'<div class="tl"><b>'+t[0]+" · "+t[1]+'</b><p>'+t[2]+'</p></div>').join("")+'</div></div></div>'+
 '<div><div class="card"><div class="card-title"><h3>Eligibility gate</h3><span>deterministic</span></div>'+eligibilityHtml(p)+'</div>'+
 '<div class="card" style="margin-top:12px"><div class="card-title"><h3>Relationship Memory</h3><span>persistent context</span></div><div class="memory">'+p.memory.map(m=>'<div><b>'+m[0]+'</b><span>'+m[1]+'</span></div>').join("")+'</div></div>'+
 '<div class="card" style="margin-top:12px"><div class="card-title"><h3>Action state</h3><span>live decision surface</span></div><div class="action-box"><b>'+p.action+'</b><p>'+p.why+'</p><div class="action-history">'+p.history.map(h=>'<div class="hist '+(h[1]==="SUPERSEDED"?"superseded":"")+'"><span>'+h[0]+' · '+h[2]+'</span><b>'+h[1]+'</b></div>').join("")+'</div></div></div></div></div>'
}
function eligibilityHtml(p){
 const rows=[
  ["Identity resolved",p.state!=="AMBIGUOUS_IDENTITY","E-01"],
  ["Not suppressed",p.state!=="DO_NOT_CONTACT","E-02"],
  ["Timing / cooldown valid",true,"E-05"],
  ["No conflicting newer action",true,"E-08"]
 ];
 return '<div class="eligibility">'+rows.map(r=>'<div class="elig-row"><div class="elig-icon '+(r[1]?"":"fail")+'">'+(r[1]?"✓":"!")+'</div><div><b>'+r[0]+'</b><p>'+(r[1]?"Pass":"Block / review")+'</p></div><span class="rule">'+r[2]+'</span></div>').join("")+'</div>'
}
function buttons(p){
 if(p.id!=="maya") return '<button class="btn" onclick="render(\'people\')">View all</button>';
 if(!p.changed) return '<button class="btn primary" onclick="ingestReply()">Ingest new inbound reply</button>';
 return '<button class="btn" onclick="resetDemo()">Replay walkthrough</button>'
}
function ingestReply(){
 const p=state.people.find(x=>x.id==="maya");
 p.changed=true;p.state="ACTIVE_CONVERSATION";p.label="Active conversation";p.why="New inbound reply requires review";p.action="Review reply";p.actionStatus="OPEN";
 p.summary="Maya replied after the scheduled follow-up was created. The old follow-up is now stale. The relationship is an active conversation and requires human review of the inbound context.";
 p.timeline.unshift(["Just now","Inbound reply","Asked whether the system can sit beside the existing CRM."]);
 p.evidence=["New inbound interaction is newer than the scheduled follow-up","Relationship state recomputed to Active conversation","Old follow-up no longer matches current context","Human review required before any new outbound action"];
 p.history[0][1]="SUPERSEDED";p.history[0][2]="Invalidated by newer inbound interaction";p.history.unshift(["REVIEW_MAYA_REPLY","OPEN","Replacement action created from reconciled state"]);
 state.capacity.usedInbound+=1;
 state.audit.unshift(["Now","Rules","action.superseded","FOLLOW_UP_MAYA invalidated by newer inbound interaction"]);
 state.audit.unshift(["Now","State","relationship.recomputed","Maya Chen → ACTIVE_CONVERSATION"]);
 state.audit.unshift(["Now","System","interaction.ingested","New inbound reply linked to Maya Chen"]);
 save();openPerson("maya")
}
function resolveIdentity(){
 const p=state.people.find(x=>x.id==="priya");p.state="ACTIVE_CONVERSATION";p.label="Active conversation";p.eligible=true;p.priority="P2";p.why="Identity confirmed by human";p.action="Review relationship";p.actionStatus="OPEN";p.history.unshift(["REVIEW_PRIYA","OPEN","Created after human identity confirmation"]);state.audit.unshift(["Now","Human","identity.override.confirmed","Priya Nair confirmed as same person after domain change"]);save();reconcile()
}
function resetDemo(){localStorage.removeItem(KEY);location.reload()}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>render(b.dataset.view));
$("#reset").onclick=resetDemo;
render("queue");