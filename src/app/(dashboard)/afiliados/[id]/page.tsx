'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/src/components/ui/Card';
import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { Table, Column } from '@/src/components/ui/Table';
import { CouponLinkModal } from '@/src/components/ui/CouponLinkModal';
import { CouponCreateModal } from '@/src/components/ui/CouponCreateModal';
import { ProfileLinkModal } from '@/src/components/ui/ProfileLinkModal';
import { useToast } from '@/src/contexts/ToastContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheck,
  faXmark,
  faUser,
  faShieldHalved,
  faPen,
  faUnlink,
  faSave,
  faArrowLeft,
  faCopy,
  faTag,
  faMoneyBillTransfer,
} from '@fortawesome/free-solid-svg-icons';
import type { Affiliate, Coupon, ProfileWithEmail, PayoutMethod } from '@/src/types';
import { returnRole } from '@/src/lib/utils';
import { useConfirmDialog } from '@/src/contexts/ConfirmDialogContext';
import { maskPhone } from "@/src/lib/masks";
import { Badge } from "@/src/components/ui/Badge";
import { PixKeyInput } from "@/src/components/ui/PixKeyInput";
import { SegmentedControl, SegmentedOption } from "@/src/components/ui/SegmentedControl";

const PAYOUT_OPTIONS: SegmentedOption<PayoutMethod>[] = [
  { value: "pix", label: "PIX", icon: faMoneyBillTransfer },
  { value: "cupom", label: "CUPOM", icon: faTag },
];

