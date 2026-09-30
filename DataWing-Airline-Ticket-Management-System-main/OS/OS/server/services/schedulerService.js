// ══════════════════════════════════════════════════════
//  DataWing Scheduler Service — All 6 CPU Scheduling
//  Algorithms applied to Airline Task Processing
// ══════════════════════════════════════════════════════
"use strict";

// Clone tasks and add scheduling fields
function clone(tasks) {
  return tasks.map((t,i) => ({ ...t, id: t.id||`T${i+1}`, remaining: t.burst, firstRun: -1, completion: 0 }));
}

function mergeSegs(s) {
  if (!s.length) return [];
  const out = [{ ...s[0] }];
  for (let i=1;i<s.length;i++) {
    const last = out[out.length-1];
    if (s[i].id === last.id && s[i].start === last.end) last.end = s[i].end;
    else out.push({ ...s[i] });
  }
  return out;
}

function buildResults(tasks, schedule) {
  const results = tasks.map(t => ({
    id: t.id, label: t.label||t.id,
    arrival: t.arrival, burst: t.burst, priority: t.priority||3,
    completion: t.completion,
    turnaround: t.completion - t.arrival,
    waiting:    t.completion - t.arrival - t.burst,
    response:   t.firstRun - t.arrival
  }));
  return { schedule, results };
}

function computeStats(results, schedule) {
  const n = results.length;
  if (!n) return { awt:0, atat:0, art:0, cpuUtil:0, throughput:0, n:0 };
  const awt  = results.reduce((s,r)=>s+r.waiting,0)/n;
  const atat = results.reduce((s,r)=>s+r.turnaround,0)/n;
  const art  = results.reduce((s,r)=>s+r.response,0)/n;
  const totalBurst = results.reduce((s,r)=>s+r.burst,0);
  const makespan   = schedule.length ? Math.max(...schedule.map(s=>s.end)) : 1;
  return { awt, atat, art, cpuUtil: (totalBurst/makespan)*100, throughput: n/makespan, n };
}

// ── FCFS ──
function fcfs(tasks) {
  const ts = clone(tasks).sort((a,b)=>a.arrival-b.arrival);
  const sc=[]; let t=0;
  for(const p of ts){
    if(t<p.arrival) t=p.arrival;
    p.firstRun=t;
    sc.push({id:p.id,label:p.label||p.id,start:t,end:t+p.burst});
    t+=p.burst; p.completion=t;
  }
  return buildResults(ts,sc);
}

// ── SJF Non-Preemptive ──
function sjf(tasks) {
  const ts=clone(tasks); const sc=[]; let t=0; const done=new Set();
  while(done.size<ts.length){
    const av=ts.filter(p=>p.arrival<=t&&!done.has(p.id));
    if(!av.length){t++;continue;}
    av.sort((a,b)=>a.burst-b.burst||a.arrival-b.arrival);
    const p=av[0]; if(p.firstRun<0)p.firstRun=t;
    sc.push({id:p.id,label:p.label||p.id,start:t,end:t+p.burst});
    t+=p.burst; p.completion=t; done.add(p.id);
  }
  return buildResults(ts,sc);
}

// ── SRTF ──
function srtf(tasks) {
  const ts=clone(tasks); const sc=[]; let t=0,lp=null,ss=0; const done=new Set();
  while(done.size<ts.length){
    const av=ts.filter(p=>p.arrival<=t&&!done.has(p.id));
    if(!av.length){t++;continue;}
    av.sort((a,b)=>a.remaining-b.remaining||a.arrival-b.arrival);
    const p=av[0]; if(p.firstRun<0)p.firstRun=t;
    if(p.id!==lp){if(lp!==null)sc.push({id:lp,label:ts.find(x=>x.id===lp)?.label||lp,start:ss,end:t});ss=t;lp=p.id;}
    p.remaining--;t++;
    if(p.remaining===0){p.completion=t;done.add(p.id);}
  }
  if(lp!==null)sc.push({id:lp,label:ts.find(x=>x.id===lp)?.label||lp,start:ss,end:t});
  return buildResults(ts,mergeSegs(sc));
}

// ── Round Robin ──
function roundRobin(tasks, quantum=2) {
  const ts=clone(tasks).sort((a,b)=>a.arrival-b.arrival);
  const sc=[]; let t=0; const queue=[],enq=new Set(),done=new Set(); let i=0;
  while(i<ts.length&&ts[i].arrival<=t){queue.push(ts[i]);enq.add(ts[i].id);i++;}
  while(done.size<ts.length){
    if(!queue.length){t=ts[i].arrival;while(i<ts.length&&ts[i].arrival<=t){queue.push(ts[i]);enq.add(ts[i].id);i++;}continue;}
    const p=queue.shift(); if(p.firstRun<0)p.firstRun=t;
    const run=Math.min(p.remaining,quantum);
    sc.push({id:p.id,label:p.label||p.id,start:t,end:t+run});
    t+=run;p.remaining-=run;
    while(i<ts.length&&ts[i].arrival<=t){if(!enq.has(ts[i].id)){queue.push(ts[i]);enq.add(ts[i].id);}i++;}
    if(p.remaining===0){p.completion=t;done.add(p.id);}else queue.push(p);
  }
  return buildResults(ts,sc);
}

// ── Priority Non-Preemptive ──
function priorityNP(tasks) {
  const ts=clone(tasks); const sc=[]; let t=0; const done=new Set();
  while(done.size<ts.length){
    const av=ts.filter(p=>p.arrival<=t&&!done.has(p.id));
    if(!av.length){t++;continue;}
    av.sort((a,b)=>a.priority-b.priority||a.arrival-b.arrival);
    const p=av[0]; if(p.firstRun<0)p.firstRun=t;
    sc.push({id:p.id,label:p.label||p.id,start:t,end:t+p.burst});
    t+=p.burst;p.completion=t;done.add(p.id);
  }
  return buildResults(ts,sc);
}

// ── Priority Preemptive ──
function priorityPre(tasks) {
  const ts=clone(tasks); const sc=[]; let t=0,lp=null,ss=0; const done=new Set();
  while(done.size<ts.length){
    const av=ts.filter(p=>p.arrival<=t&&!done.has(p.id));
    if(!av.length){t++;continue;}
    av.sort((a,b)=>a.priority-b.priority||a.arrival-b.arrival);
    const p=av[0]; if(p.firstRun<0)p.firstRun=t;
    if(p.id!==lp){if(lp!==null)sc.push({id:lp,label:ts.find(x=>x.id===lp)?.label||lp,start:ss,end:t});ss=t;lp=p.id;}
    p.remaining--;t++;
    if(p.remaining===0){p.completion=t;done.add(p.id);}
  }
  if(lp!==null)sc.push({id:lp,label:ts.find(x=>x.id===lp)?.label||lp,start:ss,end:t});
  return buildResults(ts,mergeSegs(sc));
}

function dispatch(algo, tasks, quantum=2) {
  switch(algo){
    case 'fcfs':         return fcfs(tasks);
    case 'sjf':          return sjf(tasks);
    case 'srtf':         return srtf(tasks);
    case 'rr':           return roundRobin(tasks,quantum);
    case 'priority':     return priorityNP(tasks);
    case 'priority_pre': return priorityPre(tasks);
    default:             return fcfs(tasks);
  }
}

module.exports = { dispatch, computeStats, fcfs, sjf, srtf, roundRobin, priorityNP, priorityPre };
