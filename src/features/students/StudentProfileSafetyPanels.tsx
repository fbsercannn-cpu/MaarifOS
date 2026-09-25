import {
  ChatBubbleIcon,
  HomeIcon,
  PersonIcon,
  PlusIcon,
  TrashIcon,
} from "@radix-ui/react-icons";
import { KeyboardInput, KeyboardTextarea } from "../../mobile";
import type {
  StudentCareDetails,
  StudentContact,
} from "../../core/domain/student.ts";
import { formatStudentPhone } from "../../core/domain/student.ts";
import {
  contactActionLinks,
  contactDisplayLabel,
} from "./student-profile-tools.ts";
import { studentFamilyFlagFields, studentProfileCopy } from "./student-profile-copy.ts";
import { ParentSurnameSuggestion } from "./ParentSurnameSuggestion.tsx";
import { StudentAddressField } from "./StudentAddressField.tsx";
import type { StudentHomeAddressParts } from "../../core/domain/student-home-address.ts";

export type StudentCareFormState = Required<Omit<StudentCareDetails, "homeAddressParts">> & Pick<StudentCareDetails, "homeAddressParts">;

type ContactPanelProps = {
  mode: "contacts";
  studentSurname: string;
  homeAddress: string;
  homeAddressParts?: StudentHomeAddressParts;
  onHomeAddressChange(value: string, parts?: StudentHomeAddressParts): void;
  contacts: StudentContact[];
  removedContact: StudentContact | null;
  onUpdateContact(contactId: string, update: Partial<StudentContact>): void;
  onSetPrimary(contactId: string, selected: boolean): void;
  onAddContact(): void;
  onRemoveContact(contactId: string): void;
  onUndoRemove(): void;
};

type CarePanelProps = {
  mode: "care";
  careDetails: StudentCareFormState;
  onHomeAddressChange(value: string, parts?: StudentHomeAddressParts): void;
  onCareDetailsChange(
    field: Exclude<keyof StudentCareFormState, "homeAddressParts">,
    value: StudentCareFormState[Exclude<keyof StudentCareFormState, "homeAddressParts">],
  ): void;
};

type FamilyPanelProps = {
  mode: "family";
  careDetails: StudentCareFormState;
  onCareDetailsChange(
    field: Exclude<keyof StudentCareFormState, "homeAddressParts">,
    value: StudentCareFormState[Exclude<keyof StudentCareFormState, "homeAddressParts">],
  ): void;
};

export type StudentProfileSafetyPanelsProps =
  | ContactPanelProps
  | CarePanelProps
  | FamilyPanelProps;