export default function AfiliadoEditPage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();
  const isNew = id === 'novo';
  const { addToast } = useToast();

  const [loadingAffiliate, setLoadingAffiliate] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [loadingCoupons, setLoadingCoupons] = useState(false);
  const [loadingUnlink, setLoadingUnlink] = useState(false);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState('');
  const [commissionRate, setCommissionRate] = useState<string>('');
  const [profileId, setProfileId] = useState<string | null>(null);
  const [linkedProfile, setLinkedProfile] = useState<ProfileWithEmail | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [createdAffiliateId, setCreatedAffiliateId] = useState<string | null>(null);
  const confirm = useConfirmDialog();
  const currentAffiliateId = isNew ? createdAffiliateId : id;
  const canManageAffiliateLinks = !!currentAffiliateId;

  // New fields on Affiliate
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [payoutMethod, setPayoutMethod] = useState<PayoutMethod>('pix');
  const [pixKey, setPixKey] = useState('');

  // Modal states
  const [showLinkCouponModal, setShowLinkCouponModal] = useState(false);
  const [showEditCouponModal, setShowEditCouponModal] = useState(false);
  const [couponToEdit, setCouponToEdit] = useState<Coupon | null>(null);
  const [showLinkProfileModal, setShowLinkProfileModal] = useState(false);

  const fetchAffiliate = useCallback(async () => {
    if (!currentAffiliateId) return;
    setLoadingAffiliate(true);
    setLoadingProfiles(true);
    setLoadingCoupons(true);
    try {
      const res = await fetch(`/api/affiliates/${currentAffiliateId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) throw new Error('Erro ao buscar afiliado');
      const result = await res.json();

      const { affiliate, coupons, profile } = result.data;
      if (affiliate) {
        setName(affiliate.name || '');
        setCommissionRate(affiliate.commission_rate?.toString() || '');
        setProfileId(affiliate.profile_id || null);
        setContactEmail(affiliate.contact_email || '');
        setContactPhone(affiliate.contact_phone || '');
        setPayoutMethod(affiliate.payout_method || 'pix');
        setPixKey(affiliate.pix_key || '');
      }
      if (coupons) {
        setCoupons(coupons);
      }
      if (profile) {
        setLinkedProfile(profile);
      }
    } catch (error) {
      console.error(error);
      addToast({ message: 'Erro ao carregar os dados do afiliado.', type: 'error' });
    } finally {
      setLoadingAffiliate(false);
      setLoadingProfiles(false);
      setLoadingCoupons(false);
    }
  }, [currentAffiliateId, addToast]);

  useEffect(() => {
    fetchAffiliate();
  }, [fetchAffiliate]);

  const getValidatedPayload = () => {
    if (!name.trim()) {
      addToast({ message: 'O nome é obrigatório.', type: 'error' });
      return null;
    }

    const commissionValue = commissionRate ? parseFloat(commissionRate) : null;
    if (
      commissionValue !== null &&
      (isNaN(commissionValue) || commissionValue < 0 || commissionValue > 100)
    ) {
      addToast({ message: 'Comissão deve ser entre 0 e 100.', type: 'error' });
      return null;
    }

    return {
      name: name.trim(),
      commission_rate: commissionValue,
      profile_id: profileId,
      contact_email: contactEmail.trim() || null,
      contact_phone: contactPhone.trim() || null,
      payout_method: payoutMethod,
      pix_key: payoutMethod === 'pix' ? (pixKey.trim() || null) : null,
    };
  };

  const ensureAffiliateCreated = async (redirectAfterCreate: boolean = false) => {
    if (currentAffiliateId) return currentAffiliateId;

    const payload = getValidatedPayload();
    if (!payload) return null;

    setSaving(true);
    try {
      const res = await fetch('/api/affiliates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Erro ao cadastrar afiliado');
      }

      const result = await res.json();
      const createdAffiliate = result.data as Affiliate;

      if (!createdAffiliate?.id) {
        throw new Error('Afiliado criado, mas sem ID retornado.');
      }

      setCreatedAffiliateId(createdAffiliate.id);
      addToast({
        message: 'Afiliado cadastrado com sucesso! Agora você pode vincular cupons.',
        type: 'success',
      });

      if (redirectAfterCreate) {
        router.replace(`/afiliados/${createdAffiliate.id}`);
      }
      return createdAffiliate.id;
    } catch (error) {
      console.error(error);
      addToast({
        message: error instanceof Error ? error.message : 'Erro ao cadastrar afiliado.',
        type: 'error',
      });
      return null;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (redirectAfterCreate: boolean = false) => {
    const payload = getValidatedPayload();
    if (!payload) return;

    setSaving(true);
    try {
      let res;
      if (!currentAffiliateId) {
        res = await fetch('/api/affiliates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/affiliates/${currentAffiliateId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Erro ao salvar afiliado');
      }

      const result = await res.json();
      if (!currentAffiliateId) {
        const createdAffiliate = result.data as Affiliate;
        setCreatedAffiliateId(createdAffiliate.id);
        addToast({ message: 'Afiliado cadastrado com sucesso!', type: 'success' });
        router.replace(`/afiliados/${createdAffiliate.id}`);
      } else {
        addToast({ message: 'Afiliado atualizado com sucesso!', type: 'success' });
      }

      if (redirectAfterCreate) {
        router.push('/afiliados');
      }
    } catch (error) {
      console.error(error);
      addToast({
        message: error instanceof Error ? error.message : 'Erro ao salvar os dados.',
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = await confirm({
      title: 'Cancelar Alterações',
      message: 'Tem certeza que deseja sair? Todas as alterações não salvas serão perdidas.',
      confirmText: 'Sim, sair',
      cancelText: 'Não, continuar',
      type: 'warning',
    });

    if (confirmed) {
      router.push('/afiliados');
    }
  };

  const handleCopyClubLink = async (item: ProfileWithEmail) => {
    try {
      let email = item.email;

      if (!email && item.id) {
        const res = await fetch(`/api/profiles/${item.id}`);
        if (res.ok) {
          const resData = await res.json();
          email = resData.data?.email;
          if (email) {
            setLinkedProfile((prev) => (prev ? { ...prev, email } : prev));
          }
        }
      }

      const username = email ? email.split('@')[0] : (item.name || '');
      const textToCopy = `Dados de Acesso - Doxi Affiliates\n\nUsuário: ${username}\nSenha: ${item.temp_password || ''}\n\nLink: ${window.location.origin}/login`;

      await navigator.clipboard.writeText(textToCopy);
      addToast({ message: "Link copiado!", type: "success" });
    } catch {
      addToast({ message: "Erro ao copiar link.", type: "error" });
    }
  };

  const handleOpenCouponModal = async () => {
    const affiliateIdForCoupon = await ensureAffiliateCreated(false);
    if (!affiliateIdForCoupon) return;
    setShowLinkCouponModal(true);
  };

  const handleOpenProfileModal = async () => {
    const affiliateIdForProfile = await ensureAffiliateCreated(false);
    if (!affiliateIdForProfile) return;
    setShowLinkProfileModal(true);
  };

  // ─── Coupon handlers ─────────────────────────────────────
  const couponColumns: Column<Coupon>[] = [
    { key: 'code', header: 'Cupom', sortable: false },
    {
      key: 'discount_percentage',
      header: 'Percentual',
      sortable: false,
      render: (item) => (item.discount_percentage ? `${item.discount_percentage}%` : '—'),
    },
    {
      key: 'active',
      header: 'Status',
      sortable: false,
      render: (item) =>
        item.active ? (
          <Badge tone="success"><FontAwesomeIcon icon={faCheck} /> Ativo</Badge>
        ) : (
          <Badge tone="danger"><FontAwesomeIcon icon={faXmark} /> Inativo</Badge>
        ),
    },
    {
      key: 'actions',
      header: 'Ações',
      sortable: false,
      style: { width: '1%' },
      render: (item) => (
        <div className='flex justify-center items-center gap-2'>
          <Button
            variant="info"
            circle
            size="sm"
            onClick={() => handleEditCoupon(item)}
            title="Editar Cupom"
          >
            <FontAwesomeIcon icon={faPen} className="text-[11px]" />
          </Button>

          <Button
            variant="danger"
            circle
            size="sm"
            onClick={() => handleUnlinkCoupon(item)}
            title="Desvincular Cupom"
          >
            <FontAwesomeIcon icon={faUnlink} className="text-[11px]" />
          </Button>
        </div>
      ),
    },
  ];

  const handleEditCoupon = (coupon: Coupon) => {
    setCouponToEdit(coupon);
    setShowEditCouponModal(true);
  };

  const handleCouponCreated = (coupon: Coupon) => {
    if (couponToEdit) {
      setCoupons((prev) => prev.map((c) => (c.id === coupon.id ? coupon : c)));
      setCouponToEdit(null);
    } else {
      setCoupons((prev) => [...prev, coupon]);
    }
  };

  const handleCouponUnlinked = (coupon: Coupon) => {
    setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
  };

  const handleUnlinkCoupon = async (coupon: Coupon) => {
    const confirmed = await confirm({
      title: 'Desvincular cupom',
      message: `Tem certeza que deseja desvincular o cupom "${coupon.code}"?`,
      confirmText: 'Desvincular',
      cancelText: 'Cancelar',
      type: 'warning',
    });

    if (!confirmed) return;

    setLoadingUnlink(true);
    try {
      const res = await fetch(`/api/coupons/unlink`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coupon_id: coupon.id }),
      });

      if (!res.ok) {
        const result = await res.json();
        throw new Error(result.error || 'Erro ao desvincular cupom');
      }

      addToast({ message: 'Cupom desvinculado com sucesso!', type: 'success' });
      handleCouponUnlinked(coupon);
    } catch (err) {
      console.error(err);
      addToast({
        message: err instanceof Error ? err.message : 'Erro ao desvincular cupom',
        type: 'error',
      });
    } finally {
      setLoadingUnlink(false);
    }
  };

  // ─── Profile handlers ────────────────────────────────────
  const profileColumns: Column<ProfileWithEmail>[] = [
    {
      key: 'name',
      header: 'Nome',
      sortable: false,
      render: (item) => (
        <div className="flex items-center gap-2">
          <FontAwesomeIcon icon={faUser} className="text-[13px] text-brand" />
          <span className="font-semibold">{item.name}</span>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: false,
      render: (item) => (
        <Badge tone={item.role === "admin" ? "info" : "brand"}>
          <FontAwesomeIcon icon={faShieldHalved} className="text-[10px]" />
          {returnRole(item.role)}
        </Badge>
      ),
    },
    {
      key: 'temp_password',
      header: 'Senha Temporária',
      sortable: false,
      render: (item) =>
        item.temp_password ? (
          <span
            className="copy-chip"
            title='Clique para copiar a senha temporária'
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(item.temp_password!);
                addToast({ message: 'Senha temporária copiada!', type: 'success' });
              } catch {
                addToast({ message: 'Erro ao copiar a senha.', type: 'error' });
              }
            }}
          >
            <FontAwesomeIcon icon={faCopy} />
            {item.temp_password}
          </span>
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: 'actions',
      header: 'Ação',
      sortable: false,
      style: { width: '1%' },
      render: (item) => (
        <div className='flex justify-end items-center gap-2'>
          <Button
            variant="info"
            circle
            size="sm"
            onClick={() => handleCopyClubLink(item)}
            title="Copiar link para o clube"
          >
            <FontAwesomeIcon icon={faCopy} className="text-[11px]" />
          </Button>
        </div>
      ),
    }
  ];

  const handleProfileLinked = (profile: ProfileWithEmail) => {
    setProfileId(profile.id);
    setLinkedProfile(profile);
  };

  const handleUnlinkProfile = async () => {
    const confirmed = await confirm({
      title: 'Desvincular perfil',
      message: `Tem certeza que deseja desvincular o perfil "${linkedProfile?.name}"?`,
      confirmText: 'Desvincular',
      cancelText: 'Cancelar',
      type: 'warning',
    });

    if (!confirmed) return;

    setLoadingProfiles(true);
    try {
      const res = await fetch('/api/profiles/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ affiliate_id: currentAffiliateId, profile_id: null }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Erro ao desvincular perfil');
      }

      setProfileId(null);
      setLinkedProfile(null);
      addToast({ message: 'Perfil desvinculado com sucesso!', type: 'success' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Erro ao desvincular perfil.';
      addToast({ message, type: 'error' });
    } finally {
      setLoadingProfiles(false);
    }
  };

  return (
    <div className='flex flex-col gap-8'>
      <div className='mb-2 flex items-center gap-4'>
        <button type="button" onClick={handleCancel} className="back-btn" title="Voltar">
          <FontAwesomeIcon icon={faArrowLeft} />
        </button>
        <div>
          <h1 className="page-title">
            {isNew ? 'Cadastrar Novo Afiliado' : 'Editar Afiliado'}
          </h1>
          <p className="page-subtitle">
            {isNew ? 'Crie um afiliado na plataforma para vincular cupons e usuários.' : `Gerencie os dados e configurações do afiliado ${name}.`}
          </p>
        </div>
      </div>

      <Card>
        {/* SESSÃO 1: DADOS GERAIS */}
        <section className="mb-8">
          <h3 className="section-title mb-4">Dados Gerais</h3>
          <div className='form-grid'>
            <div className='form-col-4'>
              <Input
                label='Nome do Afiliado'
                placeholder='Ex: João Silva'
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loadingAffiliate}
              />
              {loadingAffiliate && <span className="text-xs text-muted">Carregando dados...</span>}
            </div>
            <div className='form-col-4'>
              <Input
                label='Comissão do Afiliado (%)'
                placeholder='Ex: 10'
                type='number'
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                disabled={loadingAffiliate}
                suffix={<span className="text-sm text-muted">%</span>}
              />
            </div>
            <div className='form-col-4'>
              <Input
                label='Email de Contato'
                placeholder='Ex: contato@email.com'
                type='email'
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                disabled={loadingAffiliate}
              />
            </div>
            <div className='form-col-4'>
              <Input
                label='Telefone de Contato'
                placeholder='Ex: (11) 99999-9999'
                type='tel'
                value={contactPhone}
                onChange={(e) => setContactPhone(maskPhone(e.target.value))}
                disabled={loadingAffiliate}
              />
            </div>
            <div className='form-col-4'>
              <SegmentedControl<PayoutMethod>
                label="Opção de Retirada (todo dia 10)"
                options={PAYOUT_OPTIONS}
                value={payoutMethod}
                onChange={setPayoutMethod}
                disabled={loadingAffiliate}
              />
            </div>
            <div className='form-col-4'>
              {payoutMethod === 'cupom' ? (
                <p className="field-note mb-5 min-h-[50px]">
                  <FontAwesomeIcon icon={faTag} />
                  <span>Retirada em cupom todo dia 10 (não requer chave Pix).</span>
                </p>
              ) : (
                <PixKeyInput
                  label="Chave Pix"
                  value={pixKey}
                  onChange={setPixKey}
                  placeholder="CPF, e-mail, telefone..."
                  disabled={loadingAffiliate}
                />
              )}
            </div>
          </div>
        </section>

        <hr className="ui-divider my-8" />

        <div className='flex flex-col items-start gap-8 lg:flex-row'>
          <section className="w-full flex-1">
            <div className='mb-4 flex items-center justify-between gap-3'>
              <h3 className="section-title">Vínculo de Perfil/Usuário</h3>
              {linkedProfile ? (
                <Button variant='danger' outline size="sm" className="w-auto" onClick={handleUnlinkProfile}>
                  Desvincular
                </Button>
              ) : (
                <Button
                  outline
                  size="sm"
                  className="w-auto"
                  onClick={handleOpenProfileModal}
                  disabled={loadingAffiliate || saving}
                >
                  Vincular Perfil
                </Button>
              )}
            </div>

            {linkedProfile ? (
              <Table data={[linkedProfile]} columns={profileColumns} loading={loadingProfiles} compact hidePagination />
            ) : (
              <div className="empty-dashed">
                {canManageAffiliateLinks
                  ? 'Nenhum perfil vinculado a este afiliado.'
                  : 'Salve o afiliado para habilitar vínculo de perfil.'}
              </div>
            )}
          </section>

          {/* SESSÃO 3: CUPONS */}
          <div className="w-full flex-1">
            <hr className="ui-divider my-8 lg:hidden" />
            <section>
              <div className='mb-4 flex items-center justify-between gap-3'>
                <h3 className="section-title">Cupons de Desconto</h3>
                <Button outline size="sm" className="w-auto" onClick={handleOpenCouponModal} disabled={saving}>
                  Vincular Cupom
                </Button>
              </div>

              {canManageAffiliateLinks && coupons.length > 0 ? (
                <Table data={coupons} columns={couponColumns} loading={loadingCoupons || loadingUnlink} compact hidePagination={coupons.length <= 10} />
              ) : (
                <div className="empty-dashed">
                  {canManageAffiliateLinks
                    ? 'Nenhum cupom vinculado a este afiliado.'
                    : 'Cadastre o afiliado para habilitar o vínculo de cupons.'}
                </div>
              )}
            </section>
          </div>
        </div>

        <hr className="ui-divider my-8" />

        <div className="mt-3 flex flex-wrap gap-3">
          <Button onClick={() => handleSave(true)} disabled={saving} className="w-auto gap-2 px-6">
            <FontAwesomeIcon icon={faSave} />
            {saving
              ? 'Salvando...'
              : currentAffiliateId
                ? 'Salvar Alterações'
                : 'Cadastrar Afiliado'}
          </Button>
          <Button variant='info' outline className="w-auto px-6" onClick={handleCancel}>
            <FontAwesomeIcon icon={faArrowLeft} />
            Voltar
          </Button>
        </div>
      </Card>

      {/* Modals */}
      {currentAffiliateId && (
        <CouponLinkModal
          isOpen={showLinkCouponModal}
          onClose={() => setShowLinkCouponModal(false)}
          affiliateId={currentAffiliateId}
          onCouponLinked={handleCouponCreated}
        />
      )}

      {currentAffiliateId && (
        <CouponCreateModal
          isOpen={showEditCouponModal}
          onClose={() => {
            setShowEditCouponModal(false);
            setCouponToEdit(null);
          }}
          affiliateId={currentAffiliateId}
          onCouponCreated={handleCouponCreated}
          couponToEdit={couponToEdit}
        />
      )}

      <ProfileLinkModal
        isOpen={showLinkProfileModal}
        onClose={() => setShowLinkProfileModal(false)}
        affiliateId={currentAffiliateId || ''}
        onProfileLinked={handleProfileLinked}
      />
    </div>
  );
}
