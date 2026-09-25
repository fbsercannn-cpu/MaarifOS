import {useMemo,useState} from 'react';
import {KeyboardInput} from '../../mobile';
import type {ActivityStudioItem,ActivityStudioAgeBand} from '../activity-studio/activity-studio-model.ts';
import {alternativeActivities} from './assistant-tools.ts';
import './assistant-tools.css';

export function AlternativeActivityPanel({items,onAddToPlan,onOpenActivity,disabled=false}:{items:readonly ActivityStudioItem[];onAddToPlan:(id:string,ageBand:ActivityStudioAgeBand)=>void;onOpenActivity?:(id:string,ageBand:ActivityStudioAgeBand)=>void;disabled?:boolean}){
 const [ageBand,setAgeBand]=useState<ActivityStudioAgeBand|''>(''),[minutes,setMinutes]=useState('30'),[environment,setEnvironment]=useState<'inside'|'outside'|'any'>('inside'),[missing,setMissing]=useState<string[]>([]),[limit,setLimit]=useState(8);
 const materials=useMemo(()=>[...new Set(items.flatMap(item=>item.materials??[]))].sort((a,b)=>a.localeCompare(b,'tr-TR')),[items]);
 const results=useMemo(()=>alternativeActivities(items,{ageBand,maxMinutes:Number(minutes),environment,missingMaterials:missing}),[items,ageBand,minutes,environment,missing]);
 return <details className="assistant-tool" onToggle={()=>setLimit(8)}><summary>B planı bul</summary><p>Koşullar değiştiğinde katalogdan uygun bir alternatif seçin. Listeyi açmak planınızı değiştirmez.</p><div className="assistant-tool__filters">
  <label>Yaş grubu<select disabled={disabled} value={ageBand} onChange={e=>{setAgeBand(e.target.value as ActivityStudioAgeBand|'');setLimit(8);}}><option value="">Yaş grubunu seçin</option>{['36-48','48-60','60-72'].map(age=><option key={age} value={age}>{age} ay</option>)}</select></label>
  <label>Hazırlık dahil sürem (dakika)<KeyboardInput type="number" min={1} max={240} disabled={disabled} value={minutes} onChange={e=>{setMinutes(e.target.value);setLimit(8);}}/></label>
  <label>Kullanabileceğim ortam<select disabled={disabled} value={environment} onChange={e=>{setEnvironment(e.target.value as typeof environment);setLimit(8);}}><option value="inside">Kapalı alan</option><option value="outside">Bahçe</option><option value="any">Her ikisi</option></select></label>
  <label>Kullanamadığım malzemeyi ekle<select disabled={disabled} value="" onChange={e=>{if(e.target.value)setMissing(value=>[...new Set([...value,e.target.value])]);setLimit(8);}}><option value="">Malzeme seçin</option>{materials.filter(material=>!missing.includes(material)).map(material=><option key={material}>{material}</option>)}</select></label>
 </div>{missing.length>0&&<ul className="assistant-tool__chips">{missing.map(material=><li key={material}><button type="button" disabled={disabled} onClick={()=>setMissing(values=>values.filter(value=>value!==material))}>{material} · engeli kaldır</button></li>)}</ul>}
 <p role="status">{!ageBand?'Önce yaş grubunu seçin.':`${results.length} alternatif koşullarınıza uyuyor.`}</p><p>Malzeme eşleşmesi katalog adlarına dayanır. Süreler katalog tahminidir; uygulamadan önce malzemeleri ve yaş uyarlamasını inceleyin.</p>
 <ol className="assistant-tool__results">{results.slice(0,limit).map(({item,reason})=><li key={item.id}><strong>{item.title}</strong><p>{reason}</p><p>Malzemeler: {item.materials.join(', ')||'Katalogda malzeme gerekmiyor.'}</p><p>{item.ageAdaptations[ageBand as ActivityStudioAgeBand]}</p><div className="assistant-tool__actions">{onOpenActivity&&<button type="button" disabled={disabled} onClick={()=>onOpenActivity(item.id,ageBand as ActivityStudioAgeBand)}>Etkinliği incele</button>}<button type="button" disabled={disabled} onClick={()=>onAddToPlan(item.id,ageBand as ActivityStudioAgeBand)}>{item.title} · plana ekle</button></div></li>)}</ol>
 {results.length>limit&&<button type="button" onClick={()=>setLimit(n=>n+8)}>Daha fazla alternatif</button>}
 </details>;
}
