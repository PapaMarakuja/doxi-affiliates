"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  faChevronDown,
  faTag,
  faMoneyBillTransfer
} from "@fortawesome/free-solid-svg-icons";
import type { Profile, Affiliate, PayoutMethod } from "@/src/types";
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
  affiliate?: Affiliate | null;
  onProfileUpdated?: (updated: Profile) => void;
  onAffiliateUpdated?: (updated: Affiliate) => void;
  initialMode?: ProfileFormMode;
}

interface FormValues {
  name: string;
  pix_key: string;
  payout_method: PayoutMethod;
  contact_phone: string;
  contact_email: string;
}

function toFormValues(profile: Profile, affiliate?: Affiliate | null): FormValues {
  return {
    name: profile.name ?? "",
    pix_key: affiliate?.pix_key ?? "",
    payout_method: affiliate?.payout_method ?? "pix",
    contact_phone: affiliate?.contact_phone ?? "",
    contact_email: affiliate?.contact_email ?? "",
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

export function ProfileForm({
  profile,
  affiliate,
  onProfileUpdated,
  onAffiliateUpdated,
  initialMode = "view"
}: ProfileFormProps) {
  const [mode, setMode] = useState<ProfileFormMode>(initialMode);
  const [currentProfile, setCurrentProfile] = useState<Profile>(profile);
  const [currentAffiliate, setCurrentAffiliate] = useState<Affiliate | null | undefined>(affiliate);
  const [values, setValues] = useState<FormValues>(toFormValues(profile, affiliate));
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<ProfileValidationErrors>({});
  const { addToast } = useToast();
  const router = useRouter();
  const [manualPixType, setManualPixType] = useState<PixType | null>(null);

  useEffect(() => {
    setCurrentProfile(profile);
    setCurrentAffiliate(affiliate);
    setValues(toFormValues(profile, affiliate));
  }, [profile, affiliate]);

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
    setValues(toFormValues(currentProfile, currentAffiliate));
    setFieldErrors({});
    setManualPixType(null);
    setMode("view");
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    const payload = {
      name: values.name.trim() || undefined,
      pix_key: currentProfile.role === "affiliate" ? (values.payout_method === "pix" ? (values.pix_key.trim() || null) : null) : undefined,
      payout_method: currentProfile.role === "affiliate" ? values.payout_method : undefined,
      contact_phone: currentProfile.role === "affiliate" ? (values.contact_phone.trim() || null) : undefined,
      contact_email: currentProfile.role === "affiliate" ? (values.contact_email.trim() || null) : undefined,
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

      const { profile: updatedProfile, affiliate: updatedAffiliate } = json.data;
      setCurrentProfile(updatedProfile);
      setCurrentAffiliate(updatedAffiliate);
      setValues(toFormValues(updatedProfile, updatedAffiliate));
      setMode("view");
      addToast({ message: "Perfil atualizado com sucesso!", type: "success" });
      onProfileUpdated?.(updatedProfile);
      if (updatedAffiliate) {
        onAffiliateUpdated?.(updatedAffiliate);
      }
      router.refresh();
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
          {currentProfile.role === "affiliate" && (
            <>
              <ProfileViewRow
                icon={<FontAwesomeIcon icon={faEnvelope} />}
                label="E-mail de contato"
                value={currentAffiliate?.contact_email}
              />
              <ProfileViewRow
                icon={<FontAwesomeIcon icon={faPhone} />}
                label="Telefone"
                value={currentAffiliate?.contact_phone}
              />
              <ProfileViewRow
                icon={<FontAwesomeIcon icon={faMoneyBillTransfer} />}
                label="Opção de Retirada"
                value={
                  currentAffiliate?.payout_method === "cupom"
                    ? "Cupom na Loja (todo dia 10)"
                    : "PIX (todo dia 10)"
                }
              />
              {currentAffiliate?.payout_method !== "cupom" && (
                <ProfileViewRow
                  icon={<FontAwesomeIcon icon={faKey} />}
                  label="Chave Pix"
                  value={currentAffiliate?.pix_key}
                />
              )}
            </>
          )}
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
          {currentProfile.role === "affiliate" && (
            <>
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
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-main)" }}>
                  Opção de Retirada (todo dia 10)
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    background: "var(--hover)",
                    padding: "3px",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    gap: "4px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setValues(prev => ({ ...prev, payout_method: "pix" }))}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "8px 12px",
                      borderRadius: "7px",
                      border: "none",
                      background: values.payout_method === "pix" ? "var(--pink-dark)" : "transparent",
                      color: values.payout_method === "pix" ? "#fff" : "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <FontAwesomeIcon icon={faMoneyBillTransfer} />
                    <span>PIX</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setValues(prev => ({ ...prev, payout_method: "cupom" }))}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      padding: "8px 12px",
                      borderRadius: "7px",
                      border: "none",
                      background: values.payout_method === "cupom" ? "var(--pink-dark)" : "transparent",
                      color: values.payout_method === "cupom" ? "#fff" : "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      transition: "all 0.15s ease",
                    }}
                  >
                    <FontAwesomeIcon icon={faTag} />
                    <span>Cupom na Loja</span>
                  </button>
                </div>
              </div>

              {values.payout_method === "cupom" ? (
                <p style={{ margin: "-2px 0 0", fontSize: "12px", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "6px" }}>
                  <FontAwesomeIcon icon={faTag} style={{ color: "var(--pink-dark)", fontSize: "11px" }} />
                  O cupom no valor da sua comissão será enviado todo dia 10.
                </p>
              ) : (
                (() => {
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
                })()
              )}
            </>
          )}
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
