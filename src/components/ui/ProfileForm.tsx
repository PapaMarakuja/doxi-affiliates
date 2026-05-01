"use client";

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faPhone,
  faEnvelope,
  faKey,
  faPencil,
  faCheck,
  faXmark,
  faShieldHalved,
  faIdCard,
  faRandom,
  faChevronDown
} from "@fortawesome/free-solid-svg-icons";
import type { Profile } from "@/src/types";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { useToast } from "@/src/contexts/ToastContext";
import {
  validateProfileUpdate,
  hasValidationErrors,
  type ProfileValidationErrors,
} from "@/src/lib/profileValidation";
import { applyPixMask, guessPixType, maskPhone } from "@/src/lib/masks";

export type ProfileFormMode = "view" | "edit";

export interface ProfileFormProps {
  profile: Profile;
  onProfileUpdated?: (updated: Profile) => void;
  initialMode?: ProfileFormMode;
}

interface FormValues {
  name: string;
  pix_key: string;
  contact_phone: string;
  contact_email: string;
}



function toFormValues(profile: Profile): FormValues {
  return {
    name: profile.name ?? "",
    pix_key: profile.pix_key ?? "",
    contact_phone: profile.contact_phone ?? "",
    contact_email: profile.contact_email ?? "",
  };
}

const ROLE_LABELS: Record<Profile["role"], string> = {
  admin: "Administrador",
  affiliate: "Afiliado",
};

const PIX_TYPES = [
  { value: "cpf_cnpj", label: "CPF/CNPJ", icon: faIdCard },
  { value: "phone", label: "Celular", icon: faPhone },
  { value: "email", label: "E-mail", icon: faEnvelope },
  { value: "random", label: "Aleatória", icon: faRandom }
] as const;
type PixType = typeof PIX_TYPES[number]["value"];

