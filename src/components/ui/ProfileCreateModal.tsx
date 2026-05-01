"use client";

import React, { useState, useCallback } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { useToast } from "@/src/contexts/ToastContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotate, faCopy, faKey, faUser, faEnvelope, faPhone, faShieldHalved } from "@fortawesome/free-solid-svg-icons";
import type { Profile } from "@/src/types";
import { applyPixMask, guessPixType, maskPhone } from "@/src/lib/masks";

function generateRandomPassword(length = 20): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "!@#$%&*";
  const all = upper + lower + digits + special;

  // Ensure at least one of each category
  let password = "";
  password += upper[Math.floor(Math.random() * upper.length)];
  password += lower[Math.floor(Math.random() * lower.length)];
  password += digits[Math.floor(Math.random() * digits.length)];
  password += special[Math.floor(Math.random() * special.length)];

  for (let i = password.length; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)];
  }

  // Shuffle
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

interface ProfileCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProfileCreated: (profile: Profile) => void;
}

export function ProfileCreateModal({
  isOpen,
  onClose,
  onProfileCreated,
}: ProfileCreateModalProps) {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);

  // User/Auth fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(() => generateRandomPassword());

  // Profile fields
  const [name, setName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [pixKey, setPixKey] = useState("");

  const resetForm = useCallback(() => {
    setEmail("");
    setPassword(generateRandomPassword());
    setName("");
    setContactEmail("");
    setContactPhone("");
    setPixKey("");
  }, []);

  const handleRegeneratePassword = () => {
    setPassword(generateRandomPassword());
    addToast({ message: "Nova senha gerada!", type: "info" });
  };

  const handleCopyPassword = async () => {
    try {
      await navigator.clipboard.writeText(password);
      addToast({ message: "Senha copiada!", type: "success" });
    } catch {
      addToast({ message: "Não foi possível copiar.", type: "error" });
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      addToast({ message: "O nome é obrigatório.", type: "error" });
      document.getElementById("profile_form_name")?.focus();
      return;
    }
    if (!email.trim()) {
      addToast({ message: "O email de acesso é obrigatório.", type: "error" });
      document.getElementById("profile_form_email")?.focus();
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          contact_email: contactEmail.trim() || null,
          contact_phone: contactPhone.trim() || null,
          pix_key: pixKey.trim() || null,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Erro ao criar perfil");
      }

      const result = await res.json();
      const createdProfile: Profile = result.data;

      const successEmail = email;
      const successPassword = password;

      const handleCopyAll = async () => {
        const textToCopy = `Dados de Acesso - Doxi Affiliates\n\nLogin: ${successEmail}\nSenha: ${successPassword}\n\nLink: ${window.location.origin}/login`;
        try {
          await navigator.clipboard.writeText(textToCopy);
          addToast({ message: "Dados copiados com sucesso!", type: "success" });
        } catch {
          addToast({ message: "Erro ao copiar dados.", type: "error" });
        }
      };

      addToast({
        message: (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <span>Perfil criado com sucesso!</span>
            <Button
              variant="transparent"
              style={{
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: "700",
                minHeight: "unset",
                width: "fit-content",
                marginTop: "6px",
                border: "1px solid currentColor",
                borderRadius: "6px",
                color: "inherit",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                opacity: 0.9
              }}
              onClick={handleCopyAll}
            >
              <FontAwesomeIcon icon={faCopy} />
              Copiar Usuário e Senha
            </Button>
          </div>
        ),
        type: "success",
        duration: 8000 * 300,
      });

      onProfileCreated(createdProfile);
      resetForm();
      onClose();
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : "Erro ao criar perfil.";
      addToast({ message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      resetForm();
      onClose();
    }
  };

  const sectionTitleStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    fontSize: "0.95rem",
    fontWeight: 600,
    color: "var(--pink-dark)",
    marginBottom: "12px",
    paddingBottom: "8px",
    borderBottom: "1px solid var(--border)",
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cadastrar Novo Perfil"
      size="lg"
      id="profile-create-modal"
      zIndex={150}
      closeOnOverlayClick={false}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* ─── SEÇÃO 1: DADOS DO PERFIL ─── */}
        <section>
          <div style={sectionTitleStyle}>
            <FontAwesomeIcon icon={faUser} />
            Dados do Perfil
          </div>

          <div className="form-grid">
            <div className="form-col-6">
              <Input
                id="profile_form_name"
                label="Nome"
                placeholder="Ex: Olívia Maria"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="form-col-6">
              <Input
                id="profile_form_contact_email"
                label="Email de Contato"
                placeholder="Ex: contato@email.com"
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={saving}
                inputMode="email"
              />
            </div>
            <div className="form-col-6">
              <Input
                id="profile_form_phone"
                label="Telefone"
                placeholder="Ex: (11) 99999-9999"
                value={contactPhone}
                onChange={(e) => setContactPhone(maskPhone(e.target.value))}
                disabled={saving}
                inputMode="tel"
              />
            </div>
            <div className="form-col-6">
              <Input
                id="profile_form_pix"
                label="Chave PIX"
                placeholder="CPF, Email, Celular ou Chave Aleatória"
                value={pixKey}
                onChange={(e) => setPixKey(applyPixMask(e.target.value, guessPixType(e.target.value)))}
                disabled={saving}
              />
            </div>
          </div>
        </section>

        {/* ─── SEÇÃO 2: DADOS DE ACESSO ─── */}
        <section>
          <div style={sectionTitleStyle}>
            <FontAwesomeIcon icon={faKey} />
            Dados de Acesso
          </div>

          <div className="form-grid">
            <div className="form-col-6">
              <Input
                id="profile_form_email"
                label="Email de Login"
                placeholder="Ex: anakin@email.com"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={saving}
                inputMode="email"
              />
            </div>

            <div className="form-col-6">
              <Input
                id="profile_form_password"
                label="Senha Temporária"
                value={password}
                disabled
                rightLabel={
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      type="button"
                      onClick={handleRegeneratePassword}
                      title="Gerar nova senha"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--pink-dark)",
                        padding: "2px 4px",
                        fontSize: "13px",
                        borderRadius: "4px",
                        transition: "background 0.15s",
                      }}
                    >
                      <FontAwesomeIcon icon={faRotate} />
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      title="Copiar senha"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--pink-dark)",
                        padding: "2px 4px",
                        fontSize: "13px",
                        borderRadius: "4px",
                        transition: "background 0.15s",
                      }}
                    >
                      <FontAwesomeIcon icon={faCopy} />
                    </button>
                  </div>
                }
              />
            </div>
          </div>

          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "-8px" }}>
            Uma senha aleatória foi gerada automaticamente. Copie e envie ao afiliado e ele poderá alterá-la depois.
          </div>
        </section>
      </div>

      <div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
        <Button
          variant="primary"
          outline
          style={{ width: "auto", flex: 1 }}
          onClick={handleClose}
          disabled={saving}
          type="button"
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          style={{ width: "auto", flex: 1 }}
          onClick={handleSave}
          loading={saving}
          type="button"
        >
          Cadastrar
        </Button>
      </div>
    </Modal>
  );
}