export function StudentProfileSafetyPanels(
  props: StudentProfileSafetyPanelsProps,
) {
  if (props.mode === "care") {
    const { careDetails, onCareDetailsChange } = props;
    return (
      <>
        <div className="student-profile-section-heading student-profile-section-heading--secondary">
          <div>
            <span className="d1-kicker">Sağlık ve güvenli teslim</span>
            <h3>Günlük güvenlik bilgileri</h3>
          </div>
          <HomeIcon aria-hidden="true" />
        </div>
        <p className="student-contact-intro">
          Yalnız öğretmenin gün içinde bilmesi gereken bilgileri yazın. Bu alanlar
          cihazda şifreli saklanır ve standart gözlem çıktısına eklenmez.
        </p>

        <label htmlFor="student-care-allergies">
          Bilinen alerjiler
          <small>Yoksa boş bırakın; bilinen tetikleyici ve gerekli önlemi yazın.</small>
        </label>
        <KeyboardTextarea
          id="student-care-allergies"
          value={careDetails.allergies}
          onChange={(event) =>
            onCareDetailsChange("allergies", event.target.value.slice(0, 500))
          }
          placeholder="Örn. fındık; temas ve tüketimden kaçınılmalı"
          rows={3}
        />

        <label htmlFor="student-care-dietary-needs">
          Beslenme gereksinimleri
          <small>Alerji dışındaki beslenme düzeni veya sınırlamalar</small>
        </label>
        <KeyboardTextarea
          id="student-care-dietary-needs"
          value={careDetails.dietaryNeeds}
          onChange={(event) =>
            onCareDetailsChange("dietaryNeeds", event.target.value.slice(0, 500))
          }
          placeholder="Örn. laktozsuz beslenme"
          rows={3}
        />

        <label htmlFor="student-care-medication-notes">
          İlaç ve uygulama notu
          <small>İlacın kendisini değil, okulda bilinmesi gereken talimatı kaydedin.</small>
        </label>
        <KeyboardTextarea
          id="student-care-medication-notes"
          value={careDetails.medicationNotes}
          onChange={(event) =>
            onCareDetailsChange("medicationNotes", event.target.value.slice(0, 500))
          }
          placeholder="Örn. veli yazılı bilgilendirmesine göre uygulanacak"
          rows={3}
        />

        <label htmlFor="student-care-emergency-notes">
          Acil durumda bilinmesi gerekenler
          <small>Öğretmenin hızlı kararını destekleyen kısa, uygulanabilir not</small>
        </label>
        <KeyboardTextarea
          id="student-care-emergency-notes"
          value={careDetails.emergencyNotes}
          onChange={(event) =>
            onCareDetailsChange("emergencyNotes", event.target.value.slice(0, 1_000))
          }
          placeholder="Örn. önce annesi, ulaşılamazsa acil kişi aranır"
          rows={4}
        />

        <div className="student-profile-form-grid">
          <label htmlFor="student-care-physician-name">
            Hekim / sağlık birimi
            <KeyboardInput
              id="student-care-physician-name"
              value={careDetails.physicianName}
              onChange={(event) =>
                onCareDetailsChange("physicianName", event.target.value.slice(0, 120))
              }
              placeholder="Adı soyadı veya kurum"
              autoComplete="off"
            />
          </label>
          <label htmlFor="student-care-physician-phone">
            Hekim telefonu
            <KeyboardInput
              id="student-care-physician-phone"
              type="tel"
              inputMode="tel"
              value={careDetails.physicianPhone}
              onChange={(event) =>
                onCareDetailsChange("physicianPhone", event.target.value.slice(0, 30))
              }
              placeholder="Telefon"
              autoComplete="tel"
            />
          </label>
        </div>

        <label htmlFor="student-care-medical-devices">
          Sağlık cihazı veya sürekli destek
          <small>Gözlük, işitme cihazı, acil destek ekipmanı gibi okulda bilinmesi gerekenler</small>
        </label>
        <KeyboardTextarea
          id="student-care-medical-devices"
          value={careDetails.medicalDevices}
          onChange={(event) =>
            onCareDetailsChange("medicalDevices", event.target.value.slice(0, 500))
          }
          placeholder="Yoksa boş bırakın"
          rows={3}
        />

        <StudentAddressField id="student-care-home-address" value={careDetails.homeAddress}
          parts={careDetails.homeAddressParts} onChange={props.onHomeAddressChange} />
      </>
    );
  }

  if (props.mode === "family") {
    const { careDetails, onCareDetailsChange } = props;
    return (
      <>
        <div className="student-profile-section-heading student-profile-section-heading--secondary">
          <div>
            <span className="d1-kicker">TYMM aile katılımı</span>
            <h3>Aile ihtiyaçları ve izin kayıtları</h3>
          </div>
          <PersonIcon aria-hidden="true" />
        </div>
        <p className="student-contact-intro">
          Ailenin tercihlerini ve okulda bulunan imzalı formları tek yerde izleyin.
          Buradaki işaretler izin vermek yerine, imzalı belgenin dosyada olduğunu kaydeder.
        </p>

        <fieldset className="student-contact-permissions">
          <legend>{studentProfileCopy.familySituation}</legend>
          <p className="student-contact-intro">{studentProfileCopy.familySituationHelp}</p>
          {studentFamilyFlagFields.map((field) => (
            <label className="student-contact-primary" key={field}>
              <input type="checkbox" checked={careDetails[field]}
                onChange={(event) => onCareDetailsChange(field, event.target.checked)} />
              {studentProfileCopy[field]}
            </label>
          ))}
        </fieldset>

        <label htmlFor="student-family-situation-notes">{studentProfileCopy.familySituationNotes}</label>
        <KeyboardTextarea id="student-family-situation-notes" rows={4}
          value={careDetails.familySituationNotes} maxLength={1_000}
          onChange={(event) => onCareDetailsChange("familySituationNotes", event.target.value)} />

        <label htmlFor="student-child-private-notes">
          {studentProfileCopy.privateNotes}
          <small>{studentProfileCopy.privateNotesHelp}</small>
        </label>
        <KeyboardTextarea id="student-child-private-notes" rows={6}
          value={careDetails.childPrivateNotes} maxLength={2_000}
          onChange={(event) => onCareDetailsChange("childPrivateNotes", event.target.value)} />

        <label htmlFor="student-family-email">
          Veli e-posta adresi
          <KeyboardInput
            id="student-family-email"
            type="email"
            value={careDetails.guardianEmail}
            onChange={(event) =>
              onCareDetailsChange("guardianEmail", event.target.value.slice(0, 254))
            }
            placeholder="veli@ornek.com"
            autoComplete="email"
          />
        </label>

        <label htmlFor="student-family-education-needs">
          Aile eğitimi ihtiyaçları
          <small>Ek 11 görüşmesini destekleyen konu ve ihtiyaç notları</small>
        </label>
        <KeyboardTextarea
          id="student-family-education-needs"
          value={careDetails.familyEducationNeeds}
          onChange={(event) =>
            onCareDetailsChange("familyEducationNeeds", event.target.value.slice(0, 1_000))
          }
          placeholder="Örn. olumlu sınır koyma, oyunla öğrenmeyi destekleme"
          rows={4}
        />

        <label htmlFor="student-family-participation-preferences">
          Aile katılım tercihleri
          <small>Ek 12 için uygun gün, saat, yöntem ve katkı biçimleri</small>
        </label>
        <KeyboardTextarea
          id="student-family-participation-preferences"
          value={careDetails.familyParticipationPreferences}
          onChange={(event) =>
            onCareDetailsChange(
              "familyParticipationPreferences",
              event.target.value.slice(0, 1_000),
            )
          }
          placeholder="Örn. cuma günleri çevrim içi görüşme; sınıf oyunlarına malzeme desteği"
          rows={4}
        />

        <fieldset className="student-contact-permissions">
          <legend>İmzalı izin formu dosyada</legend>
          <label className="student-contact-primary">
            <input
              type="checkbox"
              checked={careDetails.photoVideoPermissionOnFile}
              onChange={(event) =>
                onCareDetailsChange("photoVideoPermissionOnFile", event.target.checked)
              }
            />
            Fotoğraf / video kullanım formu
          </label>
          <label className="student-contact-primary">
            <input
              type="checkbox"
              checked={careDetails.fieldTripPermissionOnFile}
              onChange={(event) =>
                onCareDetailsChange("fieldTripPermissionOnFile", event.target.checked)
              }
            />
            Okul dışı gezi / öğrenme formu
          </label>
          <label className="student-contact-primary">
            <input
              type="checkbox"
              checked={careDetails.digitalCommunicationPermissionOnFile}
              onChange={(event) =>
                onCareDetailsChange(
                  "digitalCommunicationPermissionOnFile",
                  event.target.checked,
                )
              }
            />
            Dijital iletişim formu
          </label>
        </fieldset>

        <label htmlFor="student-family-permission-date">
          Formların son kontrol tarihi
          <KeyboardInput
            id="student-family-permission-date"
            type="date"
            value={careDetails.permissionFormDate}
            onChange={(event) =>
              onCareDetailsChange("permissionFormDate", event.target.value)
            }
          />
        </label>
        <p className="student-profile-privacy">
          Bu ekran hukuki onay formunun yerine geçmez; yalnız imzalı belgenin okul dosyasında
          bulunduğunu izler.
        </p>
      </>
    );
  }

  const {
    contacts,
    removedContact,
    onUpdateContact,
    onSetPrimary,
    onAddContact,
    onRemoveContact,
    onUndoRemove,
  } = props;
  return (
    <>
      <div className="student-profile-section-heading student-profile-section-heading--secondary">
        <div>
          <span className="d1-kicker">Aile ve yakınlar</span>
          <h3>İletişim ve teslim yetkileri</h3>
        </div>
        <ChatBubbleIcon aria-hidden="true" />
      </div>

      <p className="student-contact-intro">
        Anne, baba, bakıcı veya başka bir yakını ekleyin; acil iletişim ve teslim
        yetkisini kişi bazında açıkça işaretleyin.
      </p>
      <p className="student-contact-intro">{studentProfileCopy.contactOptional}</p>
      <StudentAddressField id="student-contacts-home-address" value={props.homeAddress}
        parts={props.homeAddressParts} onChange={props.onHomeAddressChange} />

      <div className="student-contact-editor">
        {contacts.map((contact) => {
          const contactLinks = contactActionLinks(contact.phone);
          return (
            <section className="student-contact-card" key={contact.id}
              aria-label={contact.kind === "mother" ? "Anne bilgileri" : contact.kind === "father" ? "Baba bilgileri" : "Üçüncü kişi bilgileri"}>
              <div className="student-contact-card-heading">
                <strong>
                  {contact.kind === "mother"
                    ? "Anne"
                    : contact.kind === "father"
                      ? "Baba"
                      : contact.relationship || "Diğer yakın"}
                </strong>
                {contact.isPrimary ? <span>Öncelikli</span> : null}
                {contact.kind === "other" ? (
                  <button
                    type="button"
                    onClick={() => onRemoveContact(contact.id)}
                    aria-label={`${contact.relationship || "Yakın"} iletişim kaydını kaldır`}
                  >
                    <TrashIcon aria-hidden="true" />
                  </button>
                ) : null}
              </div>

              {contact.kind === "other" ? (
                <label htmlFor={`student-contact-relationship-${contact.id}`}>
                  Yakınlığı / unvanı
                  <KeyboardInput
                    id={`student-contact-relationship-${contact.id}`}
                    value={contact.relationship}
                    onChange={(event) =>
                      onUpdateContact(contact.id, {
                        relationship: event.target.value.slice(0, 60),
                      })
                    }
                    placeholder="Örn. Dede, amca, bakıcı"
                    autoComplete="off"
                  />
                </label>
              ) : null}

              <label htmlFor={`student-contact-name-${contact.id}`}>
                Adı ve soyadı
                <KeyboardInput
                  id={`student-contact-name-${contact.id}`}
                  value={contact.name ?? ""}
                  onChange={(event) =>
                    onUpdateContact(contact.id, {
                      name: event.target.value.slice(0, 120),
                    })
                  }
                  placeholder="İsteğe bağlı"
                  autoComplete="name"
                />
              </label>

              <ParentSurnameSuggestion childLastName={props.studentSurname} parentName={contact.name ?? ""}
                kind={contact.kind} onApply={(name) => onUpdateContact(contact.id, { name })} />

              <label htmlFor={`student-contact-occupation-${contact.id}`}>
                {studentProfileCopy.occupation}
                <KeyboardInput id={`student-contact-occupation-${contact.id}`}
                  value={contact.occupation ?? ""} maxLength={120}
                  onChange={(event) => onUpdateContact(contact.id, { occupation: event.target.value })}
                  autoComplete="organization-title" />
              </label>

              <label htmlFor={`student-contact-phone-${contact.id}`}>
                Cep telefonu
                <KeyboardInput
                  id={`student-contact-phone-${contact.id}`}
                  type="tel"
                  inputMode="tel"
                  value={contact.phone}
                  onChange={(event) =>
                    onUpdateContact(contact.id, {
                      phone: formatStudentPhone(event.target.value),
                    })
                  }
                  placeholder="05xx xxx xx xx"
                  autoComplete="tel"
                />
              </label>

              <div className="student-contact-permissions" role="group" aria-label="İletişim ve teslim yetkileri">
                <label className="student-contact-primary">
                  <input
                    type="checkbox"
                    checked={contact.isPrimary}
                    onChange={(event) =>
                      onSetPrimary(contact.id, event.target.checked)
                    }
                  />
                  Öncelikli iletişim kişisi
                </label>
                <label className="student-contact-primary">
                  <input
                    type="checkbox"
                    checked={contact.isEmergencyContact === true}
                    onChange={(event) =>
                      onUpdateContact(contact.id, {
                        isEmergencyContact: event.target.checked,
                      })
                    }
                  />
                  Acil durumda aranabilir
                </label>
                <label className="student-contact-primary">
                  <input
                    type="checkbox"
                    checked={contact.isAuthorizedPickup === true}
                    onChange={(event) =>
                      onUpdateContact(contact.id, {
                        isAuthorizedPickup: event.target.checked,
                      })
                    }
                  />
                  Çocuğu teslim alabilir
                </label>
              </div>

              {contactLinks ? (
                <div className="student-contact-actions">
                  <a
                    href={contactLinks.tel}
                    aria-label={`${contactDisplayLabel(contact)} kişisini ara`}
                  >
                    <PersonIcon aria-hidden="true" />
                    Ara
                  </a>
                  <a
                    href={contactLinks.whatsapp}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${contactDisplayLabel(contact)} kişisine WhatsApp mesajı gönder`}
                  >
                    <ChatBubbleIcon aria-hidden="true" />
                    WhatsApp
                  </a>
                </div>
              ) : contact.phone.trim() ? (
                <p className="student-contact-invalid" role="status">
                  Arama ve WhatsApp için geçerli bir cep telefonu girin.
                </p>
              ) : null}
            </section>
          );
        })}
      </div>

      <button className="student-contact-add" type="button" onClick={onAddContact}>
        <PlusIcon aria-hidden="true" />
        Başka bir yakın ekle
      </button>
      {removedContact ? (
        <div className="student-profile-undo" role="status">
          <span>
            {removedContact.relationship} iletişim kaydı kaldırıldı; profil
            kaydedilene kadar geri alınabilir.
          </span>
          <button type="button" onClick={onUndoRemove}>
            Geri al
          </button>
        </div>
      ) : null}
    </>
  );
}
