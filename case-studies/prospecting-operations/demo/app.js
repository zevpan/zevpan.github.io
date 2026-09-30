const SAMPLE_BATCH = {
  id: "IMPORT-042",
  name: "LinkedIn export bundle · sample",
  status: "READY",
  sample: true,
  files: [
    {name:"Connections.csv", type:"Connections", rows:[
      { "First Name":"Avery","Last Name":"Goh","Company":"Lumen Works","Position":"Operations Lead","URL":"https://www.linkedin.com/in/sample-avery"},
      { "First Name":"Sarah","Last Name":"Lim","Company":"Vector Labs","Position":"VP Customer Success","URL":"https://www.linkedin.com/in/sample-sarah"},
      { "First Name":"Maya","Last Name":"Chen","Company":"Arcadia Systems","Position":"Head of Operations","URL":"https://www.linkedin.com/in/sample-maya"},
      { "First Name":"Priya","Last Name":"Nair","Company":"Helix Advisory","Position":"COO","URL":"https://www.linkedin.com/in/sample-priya-new"}
    ]},
    {name:"Invitations.csv", type:"Invitations", rows:[
      {Direction:"OUTBOUND", inviteeProfileUrl:"https://www.linkedin.com/in/sample-avery", "Sent At":"2026-09-28"},
      {Direction:"ACCEPTED", inviteeProfileUrl:"https://www.linkedin.com/in/sample-avery", "Sent At":"2026-09-30"}
    ]},
    {name:"Messages.csv", type:"Messages", rows:[
      {Direction:"INBOUND", "From":"Maya Chen", "Sender Profile URL":"https://www.linkedin.com/in/sample-maya", Date:"2026-09-30", Subject:"Re: workflow context"},
      {Direction:"OUTBOUND", "From":"Zev Pan", "Recipient Profile URL":"https://www.linkedin.com/in/sample-daniel", Date:"2026-09-29", Subject:"Follow-up"},
      {Direction:"INBOUND", "From":"Unknown sender", "Sender Profile URL":"", Date:"2026-09-30", Subject:"New conversation"}
    ]}
  ]
};

