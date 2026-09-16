import {useEffect,useState} from 'react';
import type {LocalDataStore} from '../../core/repository/contracts.ts';
import {loadClassDutyWeekSummary,type classDutyWeekSummary} from './class-duty-model.ts';
import './class-duty-week-card.css';
export function ClassDutyWeekCard({store,civilDate,refreshKey,onOpen}:{store:LocalDataStore;civilDate:string;refreshKey:unknown;onOpen:(kind:'fruit'|'child-of-week',scheduleId?:string)=>void}){
 const [rows,setRows]=useState<ReturnType<typeof classDutyWeekSummary>>([]),[error,setError]=useState('');
 useEffect(()=>{let active=true;void loadClassDutyWeekSummary(store,{civilDate}).then(result=>{if(active){setRows(result);setError('');}}).catch(()=>{if(active)setError('Haftanın görevleri okunamadı. Çizelgeyi açıp yenileyin.');});return()=>{active=false;};},[store,civilDate,refreshKey]);
 return <section className="simple-today-week-duties" aria-label="Bu haftanın sınıf görevleri"><h2>Bu hafta sınıfımda</h2>{(['fruit','child-of-week'] as const).map(kind=>{const selection=rows.filter(r=>r.kind===kind);return <button type="button" key={kind} onClick={()=>onOpen(kind,selection[0]?.scheduleId)}><strong>{kind==='fruit'?'Meyve günü':'Haftanın çocuğu'}</strong><span>{selection.length?selection.map(row=>`${row.studentName} · ${new Date(`${row.civilDate}T12:00:00Z`).toLocaleDateString('tr-TR',{day:'numeric',month:'short',timeZone:'UTC'})}`).join(' / '):'Bu haftanın dağılımını hazırla'}</span></button>;})}{error&&<p role="alert">{error}</p>}</section>;
}
