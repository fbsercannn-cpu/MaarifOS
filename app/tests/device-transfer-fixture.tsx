import {createRoot} from 'react-dom/client';
import {useState} from 'react';
import {DeviceTransferGuide} from '../src/features/cloud-account/DeviceTransferGuide';
function Fixture(){
 const [disabled,setDisabled]=useState(false),[backup,setBackup]=useState<string|null>(null),[restore,setRestore]=useState<string|null>(null),[prepared,setPrepared]=useState(0),[selected,setSelected]=useState(0);
 Object.assign(window,{transferFixture:{setDisabled,setBackup,setRestore}});
 return <><DeviceTransferGuide disabled={disabled} lastBackupAt={backup} lastVerifiedRestoreAt={restore} onPrepareBackup={()=>setPrepared(v=>v+1)} onSelectBackup={()=>setSelected(v=>v+1)}/><output aria-label="Yedek alanına yönlendirme">{prepared}</output><output aria-label="Dosya seçme isteği">{selected}</output></>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
