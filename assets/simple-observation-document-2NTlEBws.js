import{c as e,d as t}from"./pdf-preview-model-B_dFj9s2.js";import{i as n,n as r}from"./student-membership-CiGjqu65.js";import{n as i,r as a}from"./document-theme-D8MGIVrH.js";import{n as o}from"./semantic-tagged-pdf-l0RBSDHb.js";var s=`html`,c=`text/html;charset=utf-8`,l=`<!doctype html>`,u=`Europe/Istanbul`,d=/^\d{4}-\d{2}-\d{2}$/u,f=/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/iu,p=/(^|\D)[1-9]\d{10}(?!\d)/u,m=/(?:\+?90[\s().-]*)?0?5(?:[\s().-]*\d){9}(?!\d)/u,h=new TextEncoder;function g(e){return typeof e==`string`&&e.trim().length>0?e.trim():null}function _(e,t){let n=g(e);if(!n)throw Error(`${t} boş bırakılamaz.`);return n}function v(e){return e.replaceAll(`&`,`&amp;`).replaceAll(`<`,`&lt;`).replaceAll(`>`,`&gt;`).replaceAll(`"`,`&quot;`).replaceAll(`'`,`&#39;`)}function y(e){return e.normalize(`NFKC`).replace(/[\u0000-\u001f\u007f]/gu,`-`).replace(/[\\/:*?"<>|]/gu,`-`).replace(/\.{2,}/gu,`-`).replace(/^[.\s]+|[.\s]+$/gu,``).replace(/\s+/gu,`_`).replace(/-{2,}/gu,`-`).slice(0,64)||`Cocuk`}function b(e){if(!d.test(e))return!1;let t=new Date(`${e}T12:00:00.000Z`);return!Number.isNaN(t.getTime())&&t.toISOString().slice(0,10)===e}function x(e,t){if(!b(e))throw Error(`${t} geçerli bir YYYY-AA-GG tarihi olmalıdır.`);return e}function S(e){return new Intl.DateTimeFormat(`tr-TR`,{timeZone:u,day:`2-digit`,month:`2-digit`,year:`numeric`}).format(new Date(`${e}T12:00:00.000Z`))}function C(e){let t=new Date(e);if(Number.isNaN(t.getTime())||t.toISOString()!==e)throw Error(`Belge üretim zamanı UTC ISO-8601 biçiminde olmalıdır.`);let n=new Intl.DateTimeFormat(`en-CA`,{timeZone:u,year:`numeric`,month:`2-digit`,day:`2-digit`}).format(t);return{civilDate:n,displayDate:S(n)}}function w(e){return typeof e.deletedAt!=`string`}function T(e,t,r,i){return r&&i&&b(String(r.startDate))&&b(String(r.endDate))?n(e,{...t,academicYear:r,periodStart:i.startCivilDate,periodEnd:i.endCivilDate}):!w(e)||e.active===!1||e.enrollmentStatus===`left`||e.legacyAssignmentStatus===`needs-review`?!1:e.academicYearId===t.academicYearId&&e.classroomId===t.classroomId?!0:Array.isArray(e.enrollments)?e.enrollments.some(e=>{if(!e||typeof e!=`object`||Array.isArray(e))return!1;let n=e;return n.academicYearId===t.academicYearId&&n.classroomId===t.classroomId&&n.status===`active`&&n.endedOn===void 0}):!1}function E(e){return Array.isArray(e.studentIds)?e.studentIds.filter(e=>typeof e==`string`&&e.length>0):typeof e.studentId==`string`&&e.studentId?[e.studentId]:[]}function D(e,t,n,r,i){return e.map((e,t)=>({record:e,sourceIndex:t})).filter(({record:e})=>{let a=E(e);return w(e)&&e.academicYearId===t.academicYearId&&e.classroomId===t.classroomId&&a.length===1&&a[0]===n&&typeof e.civilDate==`string`&&b(e.civilDate)&&e.civilDate>=r.startCivilDate&&e.civilDate<=r.endCivilDate&&(!i||i(e.civilDate))&&g(e.rawText)!==null}).sort((e,t)=>String(e.record.civilDate).localeCompare(String(t.record.civilDate))||String(e.record.observedAt??e.record.createdAt).localeCompare(String(t.record.observedAt??t.record.createdAt))||e.sourceIndex-t.sourceIndex).map(({record:e})=>({civilDate:String(e.civilDate),displayDate:S(String(e.civilDate)),context:g(e.context),rawText:g(e.rawText),childQuote:g(e.childQuote)}))}function O(e){let t=[g(e.displayName),g(e.firstName),g(e.lastName),g(e.preferredName),g(e.optionalCode),g(e.nationalIdentityNumber)];if(Array.isArray(e.contacts))for(let n of e.contacts){if(!n||typeof n!=`object`||Array.isArray(n))continue;let e=n;t.push(g(e.name),g(e.phone),g(e.id))}return t.filter(e=>e!==null&&e.length>=2)}function k(e){let t=[...e.observations.flatMap(e=>[e.rawText,e.context,e.childQuote]),e.teacherSections.strengths,e.teacherSections.supportAreas,e.teacherSections.homeSuggestions].filter(e=>e!==null).join(`
`);if(!t)return;if(f.test(t))throw Error(`Gözlem belgesi teknik kayıt kimliği içerdiği için oluşturulamadı.`);let n=t.toLocaleLowerCase(`tr-TR`);if(e.students.filter(t=>t.id!==e.selectedStudentId).flatMap(O).some(e=>n.includes(e.toLocaleLowerCase(`tr-TR`))))throw Error(`Gözlem belgesi başka bir çocuğa ait bilgi içerdiği için oluşturulamadı.`);if(e.audience===`parent`&&(p.test(t)||m.test(t)))throw Error(`Veli gözlem belgesi kimlik veya telefon bilgisi içerdiği için oluşturulamadı.`)}function A(e){return e?`<div class="teacher-text">${v(e).replaceAll(`
`,`<br>`)}</div>`:`<div class="blank-lines" aria-label="Öğretmenin dolduracağı boş alan"><span></span><span></span><span></span></div>`}function j(e){return e.length===0?`<p class="empty-observation">Bu dönem için seçili çocuğa ait paylaşılabilir gözlem kaydı bulunmuyor.</p>`:e.map(e=>`<article class="observation-entry">
        <header>
          <time datetime="${v(e.civilDate)}">${v(e.displayDate)}</time>
          ${e.context?`<span>${v(e.context)}</span>`:``}
        </header>
        <p>${v(e.rawText).replaceAll(`
`,`<br>`)}</p>
        ${e.childQuote?`<blockquote><strong>Çocuğun sözü:</strong> ${v(e.childQuote).replaceAll(`
`,`<br>`)}</blockquote>`:``}
      </article>`).join(`
`)}function M(e){let t=e.audience===`parent`,n=t?`AİLE İLE PAYLAŞIM`:`İDAREYE SUNUM`,r=t?`ÇOCUK GÖZLEM ÖZETİ`:`ÖĞRENCİ GÖZLEM ÖZETİ`,i=t?``:`<p><strong>Öğrenci no:</strong> ${v(e.studentNumber??`—`)}</p>
       <p><strong>T.C. kimlik no:</strong> ${v(e.nationalIdentityNumber??`—`)}</p>`;return`${l}
<html lang="tr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="maarifos-generated-at" content="${v(e.generatedAt)}">
  <meta name="maarifos-civil-date" content="${v(e.generatedCivilDate)}">
  <title>${v(e.studentName)} · ${r}</title>
  <style>
    @page { size: A4 portrait; margin: 14mm; }
    :root { color-scheme: only light; font-family: Arial, "Helvetica Neue", sans-serif; color: #13243b; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: #fff; }
    body { font-size: 10pt; line-height: 1.48; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    main { width: 100%; margin: 0 auto; }
    .document-header { border-bottom: .7mm solid #176b5b; padding-bottom: 4mm; text-align: center; }
    .school-name { margin: 0 0 1.5mm; font-size: 12pt; font-weight: 700; }
    h1 { margin: 0; color: #10233e; font-size: 17pt; letter-spacing: .035em; }
    .audience { display: inline-block; margin-top: 2mm; padding: 1mm 3mm; border-radius: 99mm; background: #e2eee9; color: #145447; font-size: 8.5pt; font-weight: 700; letter-spacing: .05em; }
    .context { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 8mm; margin: 4mm 0; padding: 3mm 4mm; border: .25mm solid #b7c7c2; border-radius: 2mm; background: #f3f8f6; break-inside: avoid; page-break-inside: avoid; }
    .context p { margin: 0; overflow-wrap: anywhere; }
    .context strong { color: #154f45; }
    h2 { margin: 5mm 0 2mm; padding-bottom: 1.5mm; border-bottom: .25mm solid #b7c7c2; color: #154f45; font-size: 12pt; break-after: avoid; page-break-after: avoid; }
    .observation-entry { margin: 0 0 3mm; padding: 3mm 4mm; border: .25mm solid #c4cfcc; border-left: 1.2mm solid #448778; border-radius: 1.5mm; break-inside: avoid; page-break-inside: avoid; }
    .observation-entry header { display: flex; flex-wrap: wrap; gap: 2mm 4mm; align-items: baseline; margin-bottom: 1.5mm; color: #3f5751; }
    .observation-entry time { font-weight: 700; color: #173c35; }
    .observation-entry header span::before { content: "Bağlam: "; font-weight: 700; }
    .observation-entry p, blockquote { margin: 0; white-space: normal; overflow-wrap: anywhere; }
    blockquote { margin-top: 2mm; padding: 1.5mm 2.5mm; border-left: .6mm solid #aa94cf; background: #f7f3fc; }
    .empty-observation { min-height: 20mm; margin: 0; padding: 5mm; border: .25mm dashed #aebdb8; color: #566762; }
    .teacher-section { break-inside: avoid; page-break-inside: avoid; }
    .teacher-text { min-height: 18mm; padding: 3mm 4mm; border: .25mm solid #c4cfcc; border-radius: 1.5mm; white-space: normal; overflow-wrap: anywhere; }
    .blank-lines { min-height: 22mm; padding: 1mm 4mm; border: .25mm solid #c4cfcc; border-radius: 1.5mm; }
    .blank-lines span { display: block; height: 6mm; border-bottom: .2mm dotted #b5bfbc; }
    .document-footer { display: grid; grid-template-columns: 1fr 1fr; gap: 12mm; margin-top: 8mm; break-inside: avoid; page-break-inside: avoid; }
    .production { align-self: end; color: #44534f; }
    .signature { min-height: 26mm; text-align: center; }
    .signature strong { display: block; }
    .signature-name { min-height: 7mm; margin-top: 1.5mm; }
    .signature-line { width: 48mm; margin: 7mm auto 0; border-bottom: .3mm solid #233a34; }
    .signature-label { margin-top: 1.5mm; color: #596965; font-size: 8pt; }
    @media screen {
      html { background: #edf2f0; }
      body { max-width: 210mm; min-height: 297mm; margin: 8mm auto; padding: 14mm; box-shadow: 0 2mm 12mm rgb(20 45 38 / .15); }
    }
    @media screen and (max-width: 600px) {
      html { background: #fff; }
      body { width: 100%; min-height: 0; margin: 0; padding: 16px; box-shadow: none; font-size: 15px; line-height: 1.55; }
      .document-header { padding-bottom: 16px; }
      .school-name { margin-bottom: 6px; font-size: 16px; }
      h1 { font-size: 23px; line-height: 1.15; letter-spacing: .015em; }
      .audience { margin-top: 10px; padding: 5px 10px; font-size: 12px; }
      .context { grid-template-columns: minmax(0, 1fr); gap: 8px; margin: 16px 0; padding: 12px; }
      h2 { margin: 22px 0 10px; padding-bottom: 7px; font-size: 18px; line-height: 1.25; }
      .observation-entry, .teacher-text, .blank-lines { padding: 12px; }
      .observation-entry header { align-items: flex-start; gap: 5px 12px; }
      .document-footer { grid-template-columns: minmax(0, 1fr); gap: 24px; margin-top: 28px; }
      .production { margin: 0; }
    }
    @media print {
      body { width: auto; min-height: auto; }
      p, blockquote { orphans: 3; widows: 3; }
    }
  </style>
</head>
<body>
  <main aria-label="${r.toLocaleLowerCase(`tr-TR`)}">
    <header class="document-header">
      <p class="school-name">${v(e.schoolName)}</p>
      <h1>${r}</h1>
      <span class="audience">${n}</span>
    </header>
    <section class="context" aria-label="Belge bilgileri">
      <p><strong>Çocuğun adı soyadı:</strong> ${v(e.studentName)}</p>
      <p><strong>Sınıf:</strong> ${v(e.classroomName)}</p>
      <p><strong>Eğitim yılı:</strong> ${v(e.academicYearName)}</p>
      <p><strong>Gözlem dönemi:</strong> ${v(e.periodLabel)}</p>
      ${i}
    </section>
    <section aria-labelledby="observation-heading">
      <h2 id="observation-heading">Gözlem özeti · Öğretmenin kaynak kayıtları</h2>
      ${j(e.observations)}
    </section>
    <section class="teacher-section" aria-labelledby="strengths-heading">
      <h2 id="strengths-heading">Güçlü yönler</h2>
      ${A(e.teacherSections.strengths)}
    </section>
    <section class="teacher-section" aria-labelledby="support-heading">
      <h2 id="support-heading">Desteklenecek alan</h2>
      ${A(e.teacherSections.supportAreas)}
    </section>
    <section class="teacher-section" aria-labelledby="home-heading">
      <h2 id="home-heading">Evde öneri</h2>
      ${A(e.teacherSections.homeSuggestions)}
    </section>
    <footer class="document-footer">
      <p class="production"><strong>Belge tarihi:</strong> ${v(e.generatedDisplayDate)}</p>
      <section class="signature" aria-label="Öğretmen imza alanı">
        <strong>Okul Öncesi Öğretmeni</strong>
        <div class="signature-name">${v(e.teacherName)}</div>
        <div class="signature-line" aria-hidden="true"></div>
        <div class="signature-label">İmza</div>
      </section>
    </footer>
  </main>
</body>
</html>`}function N(e){if(e.audience!==`parent`&&e.audience!==`administration`)throw Error(`Gözlem belgesi hedefi veli veya idare olmalıdır.`);let t=_(e.schoolName,`Okul adı`),n=_(e.teacherName,`Öğretmen adı soyadı`),i=_(e.classroomName,`Sınıf adı`),a=_(e.academicYearName,`Eğitim yılı`),o=x(e.period.startCivilDate,`Gözlem dönemi başlangıcı`),l=x(e.period.endCivilDate,`Gözlem dönemi bitişi`);if(l<o)throw Error(`Gözlem dönemi bitişi başlangıçtan önce olamaz.`);let u=e.snapshot.academicYears.find(t=>t.id===e.scope.academicYearId&&w(t)&&t.status!==`archived`),d=e.snapshot.classrooms.find(t=>t.id===e.scope.classroomId&&t.academicYearId===e.scope.academicYearId&&w(t)&&t.status!==`archived`&&t.archiveStatus!==`archived`);if(!u||!d)throw Error(`Aktif sınıf ve eğitim yılı gözlem belgesi için doğrulanamadı.`);let f=g(d.name),p=g(u.name);if(f&&f!==i||p&&p!==a)throw Error(`Belge başlığı aktif sınıf ve eğitim yılı kaydıyla eşleşmelidir.`);let m=g(u.startDate),v=g(u.endDate);if(m&&b(m)&&o<m||v&&b(v)&&l>v)throw Error(`Gözlem dönemi aktif eğitim yılının içinde olmalıdır.`);let E=e.snapshot.students.find(t=>t.id===e.studentId);if(!E||!T(E,e.scope,u,e.period))throw Error(`Seçili çocuk aktif sınıf kapsamında doğrulanamadı.`);let O=g(E.displayName);if(!O)throw Error(`Seçili çocuğun adı gözlem belgesi için eksik.`);let A=Object.freeze({startCivilDate:o,endCivilDate:l,...g(e.period.label)?{label:g(e.period.label)}:{}}),j=g(A.label)??`${S(o)} – ${S(l)}`,N=e.generatedAt??new Date().toISOString(),{civilDate:P,displayDate:F}=C(N),I=D(e.snapshot.observations,e.scope,e.studentId,A,b(String(u.startDate))&&b(String(u.endDate))?t=>r(E,{...e.scope,academicYear:u,civilDate:t}).eligible:void 0),L={strengths:g(e.teacherSections?.strengths),supportAreas:g(e.teacherSections?.supportAreas),homeSuggestions:g(e.teacherSections?.homeSuggestions)};k({audience:e.audience,students:e.snapshot.students,selectedStudentId:e.studentId,observations:I,teacherSections:L});let R=M({audience:e.audience,schoolName:t,teacherName:n,classroomName:i,academicYearName:a,studentName:O,studentNumber:g(E.optionalCode),nationalIdentityNumber:g(E.nationalIdentityNumber),periodLabel:j,generatedAt:N,generatedCivilDate:P,generatedDisplayDate:F,observations:I,teacherSections:L}),z=e.audience===`parent`?`Aile`:`Idare`;return{format:s,audience:e.audience,fileName:`MaarifOS_Gozlem_Ozeti_${z}_${y(O)}_${o}_${l}.html`,mimeType:c,bytes:h.encode(R),html:R,observationCount:I.length,generatedAt:N,generatedCivilDate:P,period:A}}function P(e){let t=new Uint8Array(e.bytes.byteLength);return t.set(e.bytes),new Blob([t.buffer],{type:e.mimeType})}async function F(n,s={}){let c=N(n),l=n.snapshot.students.find(e=>e.id===n.studentId),u=n.snapshot.academicYears.find(e=>e.id===n.scope.academicYearId),d=s.fields??[`observations`,`strengths`,`supportAreas`,`homeSuggestions`],f=[{kind:`heading`,level:1,text:n.audience===`parent`?`AİLE GÖZLEM ÖZETİ`:`İDARE GÖZLEM ÖZETİ`},{kind:`paragraph`,tone:`meta`,text:`${n.schoolName}\n${n.classroomName} · ${n.academicYearName}`},{kind:`paragraph`,text:`Çocuğun adı soyadı: ${String(l.displayName)}\nDönem: ${n.period.startCivilDate} / ${n.period.endCivilDate}`}];if(n.audience===`administration`&&f.push({kind:`paragraph`,text:`Öğrenci no: ${String(l.optionalCode??`—`)}\nT.C. kimlik no: ${String(l.nationalIdentityNumber??`—`)}`}),d.includes(`observations`)){f.push({kind:`heading`,level:2,text:`Gözlem özeti · Öğretmenin kaynak kayıtları`});let e=D(n.snapshot.observations,n.scope,n.studentId,n.period,b(String(u.startDate))&&b(String(u.endDate))?e=>r(l,{...n.scope,academicYear:u,civilDate:e}).eligible:void 0);e.forEach(e=>f.push({kind:`paragraph`,tone:`meta`,text:`${e.displayDate}${e.context?` · ${e.context}`:``}`},{kind:`paragraph`,text:e.rawText},...e.childQuote?[{kind:`paragraph`,text:`Çocuğun sözü: ${e.childQuote}`}]:[])),e.length||f.push({kind:`paragraph`,text:`Bu dönemde kayıtlı gözlem bulunmuyor.`})}let p=[{id:`observations`,label:`Gözlem kayıtları`},{id:`strengths`,label:`Güçlü yönler`},{id:`supportAreas`,label:`Desteklenecek alan`},{id:`homeSuggestions`,label:`Evde öneri`}];for(let e of p.slice(1))if(d.includes(e.id)){let t=n.teacherSections?.[e.id];t?.trim()&&f.push({kind:`heading`,level:2,text:e.label},{kind:`paragraph`,text:t})}f.push({kind:`paragraph`,text:`Okul Öncesi Öğretmeni: ${n.teacherName}\nİmza: ____________________`});let m=await o({title:`MaarifOS Gözlem Özeti`,language:`tr-TR`,nodes:f,theme:s.appearance===`ink-saving`?a:i,includeTotalPages:!0,artifactHeaderOnFirstPage:!1,artifactHeaderText:`${String(l.displayName)} · ${n.classroomName} · ${n.period.startCivilDate} / ${n.period.endCivilDate}`},s.runtime),h=structuredClone({...n,generatedAt:c.generatedAt}),g=b(String(u.operationalStartDate))?String(u.operationalStartDate):String(u.startDate??n.period.startCivilDate),_=String(u.endDate??n.period.endCivilDate),v={supportsAppearance:!0,title:`${String(l.displayName)} · Gözlem özeti`,fields:p,fieldPresets:[{id:`source-notes`,label:`Yalnız gözlem kayıtları`,fields:[`observations`]}],students:[{id:n.studentId,label:String(l.displayName)}],period:{min:g,max:_},initial:{fields:d,studentIds:[n.studentId],periodStart:n.period.startCivilDate,periodEnd:n.period.endCivilDate},async build(e){return t(v,e),F({...h,period:{startCivilDate:e.periodStart,endCivilDate:e.periodEnd}},{...s,fields:e.fields,appearance:e.appearance})}};return e(m,v),{...c,format:`pdf`,mimeType:`application/pdf`,bytes:m,fileName:c.fileName.replace(/\.html$/u,`.pdf`)}}export{s as SIMPLE_OBSERVATION_DOCUMENT_FORMAT,c as SIMPLE_OBSERVATION_DOCUMENT_MIME_TYPE,l as SIMPLE_OBSERVATION_HTML_FILE_SIGNATURE,N as createSimpleObservationDocument,F as createSimpleObservationPdfDocument,P as simpleObservationDocumentBlob};