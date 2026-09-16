import { useState } from "react";
import { KeyboardInput, KeyboardTextarea } from "../../mobile";
import { DEFAULT_HOME_ADDRESS_PARTS, STUDENT_HOME_ADDRESS_LIMITS, formatStudentHomeAddress, type StudentHomeAddressParts } from "../../core/domain/student-home-address.ts";
import { studentProfileCopy } from "./student-profile-copy.ts";
import "./student-profile-entry.css";

export function StudentAddressField({ id, value, parts, disabled, onChange }: {
  id: string; value: string; parts?: StudentHomeAddressParts; disabled?: boolean;
  onChange(value: string, parts?: StudentHomeAddressParts): void;
}) {
  const [freeformSelected, setFreeformSelected] = useState(false);
  const freeform = freeformSelected || (!!value.trim() && !parts);
  const visibleParts = parts ?? DEFAULT_HOME_ADDRESS_PARTS;
  const streetTooLong = visibleParts.streetAddress.normalize("NFC").trim().replace(/\s+/gu, " ").length > STUDENT_HOME_ADDRESS_LIMITS.streetAddress;
  const changePart = (field: keyof StudentHomeAddressParts, nextValue: string) => {
    const nextParts = { ...visibleParts, [field]: nextValue };
    onChange(formatStudentHomeAddress(nextParts), nextParts);
  };
  const useStructured = () => {
    const nextParts = value.trim()
      ? { district: "", province: "", neighborhood: "", streetAddress: value }
      : { ...DEFAULT_HOME_ADDRESS_PARTS };
    setFreeformSelected(false);
    // Preserve an existing address without guessing which words are its town or city.
    if (value.trim()) onChange(formatStudentHomeAddress(nextParts), nextParts);
  };
  return <div className="student-address-field">
    {freeform ? <>
      <label htmlFor={id}>{studentProfileCopy.homeAddress}</label>
      <small id={`${id}-help`}>{studentProfileCopy.addressLegacyHelp}</small>
      <KeyboardTextarea id={id} value={value} disabled={disabled} maxLength={500} rows={3}
        aria-describedby={`${id}-help`} autoComplete="street-address"
        onChange={(event) => onChange(event.target.value, undefined)} />
      <button type="button" className="student-address-mode" disabled={disabled} onClick={useStructured}>
        {studentProfileCopy.addressUseStructured}
      </button>
    </> : <>
      <strong className="student-address-heading">{studentProfileCopy.homeAddress}</strong>
      <small id={`${id}-help`}>{studentProfileCopy.addressStructuredHelp}</small>
      <div className="student-address-parts">
        <div><label htmlFor={`${id}-district`}>{studentProfileCopy.addressDistrict}</label>
          <KeyboardInput id={`${id}-district`} value={visibleParts.district} disabled={disabled}
            maxLength={STUDENT_HOME_ADDRESS_LIMITS.district} autoComplete="address-level2"
            onChange={(event) => changePart("district", event.target.value)} /></div>
        <div><label htmlFor={`${id}-province`}>{studentProfileCopy.addressProvince}</label>
          <KeyboardInput id={`${id}-province`} value={visibleParts.province} disabled={disabled}
            maxLength={STUDENT_HOME_ADDRESS_LIMITS.province} autoComplete="address-level1"
            onChange={(event) => changePart("province", event.target.value)} /></div>
        <div><label htmlFor={`${id}-neighborhood`}>{studentProfileCopy.addressNeighborhood}</label>
          <KeyboardInput id={`${id}-neighborhood`} value={visibleParts.neighborhood} disabled={disabled}
            maxLength={STUDENT_HOME_ADDRESS_LIMITS.neighborhood} autoComplete="address-level3"
            onChange={(event) => changePart("neighborhood", event.target.value)} /></div>
        <div><label htmlFor={`${id}-street`}>{studentProfileCopy.addressStreet}</label>
          <KeyboardTextarea id={`${id}-street`} value={visibleParts.streetAddress} disabled={disabled}
            maxLength={STUDENT_HOME_ADDRESS_LIMITS.streetAddress} rows={2} autoComplete="street-address"
            onChange={(event) => changePart("streetAddress", event.target.value)} />
          {streetTooLong ? <small role="alert" className="student-address-error">{studentProfileCopy.addressStreetTooLong}</small> : null}</div>
      </div>
      {!visibleParts.district && !visibleParts.province ? <button type="button" className="student-address-mode"
        disabled={disabled} onClick={() => { const next = { ...visibleParts, district: DEFAULT_HOME_ADDRESS_PARTS.district,
          province: DEFAULT_HOME_ADDRESS_PARTS.province }; onChange(formatStudentHomeAddress(next), next); }}>
        {studentProfileCopy.addressUseDefaults}
      </button> : null}
      <label htmlFor={id}>{studentProfileCopy.homeAddress}</label>
      <small>{studentProfileCopy.addressPreview}</small>
      <KeyboardTextarea id={id} value={value} readOnly rows={3} className="student-address-preview"
        aria-describedby={`${id}-help`} />
      {value.length > 500 ? <small role="alert" className="student-address-error">{studentProfileCopy.addressTooLong}</small> : null}
      <button type="button" className="student-address-mode" disabled={disabled}
        onClick={() => { setFreeformSelected(true); onChange(value, undefined); }}>
        {studentProfileCopy.addressUseFreeform}
      </button>
    </>}
  </div>;
}
