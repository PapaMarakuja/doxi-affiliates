"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { Button } from "@/src/components/ui/Button";
import { ProfileCreateModal } from "@/src/components/ui/ProfileCreateModal";
import { useToast } from "@/src/contexts/ToastContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus, faEnvelope, faPhone } from "@fortawesome/free-solid-svg-icons";
import type { Profile } from "@/src/types";

interface ProfileLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  affiliateId: string;
  onProfileLinked: (profile: Profile) => void;
}

export function ProfileLinkModal({
  isOpen,
  onClose,
  affiliateId,
  onProfileLinked,
}: ProfileLinkModalProps) {
  const { addToast } = useToast();
  const [unlinkedProfiles, setUnlinkedProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchUnlinkedProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profiles?unlinked=true");
      if (!res.ok) throw new Error("Erro ao buscar perfis");
      const result = await res.json();
      setUnlinkedProfiles(result.data || []);
    } catch (error) {
      console.error(error);
      addToast({ message: "Erro ao carregar perfis disponíveis.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (isOpen) {
      fetchUnlinkedProfiles();
    }
  }, [isOpen, fetchUnlinkedProfiles]);

  const handleLink = async (profileId: string) => {
    setLinkingId(profileId);
    try {
      const res = await fetch("/api/profiles/link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ affiliate_id: affiliateId, profile_id: profileId }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Erro ao vincular perfil");
      }

      const linkedProfile = unlinkedProfiles.find((p) => p.id === profileId);
      setUnlinkedProfiles((prev) => prev.filter((p) => p.id !== profileId));

      addToast({ message: "Perfil vinculado com sucesso!", type: "success" });
      if (linkedProfile) {
        onProfileLinked(linkedProfile);
      }
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Erro ao vincular perfil.";
      addToast({ message, type: "error" });
    } finally {
      setLinkingId(null);
    }
  };

  const handleProfileCreated = (profile: Profile) => {
    // New profile created — add it to the unlinked list
    setUnlinkedProfiles((prev) => [profile, ...prev]);
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Vincular Perfil"
        size="md"
        id="profile-link-modal"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              variant="primary"
              style={{ width: "auto" }}
              onClick={() => setShowCreateModal(true)}
              type="button"
            >
              <FontAwesomeIcon icon={faPlus} style={{ marginRight: "6px" }} />
              Cadastrar Novo Perfil
            </Button>
          </div>

          {loading ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--text-muted)",
              }}
            >
              Carregando perfis...
            </div>
          ) : unlinkedProfiles.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--text-secondary, var(--text-muted))",
                border: "1px dashed var(--border)",
                borderRadius: "8px",
              }}
            >
              Nenhum perfil disponível para vinculação.
            </div>
          ) : (
            <div
              style={{
                overflowX: "auto",
                borderRadius: "12px",
                border: "1px solid var(--border)",
                background: "var(--card-bg)",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  textAlign: "left",
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid var(--border)",
                      background: "var(--hover)",
                    }}
                  >
                    <th className="table-th-text" style={thStyle}>
                      Nome
                    </th>
                    <th className="table-th-text" style={thStyle}>
                      Contato
                    </th>
                    <th className="table-th-text" style={thStyle}>
                      Role
                    </th>
                    <th className="table-th-text" style={{ ...thStyle, textAlign: "center" }}>
                      Ação
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {unlinkedProfiles.map((profile) => (
                    <tr
                      key={profile.id}
                      className="table-row-hover"
                      style={{
                        borderBottom: "1px solid var(--border)",
                        transition: "background 0.2s",
                      }}
                    >
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 600 }}>
                          {profile.name}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px" }}>
                          {profile.contact_email && (
                            <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)" }}>
                              <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: "11px" }} />
                              {profile.contact_email}
                            </span>
                          )}
                          {profile.contact_phone && (
                            <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--text-muted)" }}>
                              <FontAwesomeIcon icon={faPhone} style={{ fontSize: "11px" }} />
                              {profile.contact_phone}
                            </span>
                          )}
                          {!profile.contact_email && !profile.contact_phone && (
                            <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>—</span>
                          )}
                        </div>
                      </td>
                      <td style={tdStyle}>
                        <span
                          style={{
                            fontSize: "12px",
                            fontWeight: 600,
                            padding: "3px 10px",
                            borderRadius: "20px",
                            background: profile.role === "admin"
                              ? "rgba(59, 130, 246, 0.12)"
                              : "rgba(245, 184, 191, 0.25)",
                            color: profile.role === "admin"
                              ? "var(--info)"
                              : "var(--pink-dark)",
                          }}
                        >
                          {profile.role}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: "center" }}>
                        <Button
                          variant="primary"
                          outline
                          style={{
                            width: "auto",
                            padding: "8px 16px",
                            fontSize: "13px",
                            minHeight: "unset",
                          }}
                          onClick={() => handleLink(profile.id)}
                          loading={linkingId === profile.id}
                          disabled={linkingId !== null}
                          type="button"
                        >
                          Vincular
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Modal>

      <ProfileCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onProfileCreated={handleProfileCreated}
      />
    </>
  );
}

const thStyle: React.CSSProperties = {
  padding: "14px 16px",
  fontWeight: 600,
  color: "var(--text-muted)",
  fontSize: "12px",
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 16px",
  color: "var(--text-main)",
  fontSize: "14px",
};