const SEED = {
  batch: SAMPLE_BATCH,
  people: [
    {id:"P-1042",name:"Maya Chen",title:"Head of Operations",company:"Arcadia Systems",url:"https://www.linkedin.com/in/sample-maya",state:"OUTBOUND_LAST",lastInteraction:"12 Sep · Outbound message",nextAction:"Follow-up due",source:"Connections Raw",dnc:false,notes:"Discussed manual reconciliation; asked for an integration approach."},
    {id:"P-1091",name:"Daniel Wong",title:"Commercial Director",company:"Northstar Freight",url:"https://www.linkedin.com/in/sample-daniel",state:"RECONNECT_DUE",lastInteraction:"02 Sep · Reconnect requested",nextAction:"Review reconnect",source:"People Master",dnc:false,notes:"Asked to reconnect after budget review."},
    {id:"P-1130",name:"Sarah Lim",title:"VP Customer Success",company:"Vector Labs",url:"https://www.linkedin.com/in/sample-sarah",state:"OPPORTUNITY",lastInteraction:"16 Sep · Meeting note",nextAction:"Review opportunity",source:"Interaction Log",dnc:false,notes:"Mentioned a consolidation project and asked about handoff continuity."},
    {id:"P-1188",name:"Priya Nair",title:"COO",company:"Helix Advisory",url:"",state:"IDENTITY_REVIEW",lastInteraction:"Today · Match conflict",nextAction:"Resolve identity",source:"Connections Raw",dnc:false,notes:"A new profile resembles this record, but its profile URL and company context differ."}
  ],
  interactions: [
    {id:"I-3081",personId:"P-1042",date:"12 Sep",channel:"LinkedIn",direction:"Outbound",type:"Message",summary:"Shared a workflow example; no newer response in the master record."},
    {id:"I-3095",personId:"P-1091",date:"02 Sep",channel:"LinkedIn",direction:"Inbound",type:"Reconnect request",summary:"Requested a follow-up after budget review."},
    {id:"I-3122",personId:"P-1130",date:"16 Sep",channel:"Meeting note",direction:"Internal",type:"Opportunity signal",summary:"Asked how teams preserve context across handoffs."}
  ],
  actions: [
    {id:"ACT-2201",personId:"P-1042",type:"LinkedIn follow-up",reason:"Outbound message is still the latest recorded interaction; follow-up window is open.",suggested:"Review the follow-up draft against the latest relationship context.",confidence:"Medium",status:"OPEN",due:"Due today",evidence:["Latest interaction: outbound message on 12 Sep","No newer inbound event in People Master","No Do Not Contact flag"]},
    {id:"ACT-2202",personId:"P-1091",type:"Reconnect",reason:"A reconnect date was recorded after the contact requested later follow-up.",suggested:"Review the reconnect context before contacting.",confidence:"High",status:"OPEN",due:"Reconnect date reached",evidence:["Reconnect request recorded on 02 Sep","No later interaction in the imported history"]},
    {id:"ACT-2203",personId:"P-1130",type:"Opportunity review",reason:"A meeting note contains a project signal that needs human qualification.",suggested:"Review the project timing and decide whether to advance the opportunity.",confidence:"Medium",status:"OPEN",due:"Review needed",evidence:["Consolidation project mentioned","Human qualification required"]}
  ],
  runs: [],
  audit: [
    {time:"Before sample run",actor:"Source record",event:"follow_up.open",detail:"ACT-2201 is based on the existing People Master and Interaction Log."}
  ],
  sequence: 42,
  runResult: null,
  currentView:"workspace",
  selectedPerson:null,
  selectedAction:null,
  search:""
};
let state = structuredClone(SEED);
const $ = selector => document.querySelector(selector);
const view = $("#view");
const title = $("#title");
const subtitle = $("#subtitle");
const escapeHTML = value => String(value == null ? "" : value).replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
const titleCase = value => String(value || "").toLowerCase().replace(/(^|[_\s])\w/g, match => match.toUpperCase()).replace(/_/g," ");
const personFor = id => state.people.find(person => person.id === id);
function setHead(text, sub){title.textContent=text;subtitle.textContent=sub;}
function safeStatus(text){return '<span class="state-chip">'+escapeHTML(titleCase(text))+'</span>';}
function initials(name){return String(name||"?").split(/\s+/).map(x=>x[0]||"").join("").slice(0,2).toUpperCase();}
function setView(name){state.currentView=name;state.selectedPerson=null;state.selectedAction=null;render();}
function render(){
  document.querySelectorAll(".nav").forEach(button=>button.classList.toggle("active",button.dataset.view===state.currentView));
  $("#capacityPill").textContent=(state.batch.sample?"Sample scenario · no messages sent":"Local data · no messages sent");
  const route={workspace:workspace,imports:imports,runs:runs,people:people,actions:actions,evidence:evidence,audit:audit};
  (route[state.currentView]||workspace)();
  const search=$("#globalSearch");
  if(search && search.value!==state.search)search.value=state.search;
}
function workflowSteps(){
  const complete=state.batch.status==="COMPLETE";
  const steps=[
    ["01","Import exports",state.batch.files.length+" files · "+state.batch.files.reduce((n,f)=>n+f.rows.length,0)+" rows",true],
    ["02","Run reconciliation",complete?"Completed · "+state.runs[0].id:"Ready to process",complete],
    ["03","Update relationship data",complete?"People Master + Interaction Log updated":"Waiting for run",complete],
    ["04","Refresh next actions",complete?"Queue reconciled from new events":"Waiting for run",complete]
  ];
  return '<div class="process-steps">'+steps.map((step,i)=>'<div class="process-step '+(step[3]?"complete":"")+'"><div class="process-top"><span class="step-no">'+step[0]+'</span><span class="step-mark">'+(step[3]?"✓":"·")+'</span></div><b>'+step[1]+'</b><span>'+step[2]+'</span>'+(i<steps.length-1?'<span class="step-connector" aria-hidden="true"></span>':'')+'</div>').join("")+'</div>';
}
function batchSummary(){
 const total=state.batch.files.reduce((n,f)=>n+f.rows.length,0);
 return '<div class="batch-top"><div><div class="eyebrow">CURRENT IMPORT BATCH · '+escapeHTML(state.batch.id)+'</div><h2>'+escapeHTML(state.batch.name)+'</h2><p>'+state.batch.files.map(file=>escapeHTML(file.name)+" · "+file.rows.length+" rows").join(" &nbsp; / &nbsp; ")+'</p></div><span class="status-pill '+(state.batch.status==="COMPLETE"?"done":"ready")+'">'+(state.batch.status==="COMPLETE"?"Processed":"Ready to process")+'</span></div><div class="batch-bottom"><span>'+total+' source rows · files stay in this browser</span>'+(state.batch.status==="READY"?'<button class="btn primary" onclick="runFlow()">Run reconciliation flow</button>':'<button class="btn" onclick="setView(\'runs\')">Open run details</button>')+'</div>';
}
function workspace(){
 setHead("Prospecting workspace","Move exported network and message data through reconciliation, relationship records, and next actions.");
 const active=state.actions.filter(action=>action.status==="OPEN");
 view.innerHTML='<div class="workspace-shell"><section class="work-main"><div class="panel batch-panel">'+batchSummary()+'</div>'+workflowSteps()+(state.runResult?resultPanel(): '')+'<div class="panel flow-panel"><div class="panel-head"><h3>Processing rules</h3><span>Sample run · deterministic controls + simulated analysis</span></div><div class="rule-flow"><div><b>Match</b><span>Profile URL first; uncertain matches are held for review.</span></div><div><b>Reconcile</b><span>New events are compared with the latest relationship record.</span></div><div><b>Control</b><span>Do Not Contact and human review take precedence.</span></div><div><b>Recommend</b><span>Suggested actions include a reason and source evidence.</span></div></div></div></section><aside class="work-side"><div class="panel"><div class="panel-head"><h3>Next actions</h3><button class="text-button" onclick="setView(\'actions\')">Open queue</button></div><div class="side-list">'+(active.length?active.slice(0,3).map(actionRow).join(""):'<p class="empty">No actions need review.</p>')+'</div></div><div class="panel side-panel"><div class="panel-head"><h3>Relationship data</h3><button class="text-button" onclick="setView(\'people\')">Open People Master</button></div><div class="entity-count"><b>'+state.people.length+'</b><span>sample people</span></div><p>People Master · Interaction Log · Follow-up Analysis · Action Queue</p></div></aside></div>';
}
function resultPanel(){
 const r=state.runResult;
 return '<div class="run-result"><div class="result-head"><div><span class="eyebrow">RUN RESULT · '+escapeHTML(r.id)+'</span><h2>Data reconciled. Work queue refreshed.</h2></div><button class="btn" onclick="setView(\'runs\')">View run record</button></div><div class="result-grid"><div><b>'+r.newPeople+'</b><span>new profiles</span></div><div><b>'+r.updatedPeople+'</b><span>profiles updated</span></div><div><b>'+r.heldIdentity+'</b><span>identity review</span></div><div><b>'+r.superseded+'</b><span>stale actions superseded</span></div></div><p>'+escapeHTML(r.note)+'</p><div class="result-links"><button class="text-button" onclick="setView(\'people\')">Review People Master</button><button class="text-button" onclick="setView(\'actions\')">Review next actions</button></div></div>';
}
function actionRow(action){
 const person=personFor(action.personId);
 return '<button class="queue-item" onclick="openAction(\''+escapeHTML(action.id)+'\')"><span class="priority-dot '+(action.confidence==="High"?"high":"")+'"></span><span class="queue-copy"><b>'+escapeHTML(action.type)+'</b><span>'+escapeHTML(person?person.name:"Unmatched interaction")+' · '+escapeHTML(action.due)+'</span></span><span class="queue-state">'+escapeHTML(action.status==="OPEN"?"Review":"Waiting")+'</span></button>';
}
function imports(){
 setHead("Imports","Review incoming LinkedIn exports before they change your relationship records.");
 const total=state.batch.files.reduce((n,f)=>n+f.rows.length,0);
 view.innerHTML='<div class="page-actions"><div><span class="eyebrow">INCOMING DATA</span><h2>Import batch</h2><p>Upload CSV exports or load the synthetic example. Files are parsed in this browser and are not uploaded.</p></div><label class="btn file-button">Choose CSV exports<input id="fileInput" type="file" accept=".csv,text/csv" multiple></label></div><div class="panel import-card"><div class="batch-top"><div><div class="eyebrow">'+(state.batch.sample?"SYNTHETIC SAMPLE":"LOCAL CSV IMPORT")+' · '+escapeHTML(state.batch.id)+'</div><h2>'+escapeHTML(state.batch.name)+'</h2><p>'+total+' rows across '+state.batch.files.length+' files</p></div><span class="status-pill '+(state.batch.status==="COMPLETE"?"done":"ready")+'">'+(state.batch.status==="COMPLETE"?"Processed":"Ready to process")+'</span></div><div class="file-list">'+state.batch.files.map(fileCard).join("")+'</div><div class="import-footer"><button class="btn" onclick="loadSampleBatch()">Load synthetic example</button>'+(state.batch.status==="READY"?'<button class="btn primary" onclick="runFlow()">Run reconciliation flow</button>':'<button class="btn" onclick="setView(\'runs\')">View processed run</button>')+'</div></div><div class="import-note"><b>Source handling</b><span>Connection, invitation, and message files enter the same run. The workflow links profiles, appends interaction events, holds ambiguous identity matches, and recalculates eligible next actions. This public demo uses a synthetic run; it does not connect to LinkedIn or n8n.</span></div>';
 const input=$("#fileInput");if(input)input.addEventListener("change",event=>uploadFiles(event.target.files));
}
function fileCard(file){
 return '<div class="file-row"><span class="file-icon">CSV</span><div><b>'+escapeHTML(file.name)+'</b><span>'+escapeHTML(file.type)+' export</span></div><strong>'+file.rows.length+' rows</strong><span class="file-check">Ready</span></div>';
}
function uploadFiles(files){
 if(!files||!files.length)return;
 const selected=Array.from(files);
 Promise.all(selected.map(async file=>{
   if(file.size>10*1024*1024)throw new Error(file.name+" is over the 10 MB demo limit.");
   const parsed=parseCSV(await file.text());
   if(!parsed.headers.length||!parsed.rows.length)throw new Error(file.name+" has no readable CSV rows.");
   return {name:file.name,type:detectType(file.name,parsed.headers),headers:parsed.headers,rows:parsed.rows};
 })).then(parsed=>{
   state.batch={id:"LOCAL-"+String(Date.now()).slice(-6),name:"Local CSV export batch",status:"READY",sample:false,files:parsed};
   state.runResult=null;state.currentView="imports";state.audit.unshift({time:"Just now",actor:"Operator",event:"import.received",detail:parsed.length+" CSV file(s) parsed in this browser; "+parsed.reduce((n,f)=>n+f.rows.length,0)+" rows."});render();
 }).catch(error=>{window.alert(error.message);});
}
function parseCSV(text){
 const rows=[];let row=[],cell="",quoted=false;
 for(let i=0;i<text.length;i++){
   const c=text[i];
   if(c==='"'&&quoted&&text[i+1]==='"'){cell+='"';i++;}
   else if(c==='"')quoted=!quoted;
   else if(c===","&&!quoted){row.push(cell);cell="";}
   else if((c==="\n"||c==="\r")&&!quoted){if(c==="\r"&&text[i+1]==="\n")i++;row.push(cell);if(row.some(x=>x.trim()!==""))rows.push(row);row=[];cell="";}
   else cell+=c;
 }
 if(cell!==""||row.length){row.push(cell);if(row.some(x=>x.trim()!==""))rows.push(row);}
 if(rows.length<2)return {headers:[],rows:[]};
 const headers=rows.shift().map(x=>x.replace(/^\uFEFF/,"").trim());
 return {headers,rows:rows.map(values=>Object.fromEntries(headers.map((key,index)=>[key,(values[index]||"").trim()])))};
}
function detectType(filename,headers){
 const source=(filename+" "+headers.join(" ")).toLowerCase();
 if(source.includes("conversation id")||source.includes("sender profile url")||filename.toLowerCase().includes("message"))return "Messages";
 if(source.includes("inviterprofileurl")||source.includes("inviteeprofileurl")||filename.toLowerCase().includes("invitation"))return "Invitations";
 return "Connections";
}
function getField(row,names){
 const entries=Object.keys(row||{});for(const name of names){const target=String(name).toLowerCase().replace(/[^a-z0-9]/g,"");const found=entries.find(key=>key.toLowerCase().replace(/[^a-z0-9]/g,"")===target);if(found&&row[found])return String(row[found]).trim();}return "";
}
function runs(){
 setHead("Flow runs","See what each import changed, what it held, and which recommendations it produced.");
 const records=state.runs.length?state.runs:'';
 view.innerHTML='<div class="page-actions"><div><span class="eyebrow">EXECUTION HISTORY</span><h2>Reconciliation runs</h2><p>Every run ties its source files to record changes, exceptions, and action outcomes.</p></div>'+(state.batch.status==="READY"?'<button class="btn primary" onclick="runFlow()">Run ready batch</button>':'<button class="btn" onclick="setView(\'imports\')">Open imports</button>')+'</div>'+(records?'<div class="run-list">'+state.runs.map(runCard).join("")+'</div>':'<div class="panel empty-panel"><h3>No runs in this browser session yet</h3><p>Process the ready sample batch to see row matching, relationship updates, identity holds, and queue reconciliation recorded together.</p><button class="btn primary" onclick="runFlow()">Run sample workflow</button></div>')+(state.runResult?'<div class="panel run-steps-panel"><div class="panel-head"><h3>Run steps · '+escapeHTML(state.runResult.id)+'</h3><span>all stages recorded</span></div><ol class="run-steps">'+state.runResult.steps.map(step=>'<li><span class="step-check">✓</span><div><b>'+escapeHTML(step[0])+'</b><span>'+escapeHTML(step[1])+'</span></div></li>').join("")+'</ol></div>':'');
}
function runCard(run){
 return '<button class="run-card" onclick="showRun(\''+escapeHTML(run.id)+'\')"><span class="run-icon">✓</span><span><b>'+escapeHTML(run.id)+' · '+escapeHTML(run.name)+'</b><span>'+escapeHTML(run.time)+' · '+run.rows+' rows · '+run.fileCount+' source files</span></span><span class="run-status">'+escapeHTML(run.status)+'</span></button>';
}
function showRun(id){const found=state.runs.find(run=>run.id===id);if(found){state.runResult=found.result;state.currentView="runs";render();}}
function people(){
 setHead("People Master","Review the current relationship record, its source links, interaction history, and next action.");
 const needle=state.search.toLowerCase();
 const rows=state.people.filter(p=>!needle||(p.name+" "+p.company+" "+p.state).toLowerCase().includes(needle));
 if(state.selectedPerson){personDetail(state.selectedPerson);return;}
 view.innerHTML='<div class="page-actions"><div><span class="eyebrow">CANONICAL RELATIONSHIP RECORDS</span><h2>'+rows.length+' people in this sample workspace</h2><p>New exports reconcile against these records; uncertain identity matches stay visible for review.</p></div><button class="btn" onclick="exportPeople()">Export People Master CSV</button></div><div class="panel"><div class="table-wrap"><table class="data-table"><thead><tr><th>Person</th><th>Company</th><th>Relationship state</th><th>Last interaction</th><th>Next action</th><th></th></tr></thead><tbody>'+rows.map(personRow).join("")+'</tbody></table></div></div>';
}
function personRow(person){
 return '<tr><td><button class="person-link" onclick="openPerson(\''+escapeHTML(person.id)+'\')"><span class="avatar">'+escapeHTML(initials(person.name))+'</span><span><b>'+escapeHTML(person.name)+'</b><small>'+escapeHTML(person.title)+'</small></span></button></td><td>'+escapeHTML(person.company)+'</td><td>'+safeStatus(person.state)+(person.dnc?'<span class="flag">Suppressed</span>':'')+'</td><td>'+escapeHTML(person.lastInteraction)+'</td><td>'+escapeHTML(person.nextAction)+'</td><td><button class="text-button" onclick="openPerson(\''+escapeHTML(person.id)+'\')">Open record</button></td></tr>';
}
function openPerson(id){state.selectedPerson=id;state.selectedAction=null;state.currentView="people";render();}
function personDetail(id){
 const person=personFor(id);if(!person){state.selectedPerson=null;people();return;}
 const history=state.interactions.filter(item=>item.personId===id);
 const related=state.actions.filter(item=>item.personId===id);
 view.innerHTML='<button class="back-link" onclick="state.selectedPerson=null;render()">← People Master</button><div class="record-head"><span class="avatar large">'+escapeHTML(initials(person.name))+'</span><div><span class="eyebrow">PERSON RECORD · '+escapeHTML(person.id)+'</span><h2>'+escapeHTML(person.name)+'</h2><p>'+escapeHTML(person.title)+' · '+escapeHTML(person.company)+'</p></div><button class="btn" onclick="toggleDNC(\''+escapeHTML(person.id)+'\')">'+(person.dnc?"Remove suppression":"Set Do Not Contact")+'</button></div><div class="workspace-grid record-grid"><div class="panel"><div class="panel-head"><h3>Interaction Log</h3><span>'+history.length+' events</span></div><div class="timeline">'+history.slice().reverse().map(event=>'<div class="timeline-item"><b>'+escapeHTML(event.date)+' · '+escapeHTML(event.direction)+' '+escapeHTML(event.type)+'</b><span>'+escapeHTML(event.summary)+'</span><small>Source: '+escapeHTML(event.source||"Interaction Log")+'</small></div>').join("")+'</div></div><div class="panel"><div class="panel-head"><h3>Relationship context</h3><span>source linked</span></div><div class="record-facts"><div><small>Current state</small><b>'+escapeHTML(titleCase(person.state))+'</b></div><div><small>Last source</small><b>'+escapeHTML(person.source)+'</b></div><div><small>Next action</small><b>'+escapeHTML(person.nextAction)+'</b></div><div><small>Do Not Contact</small><b>'+(person.dnc?"Yes":"No")+'</b></div><div class="wide"><small>Operator notes</small><p>'+escapeHTML(person.notes||"No notes recorded.")+'</p></div></div><h3 class="subhead">Related actions</h3><div class="side-list">'+(related.length?related.map(actionRow).join(""):'<p class="empty">No actions linked to this record.</p>')+'</div></div></div>';
}
function actions(){
 setHead("Next actions","Recommendations are tied to record state and source evidence; external messages stay under human control.");
 if(state.selectedAction){actionDetail(state.selectedAction);return;}
 const open=state.actions.filter(action=>action.status==="OPEN");
 const waiting=state.actions.filter(action=>action.status!=="OPEN");
 view.innerHTML='<div class="page-actions"><div><span class="eyebrow">HUMAN REVIEW QUEUE</span><h2>'+open.length+' recommendations need review</h2><p>Review context, adjust the proposed next step, and record the outcome. Nothing is sent from this demo.</p></div><button class="btn" onclick="exportActions()">Export Action Queue CSV</button></div><div class="action-groups"><section><h3>Ready for review</h3><div class="action-cards">'+(open.length?open.map(actionCard).join(""):'<div class="panel empty-panel">No open recommendations.</div>')+'</div></section><section><h3>Completed, snoozed, or superseded</h3><div class="panel history-panel">'+(waiting.length?waiting.map(actionHistoryRow).join(""):'<p class="empty">Action history appears here after a decision or new interaction.</p>')+'</div></section></div>';
}
function actionCard(action){
 const person=personFor(action.personId);
 return '<article class="action-card"><div class="action-card-top"><span class="priority-tag">'+escapeHTML(action.confidence)+' confidence</span><span>'+escapeHTML(action.due)+'</span></div><h3>'+escapeHTML(action.type)+' · '+escapeHTML(person?person.name:"Identity review")+'</h3><p>'+escapeHTML(action.reason)+'</p><div class="action-evidence"><b>Evidence</b>'+action.evidence.map(item=>'<span>• '+escapeHTML(item)+'</span>').join("")+'</div><div class="action-controls"><button class="btn primary" onclick="openAction(\''+escapeHTML(action.id)+'\')">Review recommendation</button><button class="text-button" onclick="resolveAction(\''+escapeHTML(action.id)+'\',\'SNOOZED\')">Snooze</button><button class="text-button" onclick="resolveAction(\''+escapeHTML(action.id)+'\',\'CANCELLED\')">Dismiss</button></div></article>';
}
function actionHistoryRow(action){
 const person=personFor(action.personId);
 return '<div class="history-row"><span><b>'+escapeHTML(action.type)+'</b><small>'+escapeHTML(person?person.name:"Record")+' · '+escapeHTML(action.reason)+'</small></span>'+safeStatus(action.status)+'</div>';
}
function openAction(id){state.selectedAction=id;state.selectedPerson=null;state.currentView="actions";render();}
function actionDetail(id){
 const action=state.actions.find(item=>item.id===id);if(!action){state.selectedAction=null;actions();return;}
 const person=personFor(action.personId);
 view.innerHTML='<button class="back-link" onclick="state.selectedAction=null;render()">← Next actions</button><div class="action-review"><div class="action-review-head"><div><span class="eyebrow">RECOMMENDATION · '+escapeHTML(action.id)+'</span><h2>'+escapeHTML(action.type)+'</h2><p>'+escapeHTML(person?person.name:"Unmatched event")+' · '+escapeHTML(person?person.company:"Needs identity review")+' · '+escapeHTML(action.due)+'</p></div><span class="priority-tag">'+escapeHTML(action.confidence)+' confidence</span></div><div class="workspace-grid"><div class="panel"><div class="panel-head"><h3>Why this is here</h3><span>evidence-linked</span></div><p class="detail-reason">'+escapeHTML(action.reason)+'</p><div class="action-evidence">'+action.evidence.map(item=>'<span>• '+escapeHTML(item)+'</span>').join("")+'</div></div><div class="panel"><div class="panel-head"><h3>Suggested next step</h3><span>operator decides</span></div><p class="detail-reason">'+escapeHTML(action.suggested)+'</p><label class="field-label" for="outcome">Decision note</label><textarea id="outcome" rows="3" placeholder="Record what you decided"></textarea><div class="action-controls"><button class="btn primary" onclick="resolveAction(\''+escapeHTML(action.id)+'\',\'DONE\')">Record complete</button><button class="btn" onclick="resolveAction(\''+escapeHTML(action.id)+'\',\'SNOOZED\')">Snooze</button><button class="btn danger" onclick="resolveAction(\''+escapeHTML(action.id)+'\',\'CANCELLED\')">Dismiss</button></div><p class="privacy-note">This records a local demo outcome. It does not send or schedule a message.</p></div></div></div>';
}
function resolveAction(id,status){
 const action=state.actions.find(item=>item.id===id);if(!action||action.status!=="OPEN")return;
 const note=$("#outcome")?$("#outcome").value.trim():"";
 action.status=status;action.outcome=note||(status==="DONE"?"Operator reviewed":"");
 if(status==="DONE")action.outcome=note||"Completed in demo";
 if(status==="SNOOZED")action.due="Snoozed · revisit later";
 state.audit.unshift({time:"Just now",actor:"Operator",event:"action."+status.toLowerCase(),detail:action.id+" · "+action.type+" · "+action.outcome});
 state.selectedAction=null;state.currentView="actions";render();
}
function toggleDNC(id){
 const person=personFor(id);if(!person)return;person.dnc=!person.dnc;
 if(person.dnc)state.actions.filter(action=>action.personId===id&&action.status==="OPEN").forEach(action=>{action.status="BLOCKED";action.outcome="Blocked by Do Not Contact";});
 state.audit.unshift({time:"Just now",actor:"Operator",event:person.dnc?"suppression.applied":"suppression.removed",detail:person.name+" · Do Not Contact "+(person.dnc?"enabled":"disabled")});
 render();
}
function evidence(){
 setHead("Workbook evidence","The workbook grounds the entity model; the live run shown elsewhere uses synthetic sample records.");
 view.innerHTML='<div class="panel evidence-source"><h2>AI Employee — Prospect Database</h2><p>Counts use rows with a populated record ID and exclude the header. No prospect identities, links, contact details, or message content are shown.</p><div class="table-wrap"><table class="data-table"><thead><tr><th>Tab</th><th>Records</th><th>Observed data</th></tr></thead><tbody><tr><td>People Master</td><td>5,542</td><td>Relationship State and Next Action are blank throughout; 1 Do Not Contact flag is true.</td></tr><tr><td>Follow-up Analysis</td><td>827</td><td>770 FOLLOW_UP · 57 NO_FOLLOW_UP.</td></tr><tr><td>Action Queue</td><td>250</td><td>212 DONE · 36 CANCELLED · 2 SNOOZED; all LINKEDIN_FOLLOW_UP.</td></tr></tbody></table></div><h3>Follow-up analysis</h3><p><b>Conversation state:</b> 750 NO_REPLY_TO_OUTREACH · 48 STALLED_WARM_CONVERSATION · 10 NATURAL_CLOSE · 11 DECLINED · 8 RECONNECT_LATER.</p><p><b>Priority:</b> 43 HIGH · 703 MEDIUM · 81 LOW.</p><h3>Operational fields</h3><p><b>People Master:</b> Relationship State, Last Interaction Date, Last Action, Next Action, Next Action Due, Follow-up Stage, Follow-up Override.</p><p><b>Follow-up Analysis:</b> Decision, Reason, Confidence, Conversation State, Follow-up Priority, Follow-up Angle, Analyzed At, Model.</p><p><b>Action Queue:</b> Due Date, Priority, Agent, Action Type, Why This Action, Suggested Action, Suggested Message, Status, Completed At, Outcome.</p><div class="callout blue"><strong>Limit of the evidence</strong><p>This workbook snapshot does not reveal n8n triggers or execution steps. The run and resulting recommendations are simulated, and are not represented as a live connection to LinkedIn, Google Sheets, or n8n.</p></div></div>';
}
function runFlow(){
 if(state.batch.status==="COMPLETE"){state.currentView="runs";render();return;}
 const batch=state.batch;let result;
 if(batch.sample)result=runSampleFlow();
 else result=runUploadedFlow(batch);
 batch.status="COMPLETE";batch.processedRun=result.id;
 state.runResult=result;state.runs.unshift({id:result.id,name:batch.name,time:"Just now",rows:batch.files.reduce((n,file)=>n+file.rows.length,0),fileCount:batch.files.length,status:"Completed",result:result});
 state.audit.unshift({time:"Just now",actor:"Workflow",event:"reconciliation.completed",detail:result.id+" · "+result.note});
 state.currentView="workspace";state.selectedPerson=null;state.selectedAction=null;render();
}
function runSampleFlow(){
 const maya=state.people.find(person=>person.id==="P-1042");
 const prior=state.actions.find(action=>action.personId==="P-1042"&&action.status==="OPEN");
 if(prior){prior.status="SUPERSEDED";prior.outcome="New inbound message arrived in the imported Messages export.";state.audit.unshift({time:"Just now",actor:"Reconciliation",event:"action.superseded",detail:prior.id+" · newer inbound interaction"});}
 state.interactions.unshift({id:"I-3220",personId:"P-1042",date:"Just now",channel:"LinkedIn",direction:"Inbound",type:"Message",summary:"New reply received in the sample Messages export; asks about fitting alongside the existing CRM.",source:"Messages.csv"});
 maya.state="ACTIVE_CONVERSATION";maya.lastInteraction="Just now · Inbound LinkedIn message";maya.nextAction="Review inbound reply";maya.source="Messages.csv";
 const avery={id:"P-1214",name:"Avery Goh",title:"Operations Lead",company:"Lumen Works",url:"https://www.linkedin.com/in/sample-avery",state:"NEW_CONNECTION",lastInteraction:"Today · Connection accepted",nextAction:"Review fit before outreach",source:"Connections.csv",dnc:false,notes:"New connection from the sample exports; no outreach has been sent."};
 state.people.push(avery);
 state.interactions.unshift({id:"I-3221",personId:avery.id,date:"Today",channel:"LinkedIn",direction:"System",type:"Connection accepted",summary:"Connection state imported; human fit review remains before any outreach.",source:"Invitations.csv"});
 const unresolved=state.people.find(person=>person.id==="P-1188");unresolved.state="IDENTITY_REVIEW";unresolved.nextAction="Review imported profile match";
 state.actions.unshift({id:"ACT-2240",personId:"P-1042",type:"Review inbound reply",reason:"A newer inbound message makes the scheduled follow-up stale.",suggested:"Read the reply and decide whether a human response is appropriate.",confidence:"High",status:"OPEN",due:"New reply · review",evidence:["Inbound message imported from Messages.csv","Earlier follow-up moved to SUPERSEDED","No response has been sent"]});
 state.actions.unshift({id:"ACT-2241",personId:avery.id,type:"Review new connection",reason:"A newly accepted connection has no interaction history or confirmed business fit.",suggested:"Check fit and relationship context before choosing whether to contact.",confidence:"Medium",status:"OPEN",due:"New connection",evidence:["Connection status updated from Invitations.csv","No conversation history matched","Human decision required before outreach"]});
 state.audit.unshift({time:"Just now",actor:"Identity review",event:"identity.held",detail:"A similar name with a changed profile URL remains unresolved."});
 state.sequence++;
 return {id:"RUN-"+String(state.sequence).padStart(3,"0"),newPeople:1,updatedPeople:2,heldIdentity:1,superseded:prior?1:0,rows:9,fileCount:3,status:"Completed",note:"One new person, two profile updates, three interaction events, and one identity exception were reconciled. Two next actions were added for human review.",steps:[["Read source exports","Connections 4 · Invitations 2 · Messages 3 rows"],["Resolve identities","2 matched · 1 new profile · 1 held for review"],["Update relationship records","People Master updated · Interaction Log appended"],["Reconcile existing actions","1 stale follow-up superseded by the new inbound message"],["Recalculate next actions","2 recommendations added · no messages sent"]]};
}
function runUploadedFlow(batch){
 let newPeople=0,updatedPeople=0,heldIdentity=0,interactionsAdded=0,superseded=0,actionsAdded=0;
 batch.files.forEach(file=>{
   file.rows.forEach(row=>{
     if(file.type==="Connections"){
       const first=getField(row,["First Name","firstName"]),last=getField(row,["Last Name","lastName"]),name=(first+" "+last).trim()||getField(row,["Name","Full Name"]);
       if(!name){heldIdentity++;return;}
       const url=getField(row,["URL","LinkedIn URL","Normalized URL","Profile URL"]);
       const company=getField(row,["Company","Normalized Company"]);
       const existing=url?state.people.find(person=>person.url&&person.url.toLowerCase()===url.toLowerCase()):null;
       if(existing){existing.title=getField(row,["Position","Current Title"])||existing.title;existing.company=company||existing.company;existing.source=file.name;updatedPeople++;}
       else if(url){
         const person={id:"P-"+String(1300+state.people.length),name:name,title:getField(row,["Position","Current Title"])||"Title not provided",company:company||"Company not provided",url:url,state:"NEW_CONNECTION",lastInteraction:"Connection export imported",nextAction:"Review fit before outreach",source:file.name,dnc:false,notes:"Imported locally from "+file.name+"; business fit has not been reviewed."};
         state.people.push(person);newPeople++;
         state.actions.unshift({id:"ACT-"+String(2300+state.actions.length),personId:person.id,type:"Review new connection",reason:"A new profile was imported without an existing relationship record.",suggested:"Review fit and context before deciding on outreach.",confidence:"Low",status:"OPEN",due:"Imported connection",evidence:["Profile URL available in "+file.name,"No matched interaction history","Human decision required"]});actionsAdded++;
       }else heldIdentity++;
     }else if(file.type==="Messages"){
       const direction=getField(row,["Direction"]).toUpperCase();
       const profile=getField(row,["Sender Profile URL","senderProfileUrl","Recipient Profile URL","recipientProfileUrl"]);
       const person=profile?state.people.find(item=>item.url&&item.url.toLowerCase()===profile.toLowerCase()):null;
       if(!person||!["INBOUND","OUTBOUND","INCOMING","OUTGOING"].includes(direction)){heldIdentity++;return;}
       const inbound=direction==="INBOUND"||direction==="INCOMING";const date=getField(row,["Date","Timestamp"]);
       state.interactions.unshift({id:"I-"+String(3300+state.interactions.length),personId:person.id,date:date||"Imported",channel:"LinkedIn",direction:inbound?"Inbound":"Outbound",type:"Message",summary:(inbound?"Inbound":"Outbound")+" message imported; content remains in the local source file.",source:file.name});interactionsAdded++;
       if(inbound){
         person.state="ACTIVE_CONVERSATION";person.lastInteraction=(date||"Today")+" · Inbound LinkedIn message";person.nextAction="Review inbound reply";
         const stale=state.actions.find(action=>action.personId===person.id&&action.status==="OPEN"&&action.type.toLowerCase().includes("follow"));
         if(stale){stale.status="SUPERSEDED";stale.outcome="New inbound interaction imported.";superseded++;}
         if(!state.actions.some(action=>action.personId===person.id&&action.status==="OPEN"&&action.type.includes("inbound"))){
           state.actions.unshift({id:"ACT-"+String(2400+state.actions.length),personId:person.id,type:"Review inbound reply",reason:"A new inbound message changes the latest relationship context.",suggested:"Review the conversation and decide on a human response.",confidence:"High",status:"OPEN",due:"New reply · review",evidence:["Inbound direction present in export","Prior open follow-up checked for staleness","No message sent by this demo"]});actionsAdded++;
         }
       }
     }else{
       const profile=getField(row,["inviteeProfileUrl","inviteeProfileURL","Normalized URL","URL"]);
       const person=profile?state.people.find(item=>item.url&&item.url.toLowerCase()===profile.toLowerCase()):null;
       const direction=getField(row,["Direction"]).toUpperCase();
       if(person&&direction){const inbound=direction.includes("ACCEPT")||direction==="INBOUND";person.state=inbound?"NEW_CONNECTION":person.state;person.lastInteraction=(getField(row,["Sent At","Timestamp"])||"Imported")+" · Invitation "+direction;person.source=file.name;interactionsAdded++;}
       else heldIdentity++;
     }
   });
 });
 const id="RUN-LOC-"+String(++state.sequence);
 const steps=[["Read uploaded exports",batch.files.map(file=>file.type+" "+file.rows.length).join(" · ")+" rows"],["Resolve identities",newPeople+" new · "+updatedPeople+" updated · "+heldIdentity+" held"],["Update relationship records","People Master reconciled · "+interactionsAdded+" interaction / invitation events recorded"],["Reconcile existing actions",superseded+" open follow-up(s) superseded by newer inbound events"],["Recalculate next actions",actionsAdded+" review task(s) created · no messages sent"]];
 return {id:id,newPeople:newPeople,updatedPeople:updatedPeople,heldIdentity:heldIdentity,superseded:superseded,rows:batch.files.reduce((n,file)=>n+file.rows.length,0),fileCount:batch.files.length,status:"Completed",note:"Local demo rules processed the uploaded rows in this browser. Unmatched or direction-unclear records remain held for review.",steps:steps};
}
function loadSampleBatch(){state.batch=structuredClone(SAMPLE_BATCH);state.runResult=null;state.currentView="imports";render();}
function csvEscape(value){return '"'+String(value==null?"":value).replace(/"/g,'""')+'"';}
function downloadCSV(filename,headers,rows){
 const csv=[headers,...rows].map(row=>row.map(csvEscape).join(",")).join("\r\n");
 const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8"});const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=filename;link.click();URL.revokeObjectURL(url);
}
function exportPeople(){downloadCSV("people-master-demo.csv",["Person ID","Name","Title","Company","Relationship State","Last Interaction Date","Next Action","Source","Do Not Contact"],state.people.map(p=>[p.id,p.name,p.title,p.company,p.state,p.lastInteraction,p.nextAction,p.source,p.dnc]));}
function exportActions(){downloadCSV("action-queue-demo.csv",["Action ID","Person","Action Type","Why This Action","Suggested Action","Confidence","Status","Outcome"],state.actions.map(a=>{const p=personFor(a.personId);return[a.id,p?p.name:"",a.type,a.reason,a.suggested,a.confidence,a.status,a.outcome||""];}));}
function audit(){
 setHead("Audit trail","Follow the source event, record update, recommendation, and human decision.");
 view.innerHTML='<div class="panel"><div class="panel-head"><h3>Activity history</h3><span>'+state.audit.length+' events</span></div><div class="audit-list">'+state.audit.map(entry=>'<div class="audit-row"><time>'+escapeHTML(entry.time)+'</time><b>'+escapeHTML(entry.actor)+'</b><code>'+escapeHTML(entry.event)+'</code><span>'+escapeHTML(entry.detail)+'</span></div>').join("")+'</div></div>';
}
function resetDemo(){state=structuredClone(SEED);render();}
document.querySelectorAll(".nav").forEach(button=>button.addEventListener("click",()=>setView(button.dataset.view)));
$("#reset").addEventListener("click",resetDemo);
$("#globalSearch").addEventListener("input",event=>{state.search=event.target.value;if(state.currentView==="people")people();});
$("#globalSearch").addEventListener("keydown",event=>{if(event.key==="Escape"){event.target.value="";state.search="";if(state.currentView==="people")people();}});
render();

