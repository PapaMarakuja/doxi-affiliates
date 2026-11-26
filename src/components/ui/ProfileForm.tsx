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
import { maskPhone } from "@/src/lib/masks";
import { PixKeyInput } from "@/src/components/ui/PixKeyInput";
import { SegmentedControl, SegmentedOption } from "@/src/components/ui/SegmentedControl";

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

const PAYOUT_OPTIONS: SegmentedOption<PayoutMethod>[] = [
  { value: "pix", label: "PIX", icon: faMoneyBillTransfer },
  { value: "cupom", label: "Cupom na Loja", icon: faTag },
];

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
              <SegmentedControl<PayoutMethod>
                label="Opção de Retirada (todo dia 10)"
                options={PAYOUT_OPTIONS}
                value={values.payout_method}
                onChange={(payout_method) => setValues(prev => ({ ...prev, payout_method }))}
                disabled={saving}
              />

              {values.payout_method === "cupom" ? (
                <p className="field-note">
                  <FontAwesomeIcon icon={faTag} />
                  O cupom no valor da sua comissão será enviado todo dia 10.
                </p>
              ) : (
                <PixKeyInput
                  id="profile-pix"
                  label="Chave Pix"
                  icon={<FontAwesomeIcon icon={faKey} />}
                  value={values.pix_key}
                  onChange={(pix_key) => {
                    setValues(prev => ({ ...prev, pix_key }));
                    if (fieldErrors.pix_key) setFieldErrors(prev => ({ ...prev, pix_key: undefined }));
                  }}
                  placeholder="CPF, e-mail, telefone..."
                  error={fieldErrors.pix_key}
                  disabled={saving}
                />
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
