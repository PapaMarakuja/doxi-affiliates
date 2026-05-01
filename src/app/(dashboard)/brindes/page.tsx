'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/src/components/ui/Card';
import { Button } from '@/src/components/ui/Button';
import { Modal } from '@/src/components/ui/Modal';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGift,
  faLock,
  faLockOpen,
  faTrophy,
  faMedal,
  faStar,
  faCrown,
  faCheckCircle,
  faCalendarCheck,
  faBolt,
  faBagShopping,
  faRocket,
  faBullseye,
  faChartLine,
  faSackDollar,
  faQuestionCircle,
} from '@fortawesome/free-solid-svg-icons';
import type {
  AchievementDefinition,
  AffiliateAchievement,
} from '@/src/types/achievements';
import {
  ACHIEVEMENT_METRIC_LABELS,
  REWARD_TYPE_LABELS,
} from '@/src/lib/achievements/achievementMappings';
import { useToast } from '@/src/contexts/ToastContext';

const ICON_MAP: Record<string, any> = {
  faStar,
  faBolt,
  faCalendarCheck,
  faRocket,
  faBagShopping,
  faBullseye,
  faMedal,
  faTrophy,
  faCrown,
  faGift,
};

const getIcon = (key: string | null) => {
  return key && ICON_MAP[key] ? ICON_MAP[key] : faGift;
};

