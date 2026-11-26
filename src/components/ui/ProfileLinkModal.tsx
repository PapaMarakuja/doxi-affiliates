"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Modal } from "@/src/components/ui/Modal";
import { Button } from "@/src/components/ui/Button";
import { ProfileCreateModal } from "@/src/components/ui/ProfileCreateModal";
import { useToast } from "@/src/contexts/ToastContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPlus } from "@fortawesome/free-solid-svg-icons";
import type { ProfileWithEmail } from "@/src/types";
import { Table } from "@/src/components/ui/Table";
import { Badge } from "@/src/components/ui/Badge";
import { returnRole } from "@/src/lib/utils";

interface ProfileLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  affiliateId: string;
  onProfileLinked: (profile: ProfileWithEmail) => void;
}

export function ProfileLinkModal({
  isOpen,
  onClose,
  affiliateId,
  onProfileLinked,
}: ProfileLinkModalProps) {
  const { addToast } = useToast();
  const [unlinkedProfiles, setUnlinkedProfiles] = useState<ProfileWithEmail[]>([]);
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

  const handleProfileCreated = async (profile: ProfileWithEmail) => {
    // New profile created specifically to be linked to this affiliate
    setShowCreateModal(false);
    // Add to list briefly so handleLink can find it to return to onProfileLinked
    setUnlinkedProfiles((prev) => [profile, ...prev]);
    // Automatically link to current affiliate
    await handleLink(profile.id);
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
        <div className="flex flex-col gap-4">
          <div className="flex justify-end">
            <Button className="w-auto px-5" onClick={() => setShowCreateModal(true)} type="button">
              <FontAwesomeIcon icon={faPlus} />
              Cadastrar Novo Perfil
            </Button>
          </div>

          {!loading && unlinkedProfiles.length === 0 ? (
            <div className="empty-dashed">Nenhum perfil disponível para vinculação.</div>
          ) : (
            <Table
              data={unlinkedProfiles}
              loading={loading}
              compact
              hidePagination={unlinkedProfiles.length <= 10}
              columns={[
                {
                  key: "name",
                  header: "Nome",
                  render: (profile) => <span className="font-semibold">{profile.name}</span>,
                },
                {
                  key: "role",
                  header: "Role",
                  render: (profile) => (
                    <Badge tone={profile.role === "admin" ? "info" : "brand"}>{returnRole(profile.role)}</Badge>
                  ),
                },
                {
                  key: "actions",
                  header: "Ação",
                  style: { width: "1%", textAlign: "center" },
                  render: (profile) => (
                    <Button
                      outline
                      size="sm"
                      className="w-auto"
                      onClick={() => handleLink(profile.id)}
                      loading={linkingId === profile.id}
                      disabled={linkingId !== null}
                      type="button"
                    >
                      Vincular
                    </Button>
                  ),
                },
              ]}
            />
          )}
        </div>
      </Modal>

      <ProfileCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onProfileCreated={handleProfileCreated}
        createAffiliate={false}
      />
    </>
  );
}
