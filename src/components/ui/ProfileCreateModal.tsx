"use client";

import React, { useState, useCallback } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { Input } from "@/src/components/ui/Input";
import { Button } from "@/src/components/ui/Button";
import { useToast } from "@/src/contexts/ToastContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRotate, faCopy, faKey, faUser, faAt } from "@fortawesome/free-solid-svg-icons";
import type { ProfileWithEmail } from "@/src/types";
import { resolveAuthEmail } from "@/src/lib/auth/usernameResolver";

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
  onProfileCreated: (profile: ProfileWithEmail) => void;
  createAffiliate?: boolean;
}

export function ProfileCreateModal({
  isOpen,
  onClose,
  onProfileCreated,
  createAffiliate,
}: ProfileCreateModalProps) {
  const { addToast } = useToast();
  const [saving, setSaving] = useState(false);

  // User/Auth fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState(() => generateRandomPassword());
  const [name, setName] = useState("");

  const resetForm = useCallback(() => {
    setUsername("");
    setPassword(generateRandomPassword());
    setName("");
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
    if (!username.trim()) {
      addToast({ message: "O usuário de acesso é obrigatório.", type: "error" });
      document.getElementById("profile_form_username")?.focus();
      return;
    }

    const authEmail = resolveAuthEmail(username);

    setSaving(true);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: authEmail,
          password,
          createAffiliate,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Erro ao criar perfil");
      }

      const result = await res.json();
      const createdProfile: ProfileWithEmail = result.data;

      const successUsername = username.trim().toLowerCase();
      const successPassword = password;

      const handleCopyAll = async () => {
        const textToCopy = `Dados de Acesso - Doxi Affiliates\n\nUsuário: ${successUsername}\nSenha: ${successPassword}\n\nLink: ${window.location.origin}/login`;
        try {
          await navigator.clipboard.writeText(textToCopy);
          addToast({ message: "Dados copiados com sucesso!", type: "success" });
        } catch {
          addToast({ message: "Erro ao copiar dados.", type: "error" });
        }
      };

      addToast({
        message: (
          <div className="flex flex-col gap-2">
            <span>Perfil criado com sucesso!</span>
            <Button
              variant="transparent"
              className="toast-action-btn"
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Cadastrar Novo Usuário"
      size="md"
      id="profile-create-modal"
      zIndex={150}
      closeOnOverlayClick={false}
    >
      <div className="flex flex-col gap-6">
        <section>
          <div className="form-section-title">
            <FontAwesomeIcon icon={faUser} />
            Dados do Perfil
          </div>

          <div className="form-grid">
            <div className="form-col-12">
              <Input
                id="profile_form_name"
                label="Nome do Usuário"
                placeholder="Ex: Olívia Maria"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<FontAwesomeIcon icon={faUser} className="text-[13px]" />}
                disabled={saving}
              />
            </div>
          </div>
        </section>

        <section>
          <div className="form-section-title">
            <FontAwesomeIcon icon={faKey} />
            Dados de Acesso
          </div>

          <div className="form-grid">
            <div className="form-col-12">
              <Input
                id="profile_form_username"
                label="Usuário de Acesso"
                placeholder="Ex: anakin.skywalker"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={saving}
                icon={<FontAwesomeIcon icon={faAt} className="text-[13px]" />}
              />
              <div className="mt-1 pl-0.5 text-[11px] text-muted">
                O usuário é salvo sempre em letras minúsculas.
              </div>
            </div>

            <div className="form-col-12 mt-3">
              <Input
                id="profile_form_password"
                label="Senha Temporária"
                value={password}
                disabled
                icon={<FontAwesomeIcon icon={faKey} className="text-[13px]" />}
                rightLabel={
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleRegeneratePassword}
                      title="Gerar nova senha"
                      className="icon-action"
                    >
                      <FontAwesomeIcon icon={faRotate} />
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyPassword}
                      title="Copiar senha"
                      className="icon-action"
                    >
                      <FontAwesomeIcon icon={faCopy} />
                    </button>
                  </div>
                }
              />
            </div>
          </div>

          <div className="mt-2 text-xs text-muted">
            Uma senha aleatória foi gerada automaticamente. Copie e envie ao afiliado e ele poderá alterá-la depois.
          </div>
        </section>
      </div>

      <div className="mt-5 flex gap-3">
        <Button
          variant="primary"
          outline
          className="flex-1"
          onClick={handleClose}
          disabled={saving}
          type="button"
        >
          Cancelar
        </Button>
        <Button
          variant="primary"
          className="flex-1"
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