export default function BrindesPage() {
  const [metrics, setMetrics] = useState({
    lifetimeCommissions: 0,
    lifetimeConversions: 0,
    monthlyCommissions: 0,
    monthlyConversions: 0,
  });
  const [loading, setLoading] = useState(true);

  const [definitions, setDefinitions] = useState<AchievementDefinition[]>([]);
  const [affiliateAchievements, setAffiliateAchievements] = useState<
    AffiliateAchievement[]
  >([]);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<AchievementDefinition | null>(
    null
  );
  const [claimingRewardId, setClaimingRewardId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [salesRes, achRes] = await Promise.all([
          fetch('/api/sales'),
          fetch('/api/achievements'),
        ]);

        if (salesRes.ok) {
          const json = await salesRes.json();
          const sales = json.data.sales || [];
          const stats = json.data.stats || { totalCommissions: 0, totalConversions: 0 };

          const now = new Date();
          let cycleStartDate = new Date(now.getFullYear(), now.getMonth(), 10);
          if (now.getDate() < 10) {
            cycleStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 10);
          }

          let mComm = 0;
          let mConv = 0;

          sales.forEach((s: any) => {
            if (s.status === 'paid') {
              const date = new Date(s.created_at);
              if (date >= cycleStartDate) {
                mComm += s.commission;
                mConv += 1;
              }
            }
          });

          setMetrics({
            lifetimeCommissions: stats.totalCommissions,
            lifetimeConversions: stats.totalConversions,
            monthlyCommissions: mComm,
            monthlyConversions: mConv,
          });
        }

        if (achRes.ok) {
          const achJson = await achRes.json();
          if (Array.isArray(achJson.data)) {
            setDefinitions(achJson.data);
          } else if (achJson.data?.definitions) {
            setDefinitions(achJson.data.definitions);
            setAffiliateAchievements(achJson.data.affiliateAchievements || []);
          }
        }
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const formatNumber = (val: number) => new Intl.NumberFormat('pt-BR').format(val);
  const formatRewardValue = (reward: AchievementDefinition) => {
    if (reward.reward_type === 'bonus_cash') {
      return formatCurrency(reward.reward_value || 0);
    }

    if (reward.reward_type === 'coupon') {
      if ((reward.reward_value || 0) > 0) {
        return `${formatCurrency(reward.reward_value)} em desconto`;
      }
      return 'Cupom exclusivo';
    }

    return 'Medalha/Brinde exclusivo';
  };

  const getRewardStyles = (rewardType: AchievementDefinition['reward_type']) => {
    if (rewardType === 'bonus_cash') {
      return {
        icon: faSackDollar,
        background: 'rgba(46, 204, 113, 0.12)',
        borderColor: 'rgba(46, 204, 113, 0.25)',
        accent: '#1f8f4d',
      };
    }

    if (rewardType === 'coupon') {
      return {
        icon: faBagShopping,
        background: 'rgba(33, 150, 243, 0.12)',
        borderColor: 'rgba(33, 150, 243, 0.25)',
        accent: '#1e6fbf',
      };
    }

    return {
      icon: faMedal,
      background: 'rgba(241, 196, 15, 0.14)',
      borderColor: 'rgba(241, 196, 15, 0.28)',
      accent: '#a97700',
    };
  };

  const { addToast } = useToast();

  const handleClaim = async (reward: AchievementDefinition) => {
    try {
      setClaimingRewardId(reward.id);

      const res = await fetch('/api/achievements/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievement_id: reward.id }),
      });

      if (res.ok) {
        const result = await res.json();
        const claimedAch = result.data;

        setAffiliateAchievements((prev) => {
          const rewardId = Number(reward.id);
          const currentIndex = prev.findIndex(
            (a) =>
              a.achievement_id === rewardId || a.achievement_id.toString() === reward.id
          );

          if (currentIndex >= 0) {
            return prev.map((a, index) =>
              index === currentIndex
                ? {
                  ...a,
                  ...claimedAch,
                  reward_claimed: true,
                  reward_claimed_at:
                    claimedAch?.reward_claimed_at ?? new Date().toISOString(),
                }
                : a
            );
          }

          if (claimedAch) {
            return [...prev, { ...claimedAch, reward_claimed: true }];
          }

          return [
            ...prev,
            {
              id: `local-${reward.id}-${Date.now()}`,
              affiliate_id: '',
              achievement_id: rewardId,
              unlocked_at: new Date().toISOString(),
              reward_claimed: true,
              reward_claimed_at: new Date().toISOString(),
              value_at_unlock: 0,
            },
          ];
        });

        setSelectedReward(reward);
        setIsModalOpen(true);
      } else {
        const err = await res.json();
        addToast({ message: err.error || 'Erro ao resgatar o prêmio.', type: 'error' });
      }
    } catch (err) {
      console.error(err);
      addToast({ message: 'Erro de conexão ao resgatar o prêmio.', type: 'error' });
    } finally {
      setClaimingRewardId(null);
    }
  };

  const getSortedRewards = (rewards: AchievementDefinition[], isMonthly: boolean) => {
    return [...rewards].sort((a, b) => {
      const aVal = isMonthly
        ? a.metric === 'cycle_conversions'
          ? metrics.monthlyConversions
          : metrics.monthlyCommissions
        : a.metric === 'total_conversions'
          ? metrics.lifetimeConversions
          : metrics.lifetimeCommissions;
      const bVal = isMonthly
        ? b.metric === 'cycle_conversions'
          ? metrics.monthlyConversions
          : metrics.monthlyCommissions
        : b.metric === 'total_conversions'
          ? metrics.lifetimeConversions
          : metrics.lifetimeCommissions;

      const aUnlocked = aVal >= a.goal;
      const bUnlocked = bVal >= b.goal;

      if (aUnlocked && !bUnlocked) return -1;
      if (!aUnlocked && bUnlocked) return 1;

      const aProgress = Math.min(100, (aVal / a.goal) * 100);
      const bProgress = Math.min(100, (bVal / b.goal) * 100);

      return bProgress - aProgress;
    });
  };

  const renderRewardCard = (reward: AchievementDefinition, isMonthly: boolean) => {
    const currentValue = isMonthly
      ? reward.metric === 'cycle_conversions'
        ? metrics.monthlyConversions
        : metrics.monthlyCommissions
      : reward.metric === 'total_conversions'
        ? metrics.lifetimeConversions
        : metrics.lifetimeCommissions;

    const isUnlocked = currentValue >= reward.goal;
    const progress = Math.min(100, (currentValue / reward.goal) * 100);
    const isCurrency = reward.metric.includes('commission');
    const color = reward.color_hex || '#2196f3';

    const isEligibleForMystery =
      !isMonthly &&
      ((reward.metric === 'total_conversions' && reward.goal >= 100) ||
        (reward.metric === 'total_commission' && reward.goal >= 1000));
    const isMystery = isEligibleForMystery && !isUnlocked && progress < 15;

    const affAch = affiliateAchievements.find(
      (a) =>
        a.achievement_id === Number(reward.id) ||
        a.achievement_id.toString() === reward.id
    );
    const isClaimed = affAch?.reward_claimed || false;
    const rewardStyles = getRewardStyles(reward.reward_type);
    const rewardLabel = REWARD_TYPE_LABELS[reward.reward_type];
    const rewardValue = formatRewardValue(reward);

    return (
      <Card
        key={reward.id}
        style={{
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          border: isUnlocked ? `1px solid ${color}40` : '1px solid var(--border)',
          boxShadow: isUnlocked ? `0 8px 24px ${color}15` : 'none',
          opacity: isUnlocked ? 1 : 0.8,
        }}
      >
        {/* Badge de Status */}
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: isUnlocked ? `${color}15` : 'var(--hover)',
            color: isUnlocked ? color : 'var(--text-muted)',
            padding: '4px 10px',
            borderRadius: '100px',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            zIndex: 2,
          }}
        >
          <FontAwesomeIcon icon={isUnlocked ? faLockOpen : faLock} />
          {isClaimed ? 'Resgatado' : isUnlocked ? 'Liberado!' : 'A Caminho'}
        </div>

        {/* Mistério Overlay */}
        {isMystery && (
          <div
            style={{
              position: 'absolute',
              top: '40%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: '64px',
              color: 'var(--text-muted)',
              opacity: 0.3,
              zIndex: 1,
            }}
          >
            <FontAwesomeIcon icon={faGift} />
          </div>
        )}

        {/* Conteúdo com Blur (se distante) */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            filter: isMystery ? 'blur(6px)' : 'none',
            transition: 'filter 0.3s ease',
            userSelect: isMystery ? 'none' : 'auto',
            zIndex: 2,
          }}
        >
          {/* Ícone */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: isUnlocked ? `${color}15` : 'var(--hover)',
              color: isUnlocked ? color : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              marginBottom: '20px',
              transition: 'transform 0.3s ease',
              transform: isUnlocked ? 'scale(1.1)' : 'scale(1)',
            }}
          >
            <FontAwesomeIcon icon={getIcon(reward.icon_key)} />
          </div>

          <h4
            style={{ margin: '0 0 8px 0', fontSize: '18px', color: 'var(--text-main)' }}
          >
            {reward.title}
          </h4>
          <p
            style={{
              margin: '0 0 16px 0',
              fontSize: '14px',
              color: 'var(--text-muted)',
            }}
          >
            {reward.description}
          </p>
          <div
            style={{
              marginBottom: '16px',
              border: `1px solid ${rewardStyles.borderColor}`,
              background: rewardStyles.background,
              borderRadius: '10px',
              padding: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.65)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: rewardStyles.accent,
                flexShrink: 0,
              }}
            >
              <FontAwesomeIcon icon={rewardStyles.icon} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.2 }}
              >
                Recompensa: {rewardLabel}
              </div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 700,
                  color: rewardStyles.accent,
                  lineHeight: 1.2,
                }}
              >
                {rewardValue}
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 'auto', zIndex: 2 }}>
          {isUnlocked && !isClaimed ? (
            <Button
              style={{
                width: '100%',
                background: color,
                borderColor: color,
                color: '#fff',
              }}
              onClick={() => handleClaim(reward)}
              loading={claimingRewardId === reward.id}
              disabled={claimingRewardId === reward.id}
            >
              <FontAwesomeIcon icon={faGift} style={{ marginRight: '8px' }} />
              Resgatar meu Presente
            </Button>
          ) : isClaimed ? (
            <Button
              disabled
              style={{
                width: '100%',
                background: color,
                borderColor: color,
                color: '#fff',
                cursor: 'not-allowed',
              }}
            >
              <FontAwesomeIcon icon={faCheckCircle} style={{ marginRight: '8px' }} />
              Conquista Resgatada
            </Button>
          ) : (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '13px',
                  marginBottom: '6px',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>Seu avanço</span>
                <span style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                  {isCurrency ? formatCurrency(currentValue) : formatNumber(currentValue)}{' '}
                  / {isCurrency ? formatCurrency(reward.goal) : formatNumber(reward.goal)}{' '}
                  {isCurrency ? '' : 'vendas'}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  background: 'var(--hover)',
                  borderRadius: '100px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: '100%',
                    background: 'var(--text-muted)',
                    borderRadius: '100px',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const missions = definitions.filter((d) => d.reset_period !== 'never');
  const achievementsSales = definitions.filter(
    (d) => d.reset_period === 'never' && d.metric === 'total_conversions'
  );
  const achievementsCommission = definitions.filter(
    (d) => d.reset_period === 'never' && d.metric === 'total_commission'
  );

  return (
    <div className='flex flex-col gap-8'>
      {/* HEADER GAMIFICADO */}
      <Card
        style={{
          padding: '32px',
          background:
            'linear-gradient(135deg, rgba(33, 150, 243, 0.1) 0%, rgba(156, 39, 176, 0.1) 100%)',
          border: '1px solid rgba(156, 39, 176, 0.2)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #2196f3 0%, #9c27b0 100%)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              boxShadow: '0 8px 16px rgba(156, 39, 176, 0.2)',
            }}
          >
            <FontAwesomeIcon icon={faCrown} />
          </div>
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'var(--text-main)',
              }}
            >
              Clube de Recompensas
            </h2>
            <p
              style={{
                margin: '4px 0 0 0',
                color: 'var(--text-muted)',
                fontSize: '15px',
              }}
            >
              Aproveite nossos bônus a cada ciclo e resgate presentes incríveis conforme
              você cresce com a Doxi!
            </p>
          </div>
        </div>

        {/* ESTATÍSTICAS RÁPIDAS */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--card-bg)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FontAwesomeIcon icon={faBagShopping} /> Vendas Totais
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'var(--text-main)',
                marginTop: '8px',
              }}
            >
              {loading ? (
                <Skeleton width="100px" height="34px" />
              ) : (
                formatNumber(metrics.lifetimeConversions)
              )}
            </div>
          </div>

          <div
            style={{
              background: 'var(--card-bg)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FontAwesomeIcon icon={faSackDollar} /> Comissão Total
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'var(--text-main)',
                marginTop: '8px',
              }}
            >
              {loading ? (
                <Skeleton width="120px" height="34px" />
              ) : (
                formatCurrency(metrics.lifetimeCommissions)
              )}
            </div>
          </div>

          <div
            style={{
              background: 'var(--card-bg)',
              padding: '16px',
              borderRadius: '12px',
              border: '1px solid var(--border)',
            }}
          >
            <div
              style={{
                color: 'var(--text-muted)',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <FontAwesomeIcon icon={faChartLine} /> Vendas no Ciclo Atual
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 'bold',
                color: 'var(--text-main)',
                marginTop: '8px',
              }}
            >
              {loading ? (
                <Skeleton width="100px" height="34px" />
              ) : (
                formatNumber(metrics.monthlyConversions)
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* BÔNUS EXTRAS DO CICLO */}
      {missions.length > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-main)' }}>
              Bônus Extras do Ciclo
            </h3>
            <span
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                background: 'var(--hover)',
                padding: '4px 8px',
                borderRadius: '100px',
              }}
            >
              Recomeça todo dia 1° do mês
            </span>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6'>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} style={{ padding: '24px', height: '300px' }}>
                  <Skeleton circle width="64px" height="64px" className="mb-4" />
                  <Skeleton width="60%" height="24px" className="mb-2" />
                  <Skeleton width="90%" height="16px" className="mb-4" />
                  <Skeleton width="100%" height="44px" className="mt-auto" />
                </Card>
              ))
            ) : (
              getSortedRewards(missions, true).map((reward) =>
                renderRewardCard(reward, true)
              )
            )}
          </div>
        </div>
      )}

      {/* PRÊMIOS POR QUANTIDADE DE VENDAS */}
      {achievementsSales.length > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-main)' }}>
              Prêmios por Quantidade de Vendas
            </h3>
            <span
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                background: 'var(--hover)',
                padding: '4px 8px',
                borderRadius: '100px',
              }}
            >
              Seus presentes vitalícios
            </span>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6'>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} style={{ padding: '24px', height: '300px' }}>
                  <Skeleton circle width="64px" height="64px" className="mb-4" />
                  <Skeleton width="60%" height="24px" className="mb-2" />
                  <Skeleton width="90%" height="16px" className="mb-4" />
                  <Skeleton width="100%" height="44px" className="mt-auto" />
                </Card>
              ))
            ) : (
              getSortedRewards(achievementsSales, false).map((reward) =>
                renderRewardCard(reward, false)
              )
            )}
          </div>
        </div>
      )}

      {/* PRÊMIOS POR COMISSÕES ACUMULADAS */}
      {achievementsCommission.length > 0 && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            <h3 style={{ margin: 0, fontSize: '20px', color: 'var(--text-main)' }}>
              Prêmios por Comissões Acumuladas
            </h3>
            <span
              style={{
                fontSize: '13px',
                color: 'var(--text-muted)',
                background: 'var(--hover)',
                padding: '4px 8px',
                borderRadius: '100px',
              }}
            >
              Seus presentes vitalícios
            </span>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6'>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} style={{ padding: '24px', height: '300px' }}>
                  <Skeleton circle width="64px" height="64px" className="mb-4" />
                  <Skeleton width="60%" height="24px" className="mb-2" />
                  <Skeleton width="90%" height="16px" className="mb-4" />
                  <Skeleton width="100%" height="44px" className="mt-auto" />
                </Card>
              ))
            ) : (
              getSortedRewards(achievementsCommission, false).map((reward) =>
                renderRewardCard(reward, false)
              )
            )}
          </div>
        </div>
      )}

      {/* MODAL DE REIVINDICAÇÃO */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title='Parabéns, você conseguiu! 🎉'
        size='md'
      >
        {selectedReward && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div
              style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: `${selectedReward.color_hex || '#2196f3'}15`,
                color: selectedReward.color_hex || '#2196f3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '36px',
                margin: '0 auto 24px auto',
              }}
            >
              <FontAwesomeIcon icon={faCheckCircle} />
            </div>

            <h3
              style={{
                margin: '0 0 12px 0',
                fontSize: '22px',
                color: 'var(--text-main)',
              }}
            >
              Você liberou: {selectedReward.title}
            </h3>

            <p
              style={{
                margin: '0 0 24px 0',
                fontSize: '15px',
                color: 'var(--text-muted)',
                lineHeight: 1.5,
              }}
            >
              Nossa equipe já foi avisada do seu sucesso! Em até 48 horas úteis, você
              receberá um e-mail com todos os detalhes de como receber o seu presente:
              <br />
              <br />
              <strong>{selectedReward.description}</strong>
            </p>

            <div
              style={{
                background: 'var(--hover)',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '24px',
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                Meta Atingida
              </span>
              <div
                style={{
                  fontSize: '18px',
                  fontWeight: 'bold',
                  color: 'var(--text-main)',
                  marginTop: '4px',
                }}
              >
                {ACHIEVEMENT_METRIC_LABELS[selectedReward.metric] ||
                  selectedReward.metric}
                :{' '}
                {selectedReward.metric.includes('commission')
                  ? formatCurrency(selectedReward.goal)
                  : formatNumber(selectedReward.goal)}
              </div>
            </div>

            <Button style={{ width: '100%' }} onClick={() => setIsModalOpen(false)}>
              Perfeito, muito obrigada!
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
