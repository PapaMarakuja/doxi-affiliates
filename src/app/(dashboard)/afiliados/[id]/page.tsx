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
  faSave,
  faArrowLeft,
  faIdCard,
  faRandom,
  faChevronDown,
  faRotate,
  faCopy,
  faTimes,
} from '@fortawesome/free-solid-svg-icons';
import type { Affiliate, Coupon, Profile } from '@/src/types';
import { returnRole } from '@/src/lib/utils';
import { useConfirmDialog } from '@/src/contexts/ConfirmDialogContext';
import { applyPixMask, guessPixType, maskPhone } from '@/src/lib/masks';

const PIX_TYPES = [
  { value: "cpf_cnpj", label: "CPF/CNPJ", icon: faIdCard },
  { value: "phone", label: "Celular", icon: faPhone },
  { value: "email", label: "E-mail", icon: faEnvelope },
  { value: "random", label: "Aleatória", icon: faRandom }
] as const;

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

  // New fields on Affiliate
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [pixKey, setPixKey] = useState('');
  const [manualPixType, setManualPixType] = useState<'cpf_cnpj' | 'phone' | 'email' | 'random' | null>(null);

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
      pix_key: pixKey.trim() || null,
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

  const handleCopyClubLink = async (item: any) => {
    console.log("🚀 ~ handleCopyClubLink ~ item:", item)
    const textToCopy = `Dados de Acesso - Doxi Affiliates\n\nUsuário: ${item.name}\nSenha: ${item.temp_password}\n\nLink: ${window.location.origin}/login`;
    try {
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
            variant="info"
            circle
            size="sm"
            onClick={() => handleEditCoupon(item)}
            title="Editar Cupom"
          >
            <FontAwesomeIcon icon={faPen} style={{ fontSize: "11px" }} />
          </Button>

          <Button
            variant="danger"
            circle
            size="sm"
            onClick={() => handleUnlinkCoupon(item)}
            title="Desvincular Cupom"
          >
            <FontAwesomeIcon icon={faUnlink} style={{ fontSize: "11px" }} />
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
      key: 'role',
      header: 'Role',
      sortable: false,
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
    {
      key: 'temp_password',
      header: 'Senha Temporária',
      sortable: false,
      render: (item) =>
        item.temp_password ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              fontFamily: 'monospace',
              background: 'var(--hover)',
              padding: '4px 8px',
              borderRadius: '6px',
              color: 'var(--text-main)',
              cursor: 'pointer',
              border: '1px solid var(--border)',
            }}
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
            <FontAwesomeIcon icon={faCopy} style={{ fontSize: '11px', color: 'var(--pink-dark)' }} />
            {item.temp_password}
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>—</span>
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
            <FontAwesomeIcon icon={faCopy} style={{ fontSize: "11px" }} />
          </Button>
        </div>
      ),
    }
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
        className='flex items-center gap-4'
        style={{ marginBottom: '8px' }}
      >
        <button
          onClick={handleCancel}
          style={{
            background: "var(--hover)",
            border: "1px solid var(--border)",
            color: "var(--text-main)",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "transform 0.15s, background-color 0.15s",
            outline: "none"
          }}
          title="Voltar"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.05)";
            e.currentTarget.style.background = "var(--border)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.background = "var(--hover)";
          }}
        >
          <FontAwesomeIcon icon={faArrowLeft} style={{ fontSize: "14px" }} />
        </button>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: 'var(--text-main)', margin: 0 }}>
            {isNew ? 'Cadastrar Novo Afiliado' : 'Editar Afiliado'}
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '4px' }}>
            {isNew ? 'Crie um afiliado na plataforma para vincular cupons e usuários.' : `Gerencie os dados e configurações do afiliado ${name}.`}
          </p>
        </div>
      </div>

      <Card>
        {/* SESSÃO 1: DADOS GERAIS */}
        <section style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
            Dados Gerais
          </h3>
          <div className='form-grid'>
            <div className='form-col-4'>
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
            <div className='form-col-4'>
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
              {(() => {
                const currentPixType = manualPixType || guessPixType(pixKey || "");
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
                        const type = e.target.value as any;
                        setManualPixType(type);
                        const rawValue = type === "phone" || type === "cpf_cnpj" ? pixKey.replace(/\D/g, "") : pixKey;
                        const masked = applyPixMask(rawValue, type);
                        setPixKey(masked);
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
                    label="Chave Pix"
                    value={pixKey}
                    onChange={(e) => {
                      const type = manualPixType || guessPixType(e.target.value);
                      setPixKey(applyPixMask(e.target.value, type));
                    }}
                    placeholder="CPF, e-mail, telefone..."
                    disabled={loadingAffiliate}
                    suffix={pixSelector}
                  />
                );
              })()}
            </div>
          </div>
        </section>

        <hr style={{ borderTop: '1px solid var(--border)', margin: '2rem 0' }} />

        <div className='flex flex-col lg:flex-row gap-8 items-start'>
          <section style={{ flex: 1, width: '100%' }}>
            <div
              className='flex justify-between items-center'
              style={{ marginBottom: '1rem' }}
            >
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>Vínculo de Perfil/Usuário</h3>
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

        <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
          <Button
            variant='primary'
            onClick={() => handleSave(true)}
            disabled={saving}
            style={{ width: 'auto' }}
          >
            <FontAwesomeIcon icon={faSave} style={{ marginRight: '8px' }} />
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
            onClick={handleCancel}
          >
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
