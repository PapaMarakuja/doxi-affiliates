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
  faEnvelope,
  faPhone,
  faUser,
  faShieldHalved,
  faPen,
  faUnlink,
} from '@fortawesome/free-solid-svg-icons';
import type { Affiliate, Coupon, Profile } from '@/src/types';
import { returnRole } from '@/src/lib/utils';
import { useConfirmDialog } from '@/src/contexts/ConfirmDialogContext';

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
  const [linkedProfile, setLinkedProfile] = useState<Profile | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [createdAffiliateId, setCreatedAffiliateId] = useState<string | null>(null);
  const confirm = useConfirmDialog();
  const currentAffiliateId = isNew ? createdAffiliateId : id;
  const canManageAffiliateLinks = !!currentAffiliateId;

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

  const handleSave = async () => {
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
          <span style={{ color: 'var(--success)' }}>
            Ativo{' '}
            <FontAwesomeIcon
              icon={faCheck}
              style={{ color: 'var(--success)', fontSize: '16px' }}
            />
          </span>
        ) : (
          <span style={{ color: 'var(--error)' }}>
            Inativo{' '}
            <FontAwesomeIcon
              icon={faXmark}
              style={{ color: 'var(--error)', fontSize: '16px' }}
            />
          </span>
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
            variant='info'
            style={{
              minHeight: 'unset',
              width: 'auto',
              fontSize: '12px',
              padding: '0.5rem',
            }}
            onClick={() => handleEditCoupon(item)}
          >
            <FontAwesomeIcon icon={faPen} />
          </Button>

          <Button
            variant='danger'
            outline
            style={{
              minHeight: 'unset',
              width: 'auto',
              fontSize: '12px',
              padding: '0.5rem',
            }}
            onClick={() => handleUnlinkCoupon(item)}
          >
            <FontAwesomeIcon icon={faUnlink} />
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
  const profileColumns: Column<Profile>[] = [
    {
      key: 'name',
      header: 'Nome',
      sortable: false,
      render: (item) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FontAwesomeIcon
            icon={faUser}
            style={{ color: 'var(--pink-dark)', fontSize: '13px' }}
          />
          <span style={{ fontWeight: 600 }}>{item.name}</span>
        </div>
      ),
    },
    {
      key: 'contact_email',
      header: 'Email',
      sortable: false,
      render: (item) =>
        item.contact_email ? (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: 'var(--text-muted)',
            }}
          >
            <FontAwesomeIcon icon={faEnvelope} style={{ fontSize: '11px' }} />
            {item.contact_email}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>—</span>
        ),
    },
    {
      key: 'pix_key',
      header: 'Pix',
      sortable: false,
      render: (item) =>
        item.pix_key ? (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: 'var(--text-muted)',
              cursor: 'pointer',
            }}
            title='Clique para copiar'
            onClick={() => {
              navigator.clipboard.writeText(item.pix_key!);
              addToast({ message: 'Chave Pix copiada!', type: 'success' });
            }}
          >
            {item.pix_key}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>—</span>
        ),
    },
    {
      key: 'contact_phone',
      header: 'Telefone',
      sortable: false,
      render: (item) =>
        item.contact_phone ? (
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              color: 'var(--text-muted)',
            }}
          >
            <FontAwesomeIcon icon={faPhone} style={{ fontSize: '11px' }} />
            {item.contact_phone}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>—</span>
        ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: false,
      style: { width: '1%' },
      render: (item) => (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '12px',
            fontWeight: 600,
            padding: '3px 10px',
            borderRadius: '20px',
            background:
              item.role === 'admin'
                ? 'rgba(59, 130, 246, 0.12)'
                : 'rgba(245, 184, 191, 0.25)',
            color: item.role === 'admin' ? 'var(--info)' : 'var(--pink-dark)',
          }}
        >
          <FontAwesomeIcon icon={faShieldHalved} style={{ fontSize: '10px' }} />
          {returnRole(item.role)}
        </span>
      ),
    },
  ];

  const handleProfileLinked = (profile: Profile) => {
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
      <div
        className='flex justify-between items-center'
        style={{ marginBottom: '-15px' }}
      >
        <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: 'var(--foreground)' }}>
          {isNew ? 'Novo Afiliado' : 'Editar Afiliado'}
        </h2>
      </div>

      <Card>
        {/* SESSÃO 1: DADOS GERAIS */}
        <section style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
            Dados Gerais
          </h3>
          <div className='form-grid'>
            <div className='form-col-6'>
              <Input
                label='Nome do Afiliado'
                placeholder='Ex: João Silva'
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loadingAffiliate}
              />
              {loadingAffiliate && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Carregando dados...
                </span>
              )}
            </div>
            <div className='form-col-6'>
              <Input
                label='Comissão do Afiliado (%)'
                placeholder='Ex: 10'
                type='number'
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                disabled={loadingAffiliate}
                suffix={
                  <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>%</span>
                }
              />
            </div>
          </div>
        </section>

        <hr style={{ borderTop: '1px solid var(--border)', margin: '2rem 0' }} />

        <div className='flex flex-col lg:flex-row gap-8 items-start'>
          {/* SESSÃO 2: VÍNCULO DE PERFIL */}
          <section style={{ flex: 1, width: '100%' }}>
            <div
              className='flex justify-between items-center'
              style={{ marginBottom: '1rem' }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Vínculo de Perfil</h3>
              <div style={{ display: 'flex', gap: '8px' }}>
                {linkedProfile ? (
                  <Button
                    variant='danger'
                    outline
                    style={{ width: 'auto' }}
                    onClick={handleUnlinkProfile}
                  >
                    Desvincular
                  </Button>
                ) : (
                  <Button
                    variant='primary'
                    outline
                    style={{ width: 'auto' }}
                    onClick={handleOpenProfileModal}
                    disabled={loadingAffiliate || saving}
                  >
                    Vincular Perfil
                  </Button>
                )}
              </div>
            </div>

            {linkedProfile ? (
              <Table
                data={[linkedProfile]}
                columns={profileColumns}
                loading={loadingProfiles}
              />
            ) : (
              <div
                style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: 'var(--text-secondary, var(--text-muted))',
                  border: '1px dashed var(--border)',
                  borderRadius: '8px',
                }}
              >
                {canManageAffiliateLinks
                  ? 'Nenhum perfil vinculado a este afiliado.'
                  : 'Salve o afiliado para habilitar vínculo de perfil.'}
              </div>
            )}
          </section>

          {/* SESSÃO 3: CUPONS */}
          <div style={{ flex: 1, width: '100%' }}>
            <hr
              className='lg:hidden'
              style={{ borderTop: '1px solid var(--border)', margin: '2rem 0' }}
            />
            <section>
              <div
                className='flex justify-between items-center'
                style={{ marginBottom: '1rem' }}
              >
                <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                  Cupons de Desconto
                </h3>
                <Button
                  variant='primary'
                  outline
                  style={{ width: 'auto' }}
                  onClick={handleOpenCouponModal}
                  disabled={saving}
                >
                  Vincular Cupom
                </Button>
              </div>

              {canManageAffiliateLinks && coupons.length > 0 ? (
                <Table
                  data={coupons}
                  columns={couponColumns}
                  loading={loadingCoupons || loadingUnlink}
                />
              ) : (
                <div
                  style={{
                    padding: '2rem',
                    textAlign: 'center',
                    color: 'var(--text-secondary)',
                    border: '1px dashed var(--border)',
                    borderRadius: '8px',
                  }}
                >
                  {canManageAffiliateLinks
                    ? 'Nenhum cupom vinculado a este afiliado.'
                    : 'Cadastre o afiliado para habilitar o vínculo de cupons.'}
                </div>
              )}
            </section>
          </div>
        </div>

        <hr style={{ borderTop: '1px solid var(--border)', margin: '2rem 0' }} />

        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button
            variant='primary'
            onClick={handleSave}
            disabled={saving}
            style={{ width: 'auto' }}
          >
            {saving
              ? 'Salvando...'
              : currentAffiliateId
                ? 'Salvar Alterações'
                : 'Cadastrar Afiliado'}
          </Button>
          <Button
            variant='info'
            outline
            style={{ width: 'auto' }}
            onClick={() => router.push('/afiliados')}
          >
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