export function ProfileForm({ profile, onProfileUpdated, initialMode = "view" }: ProfileFormProps) {
  const [mode, setMode] = useState<ProfileFormMode>(initialMode);
  const [currentProfile, setCurrentProfile] = useState<Profile>(profile);
  const [values, setValues] = useState<FormValues>(toFormValues(profile));
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ProfileValidationErrors>({});
  const { addToast } = useToast();
  const [manualPixType, setManualPixType] = useState<PixType | null>(null);

  function handleChange(field: keyof FormValues) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      let value = e.target.value;

      if (field === "contact_phone") {
        value = maskPhone(value);
      } else if (field === "pix_key") {
        const type = manualPixType || guessPixType(value);
        value = applyPixMask(value, type);
      }

      setValues((prev) => ({ ...prev, [field]: value }));
      if (fieldErrors[field]) {
        setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
      }
    };
  }

  function handleCancel() {
    setValues(toFormValues(currentProfile));
    setFieldErrors({});
    setManualPixType(null);
    setMode("view");
  }



  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      name: values.name.trim() || undefined,
      pix_key: values.pix_key.trim() || null,
      contact_phone: values.contact_phone.trim() || null,
      contact_email: values.contact_email.trim() || null,
    };

    const errors = validateProfileUpdate(payload);
    if (hasValidationErrors(errors)) {
      setFieldErrors(errors);
      return;
    }

    setSaving(true);
    setFieldErrors({});

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || json.error) {
        addToast({
          message: json.error ?? "Falha ao salvar o perfil. Tente novamente.",
          type: "error",
        });
        return;
      }

      const updated: Profile = json.data;
      setCurrentProfile(updated);
      setValues(toFormValues(updated));
      setMode("view");
      addToast({ message: "Perfil atualizado com sucesso!", type: "success" });
      onProfileUpdated?.(updated);
    } catch {
      addToast({
        message: "Erro de conexão. Verifique sua internet e tente novamente.",
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      className="profile-form"
      onSubmit={handleSave}
      noValidate
      id="profile-form"
    >


      <div className="profile-form-avatar">
        <div className="profile-avatar-circle">
          <FontAwesomeIcon icon={faUser} />
        </div>
        <div className="profile-avatar-meta">
          <p className="profile-avatar-name">
            {currentProfile.name || "Usuário"}
          </p>
          <span className="profile-role-badge">
            <FontAwesomeIcon icon={faShieldHalved} />
            {ROLE_LABELS[currentProfile.role]}
          </span>
        </div>
      </div>

      {mode === "view" ? (
        <div className="profile-view-fields">
          <ProfileViewRow
            icon={<FontAwesomeIcon icon={faUser} />}
            label="Nome"
            value={currentProfile.name}
          />
          <ProfileViewRow
            icon={<FontAwesomeIcon icon={faEnvelope} />}
            label="E-mail de contato"
            value={currentProfile.contact_email}
          />
          <ProfileViewRow
            icon={<FontAwesomeIcon icon={faPhone} />}
            label="Telefone"
            value={currentProfile.contact_phone}
          />
          <ProfileViewRow
            icon={<FontAwesomeIcon icon={faKey} />}
            label="Chave Pix"
            value={currentProfile.pix_key}
          />
        </div>
      ) : (
        <div className="profile-edit-fields">
          <Input
            id="profile-name"
            label="Nome"
            icon={<FontAwesomeIcon icon={faUser} />}
            value={values.name}
            onChange={handleChange("name")}
            placeholder="Seu nome completo"
            autoComplete="name"
            error={fieldErrors.name}
            disabled={saving}
          />
          <Input
            id="profile-email"
            label="E-mail de contato"
            type="email"
            icon={<FontAwesomeIcon icon={faEnvelope} />}
            value={values.contact_email}
            onChange={handleChange("contact_email")}
            placeholder="seu@email.com"
            autoComplete="email"
            error={fieldErrors.contact_email}
            disabled={saving}
          />
          <Input
            id="profile-phone"
            label="Telefone"
            type="tel"
            icon={<FontAwesomeIcon icon={faPhone} />}
            value={values.contact_phone}
            onChange={handleChange("contact_phone")}
            placeholder="(11) 99999-9999"
            autoComplete="tel"
            error={fieldErrors.contact_phone}
            disabled={saving}
          />
          {(() => {
            const currentPixType = manualPixType || guessPixType(values.pix_key || "");
            const currentPixTypeConfig = PIX_TYPES.find(t => t.value === currentPixType) || PIX_TYPES[3];

            const pixSelector = (
              <div
                style={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "4px 8px 4px 10px",
                  background: "var(--input-bg)",
                  borderRadius: "16px",
                  cursor: "pointer",
                  color: "var(--text-main)",
                  fontSize: "12px",
                  fontWeight: 600,
                  border: "1px solid var(--sidebar-border)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
                }}
              >
                <FontAwesomeIcon icon={currentPixTypeConfig.icon} style={{ color: "var(--pink-dark)" }} />
                <span>{currentPixTypeConfig.label}</span>
                <FontAwesomeIcon icon={faChevronDown} style={{ fontSize: "10px", opacity: 0.5 }} />
                <select
                  value={currentPixType}
                  onChange={(e) => {
                    const type = e.target.value as PixType;
                    setManualPixType(type);
                    const rawValue = type === "phone" || type === "cpf_cnpj" ? values.pix_key.replace(/\D/g, "") : values.pix_key;
                    const masked = applyPixMask(rawValue, type);
                    setValues(prev => ({ ...prev, pix_key: masked }));
                  }}
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: 0,
                    cursor: "pointer",
                    width: "100%",
                  }}
                  title="Tipo de Chave Pix"
                >
                  {PIX_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            );

            return (
              <Input
                id="profile-pix"
                label="Chave Pix"
                icon={<FontAwesomeIcon icon={faKey} />}
                value={values.pix_key}
                onChange={handleChange("pix_key")}
                placeholder="CPF, e-mail, telefone..."
                error={fieldErrors.pix_key}
                disabled={saving}
                suffix={pixSelector}
                className="pix-input-override"
              />
            );
          })()}
        </div>
      )}

      <div className="profile-form-actions">
        {mode === "view" ? (
          <Button
            type="button"
            className="ui-button--outline"
            onClick={() => setMode("edit")}
            id="profile-edit-btn"
          >
            <FontAwesomeIcon icon={faPencil} />
            Editar perfil
          </Button>
        ) : (
          <div className="profile-form-action-row">
            <Button
              type="button"
              className="ui-button--ghost"
              onClick={handleCancel}
              disabled={saving}
              id="profile-cancel-btn"
            >
              <FontAwesomeIcon icon={faXmark} />
              Cancelar
            </Button>
            <Button
              type="submit"
              loading={saving}
              id="profile-save-btn"
            >
              {!saving && <FontAwesomeIcon icon={faCheck} />}
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        )}
      </div>
    </form>
  );
}

interface ProfileViewRowProps {
  icon: React.ReactNode;
  label: string;
  value: string | null | undefined;
}

function ProfileViewRow({ icon, label, value }: ProfileViewRowProps) {
  return (
    <div className="profile-view-row">
      <span className="profile-view-row-icon">{icon}</span>
      <div className="profile-view-row-content">
        <span className="profile-view-row-label">{label}</span>
        <span className="profile-view-row-value">
          {value || (
            <span className="profile-view-row-empty">Não informado</span>
          )}
        </span>
      </div>
    </div>
  );
}
