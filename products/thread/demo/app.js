const SEED={
workspace:{user:"Zev",capacityWeekly:40,usedCapacity:23},
people:[
{id:"maya",name:"Maya Chen",title:"Head of Operations",company:"Arcadia Systems",initials:"MC",state:"ACTIVE_CONVERSATION",label:"Active conversation",priority:1,why:"Replied after 41 days",action:"Review reply",status:"OPEN",summary:"Maya is evaluating ways to reduce manual reconciliation across regional teams. Her latest concern is whether Thread can sit beside the existing CRM rather than replace it.",memory:[["Priority","Reduce manual reconciliation"],["Known objection","Do not replace existing CRM"],["Commitment","Send integration approach"],["Stakeholder","VP Operations sponsors"]],timeline:[["Today · 14:12","Inbound reply","Asked whether Thread can sit beside their current CRM."],["12 Sep","Follow-up sent","Shared a workflow example."],["29 Aug","Discovery meeting","Discussed fragmented context and handoff risk."]],evidence:["New inbound message","Previous follow-up should be superseded","No suppression rule","Human response required"]},
{id:"daniel",name:"Daniel Wong",title:"Commercial Director",company:"Northstar Freight",initials:"DW",state:"RECONNECT_DUE",label:"Reconnect due",priority:1,why:"Reconnect date reached",action:"Reconnect",status:"OPEN",summary:"Daniel asked the team to reconnect after budget review.",memory:[["Priority","Partner follow-up"],["Known objection","Budget timing"],["Commitment","Reconnect after budget review"],["Stakeholder","Finance Director influences approval"]],timeline:[["Today · 09:00","Reconnect date reached","Rule opened a reconnect action."],["02 Sep","Snoozed","Daniel requested a later follow-up."]],evidence:["Reconnect date reached","No newer interaction","No duplicate action"]},
{id:"sarah",name:"Sarah Lim",title:"VP Customer Success",company:"Vector Labs",initials:"SL",state:"OPPORTUNITY_SIGNAL",label:"Opportunity signal",priority:1,why:"New buying signal",action:"Review opportunity",status:"OPEN",summary:"Sarah mentioned an upcoming consolidation project and asked how teams preserve context across handoffs.",memory:[["Priority","Handoff continuity"],["Known objection","Security review"],["Signal","Project next quarter"],["Stakeholder","COO owns budget"]],timeline:[["Yesterday","Signal detected","Upcoming consolidation project mentioned."],["16 Sep","Meeting note","Asked about context continuity."]],evidence:["Explicit project timing","Relevant pain point","Human qualification required"]},
{id:"jordan",name:"Jordan Tan",title:"Head of Partnerships",company:"Meridian Commerce",initials:"JT",state:"NURTURE",label:"Nurture",priority:2,why:"No urgent change",action:"Keep warm",status:"SNOOZED",summary:"No current project. Relationship stays in nurture until the next agreed touchpoint.",memory:[["Priority","Partnership visibility"],["Known objection","No active project"],["Commitment","Share quarterly update"],["Stakeholder","Founder joins major decisions"]],timeline:[["10 Sep","Nurture update","No immediate project."]],evidence:["No active opportunity","Future touchpoint scheduled"]},
{id:"priya",name:"Priya Nair",title:"COO",company:"Helix Advisory",initials:"PN",state:"AMBIGUOUS_IDENTITY",label:"Identity review",priority:1,why:"Possible duplicate identity",action:"Resolve identity",status:"OPEN",summary:"A new message may belong to an existing person with a changed company domain. Thread has stopped before merging.",memory:[["Match candidate","Previous Priya Nair record"],["Confidence","0.78"],["Conflict","Company changed"],["Control","Human review required"]],timeline:[["Today · 11:08","Ambiguous match","New domain detected."]],evidence:["Name match","Role similarity","Domain mismatch","No deterministic key"]},
{id:"leo",name:"Leo Goh",title:"Founder",company:"BrightPath AI",initials:"LG",state:"DO_NOT_CONTACT",label:"Do not contact",priority:3,why:"Suppression rule",action:"No action",status:"BLOCKED",summary:"This person is suppressed. Thread can explain the record but cannot create an external action.",memory:[["Suppression","Do not contact"],["Source","Human override"],["Effective date","08 Sep"],["Control","Fail closed"]],timeline:[["08 Sep","DNC set","Human override applied."]],evidence:["Explicit DNC flag","Eligibility = false","Action generation blocked"]}
],
signals:[
{person:"Maya Chen",text:"New inbound reply changed the recommended next action.",time:"43 min ago"},
{person:"Priya Nair",text:"Possible duplicate identity requires human review.",time:"2h ago"},
{person:"Sarah Lim",text:"Upcoming consolidation project detected in meeting context.",time:"Yesterday"},
{person:"Workspace",text:"17 team-capacity slots remain this week.",time:"Today"}
],
audit:[
{time:"14:12",actor:"System",event:"interaction.ingested",detail:"Inbound message linked to Maya Chen"},
{time:"14:12",actor:"Rules",event:"action.superseded",detail:"Old follow-up superseded by inbound reply"},
{time:"14:13",actor:"AI",event:"relationship.summary.proposed",detail:"Evidence-backed summary refreshed"},
{time:"11:08",actor:"Identity",event:"match.review_required",detail:"Priya Nair domain mismatch; automatic merge blocked"}
]};
const KEY="thread-mvp0";let state=JSON.parse(localStorage.getItem(KEY)||"null")||structuredClone(SEED);
const $=s=>document.querySelector(s),view=$("#view"),title=$("#title"),subtitle=$("#subtitle");
function save(){localStorage.setItem(KEY,JSON.stringify(state))}
function pill(p){return '<span class="state '+p.state+'">'+p.label+'</span>'}
function cap(){const left=state.workspace.capacityWeekly-state.workspace.usedCapacity;$("#capacity").textContent=left+" of "+state.workspace.capacityWeekly+" weekly slots remain"}
function setHead(t,s){title.textContent=t;subtitle.textContent=s}
function row(p){return '<div class="row" onclick="openPerson(\''+p.id+'\')"><div class="avatar">'+p.initials+'</div><div><div class="name">'+p.name+'</div><div class="meta">'+p.title+" · "+p.company+'</div></div><div class="reason">'+p.why+'</div><button class="btn">'+p.action+'</button></div>'}
function render(name){cap();document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===name));({home,work,people,signals,reconciliation,audit}[name]||home)()}
function home(){
 setHead("Today","Shared context, prioritized for human attention.");
 const open=state.people.filter(p=>p.status==="OPEN").length,review=state.people.filter(p=>p.state==="AMBIGUOUS_IDENTITY").length;
 view.innerHTML='<div class="home-intro"><div><h2>Good afternoon, '+state.workspace.user+'.</h2><p>'+open+' items need attention. Thread keeps the shared context current as work changes.</p></div><div class="demo-hint"><b>Portfolio demo:</b> open Maya Chen, then click <strong>Simulate new inbound reply</strong>. Thread will update memory and supersede the stale action.</div></div>'+
 '<div class="metrics">'+
 '<div class="metric"><div class="metric-top"><b>'+open+'</b><span class="micro trend">live</span></div><span>Open actions</span></div>'+
 '<div class="metric"><div class="metric-top"><b>3</b><span class="micro">24h</span></div><span>Changed relationships</span></div>'+
 '<div class="metric"><div class="metric-top"><b>'+review+'</b><span class="micro">human</span></div><span>Reconciliation review</span></div>'+
 '<div class="metric"><div class="metric-top"><b>'+(state.workspace.capacityWeekly-state.workspace.usedCapacity)+'</b><span class="micro">of '+state.workspace.capacityWeekly+'</span></div><span>Weekly slots remaining</span></div></div>'+
 '<div class="layout"><div class="panel"><div class="panel-head"><h3>Priority work</h3><span>Why now → next action</span></div><div class="panel-body">'+state.people.filter(p=>p.status==="OPEN").slice(0,4).map(row).join("")+'</div></div>'+
 '<div class="panel"><div class="panel-head"><h3>What changed</h3><span>Latest signals</span></div><div class="panel-body">'+state.signals.slice(0,4).map(s=>'<div class="signal"><div class="signal-top"><b>'+s.person+'</b><time>'+s.time+'</time></div><p>'+s.text+'</p></div>').join("")+'</div></div></div>'
}
function work(){
 setHead("My Work","A live queue, not a static task list.");
 view.innerHTML='<div class="panel"><div class="panel-head"><h3>Action Queue</h3><span>Sorted by current priority</span></div><table><thead><tr><th>Person</th><th>State</th><th>Why now</th><th>Action</th><th>Status</th></tr></thead><tbody>'+[...state.people].sort((a,b)=>a.priority-b.priority).map(p=>'<tr class="click" onclick="openPerson(\''+p.id+'\')"><td><b>'+p.name+'</b><div class="small">'+p.company+'</div></td><td>'+pill(p)+'</td><td>'+p.why+'</td><td>'+p.action+'</td><td>'+p.status+'</td></tr>').join("")+'</tbody></table></div>'
}
function people(){
 setHead("People","Persistent relationship memory across the workspace.");
 view.innerHTML='<div class="panel"><div class="panel-head"><h3>Relationship Memory</h3><span>'+state.people.length+' synthetic people</span></div><table><thead><tr><th>Person</th><th>Company</th><th>Relationship state</th><th>Current action</th></tr></thead><tbody>'+state.people.map(p=>'<tr class="click" onclick="openPerson(\''+p.id+'\')"><td><b>'+p.name+'</b><div class="small">'+p.title+'</div></td><td>'+p.company+'</td><td>'+pill(p)+'</td><td>'+p.action+'</td></tr>').join("")+'</tbody></table></div>'
}
function signals(){
 setHead("Signals","Meaningful changes, separated from raw activity.");
 view.innerHTML='<div class="panel"><div class="panel-head"><h3>Recent signals</h3><span>Evidence-backed changes</span></div><div class="panel-body">'+state.signals.map(s=>'<div class="signal"><div class="signal-top"><b>'+s.person+'</b><time>'+s.time+'</time></div><p>'+s.text+'</p></div>').join("")+'</div></div>'
}
function reconciliation(){
 setHead("Reconciliation","Ambiguity stops for human review instead of silently contaminating memory.");
 const p=state.people.find(x=>x.state==="AMBIGUOUS_IDENTITY");
 view.innerHTML=p?'<div class="panel"><div class="panel-head"><h3>Identity review</h3><span class="state AMBIGUOUS_IDENTITY">Human review required</span></div><div class="identity-grid"><div class="identity-side"><div class="callout"><b>'+p.name+'</b><br>'+p.summary+'</div><div class="evidence">'+p.evidence.map(e=>'<div>• '+e+'</div>').join("")+'</div></div><div class="identity-side"><h4>Candidate memory</h4><div class="memory">'+p.memory.map(m=>'<div><b>'+m[0]+'</b><span>'+m[1]+'</span></div>').join("")+'</div><p><button class="btn primary" onclick="resolveIdentity(\''+p.id+'\')">Confirm same person</button></p></div></div></div>':'<div class="panel empty">No reconciliation items. Reset the demo to restore the identity-review scenario.</div>'
}
function audit(){
 setHead("Audit","See how Thread arrived at a state or recommendation.");
 view.innerHTML='<div class="panel"><div class="panel-head"><h3>Decision & state audit</h3><span>Latest events first</span></div><table><thead><tr><th>Time</th><th>Actor</th><th>Event</th><th>Detail</th></tr></thead><tbody>'+state.audit.map(a=>'<tr><td>'+a.time+'</td><td>'+a.actor+'</td><td><code>'+a.event+'</code></td><td>'+a.detail+'</td></tr>').join("")+'</tbody></table></div>'
}
function openPerson(id){
 const p=state.people.find(x=>x.id===id);if(!p)return;
 setHead("Relationship","One shared thread of context, evidence, and action.");
 view.innerHTML='<div class="toolbar"><button class="back" onclick="render(\'home\')">← Back to Today</button><span class="demo-status">'+(p.id==="maya"?"Featured state-transition demo":"Synthetic relationship record")+'</span></div>'+
 (p.changed?'<div class="banner">State transition complete: the inbound reply updated Relationship Memory and superseded the stale follow-up.</div>':'')+
 '<div class="detail"><div class="avatar">'+p.initials+'</div><div><h2>'+p.name+'</h2><div class="meta">'+p.title+" · "+p.company+'</div><div class="detail-state">'+pill(p)+'</div></div><div class="actions">'+
 (p.id==="maya"&&!p.changed?'<button class="btn primary" onclick="simulateMaya()">Simulate new inbound reply</button>':p.id==="maya"&&p.changed?'<button class="btn" onclick="resetDemo()">Replay demo</button>':'')+
 '<button class="btn">Snooze</button><button class="btn">Add note</button></div></div>'+
 '<div class="detail-grid"><div><div class="card"><div class="card-title"><h3>Thread brief</h3><span class="ai-label">AI-ASSISTED</span></div><div class="brief">'+p.summary+'</div><div class="evidence">'+p.evidence.map(e=>'<div>✓ '+e+'</div>').join("")+'</div></div>'+
 '<div class="card" style="margin-top:12px"><div class="card-title"><h3>Interaction timeline</h3><span class="small">durable event history</span></div><div class="timeline">'+p.timeline.map(t=>'<div class="tl"><b>'+t[0]+" · "+t[1]+'</b><p>'+t[2]+'</p></div>').join("")+'</div></div></div>'+
 '<div><div class="card"><div class="card-title"><h3>Relationship Memory</h3><span class="small">persistent context</span></div><div class="memory">'+p.memory.map(m=>'<div><b>'+m[0]+'</b><span>'+m[1]+'</span></div>').join("")+'</div></div>'+
 '<div class="card" style="margin-top:12px"><div class="card-title"><h3>Current action</h3><span class="small">'+p.status+'</span></div><div class="action-box"><div><b>'+p.action+'</b><div class="small">'+p.why+'</div></div>'+pill(p)+'</div></div></div></div>'
}
function simulateMaya(){
 const p=state.people.find(x=>x.id==="maya");
 p.changed=true;p.action="Review latest reply";p.why="New inbound reply superseded scheduled follow-up";
 p.summary="Maya replied. She remains interested but wants confirmation that Thread can sit beside the existing CRM. The previous follow-up recommendation is no longer valid.";
 p.timeline.unshift(["Just now","Inbound reply","Asked for a side-by-side CRM deployment approach."]);
 p.evidence=["New inbound message received","Scheduled follow-up superseded","CRM concern repeated","Human response required"];
 state.signals.unshift({person:"Maya Chen",text:"Inbound reply superseded the previous follow-up recommendation.",time:"Just now"});
 state.audit.unshift({time:"Now",actor:"Rules",event:"action.superseded",detail:"Old Maya follow-up invalidated after inbound event"});
 state.audit.unshift({time:"Now",actor:"Memory",event:"relationship.updated",detail:"Maya Chen context recomputed from the new interaction"});
 save();openPerson("maya")
}
function resolveIdentity(id){
 const p=state.people.find(x=>x.id===id);if(!p)return;
 p.state="ACTIVE_CONVERSATION";p.label="Active conversation";p.action="Review relationship";p.status="OPEN";p.why="Identity confirmed by human";
 state.audit.unshift({time:"Now",actor:"Human",event:"identity.override.confirmed",detail:p.name+" confirmed as same person after domain change"});
 save();reconciliation()
}
function resetDemo(){localStorage.removeItem(KEY);location.reload()}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>render(b.dataset.view));
$("#reset").onclick=resetDemo;
render("home");