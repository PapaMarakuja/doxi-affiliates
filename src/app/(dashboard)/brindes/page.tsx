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
  faMedal,
  faCrown,
  faCheckCircle,
  faBagShopping,
  faChartLine,
  faSackDollar,
} from '@fortawesome/free-solid-svg-icons';
import type {
  AchievementDefinition,
  AffiliateAchievement,
} from '@/src/types/achievements';
import {
  ACHIEVEMENT_METRIC_LABELS,
  REWARD_TYPE_LABELS,
} from '@/src/lib/achievements/achievementMappings';
import { useToast } from "@/src/contexts/ToastContext";
import { getAchievementIcon } from "@/src/lib/achievements/iconMap";
import { cn, formatCurrency, formatNumber } from "@/src/lib/utils";
import { Badge } from "@/src/components/ui/Badge";

interface SaleSummary {
  status: string;
  created_at: string;
  commission: number;
}


// Achievement color comes from the DB, so it is passed as a CSS variable.
const rewardColorStyle = (colorHex: string | null | undefined) =>
  ({ "--reward-color": colorHex || "var(--info)" }) as React.CSSProperties;

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

          sales.forEach((s: SaleSummary) => {
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
    const prizeIcon = reward.reward_type === 'bonus_cash'
      ? faSackDollar
      : reward.reward_type === 'coupon'
        ? faBagShopping
        : faMedal;

    return (
      <Card
        key={reward.id}
        className={cn('reward-card', isUnlocked && 'reward-card--unlocked')}
        style={rewardColorStyle(reward.color_hex)}
      >
        <Badge className="reward-status">
          <FontAwesomeIcon icon={isUnlocked ? faLockOpen : faLock} />
          {isClaimed ? 'Resgatado' : isUnlocked ? 'Liberado!' : 'A Caminho'}
        </Badge>

        {isMystery && (
          <div className="reward-mystery">
            <FontAwesomeIcon icon={faGift} />
          </div>
        )}

        <div className={cn('reward-body', isMystery && 'reward-body--blurred')}>
          <div className="reward-icon">
            <FontAwesomeIcon icon={getAchievementIcon(reward.icon_key)} />
          </div>

          <h4 className="mb-2 text-lg font-bold text-main">{reward.title}</h4>
          <p className="mb-4 text-sm text-muted">{reward.description}</p>

          <div className={`reward-prize reward-prize--${reward.reward_type}`}>
            <div className="reward-prize-icon">
              <FontAwesomeIcon icon={prizeIcon} />
            </div>
            <div className="min-w-0">
              <div className="text-xs leading-tight text-muted">
                Recompensa: {REWARD_TYPE_LABELS[reward.reward_type]}
              </div>
              <div className="reward-prize-value">{formatRewardValue(reward)}</div>
            </div>
          </div>
        </div>

        <div className="relative z-[2] mt-auto">
          {isUnlocked && !isClaimed ? (
            <Button
              className="reward-claim-btn gap-2"
              onClick={() => handleClaim(reward)}
              loading={claimingRewardId === reward.id}
              disabled={claimingRewardId === reward.id}
            >
              <FontAwesomeIcon icon={faGift} />
              Resgatar meu Presente
            </Button>
          ) : isClaimed ? (
            <Button disabled className="reward-claim-btn gap-2">
              <FontAwesomeIcon icon={faCheckCircle} />
              Conquista Resgatada
            </Button>
          ) : (
            <div>
              <div className="mb-1.5 flex justify-between text-[13px]">
                <span className="text-muted">Seu avanço</span>
                <span className="font-bold text-main">
                  {isCurrency ? formatCurrency(currentValue) : formatNumber(currentValue)}{' '}
                  / {isCurrency ? formatCurrency(reward.goal) : formatNumber(reward.goal)}{' '}
                  {isCurrency ? '' : 'vendas'}
                </span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  };

  const renderRewardSection = (title: string, tag: string, rewards: AchievementDefinition[], isMonthly: boolean) => {
    if (rewards.length === 0) return null;
    return (
      <section>
        <div className="mb-5 flex flex-wrap items-baseline gap-3">
          <h3 className="section-title text-xl">{title}</h3>
          <span className="rewards-section-tag">{tag}</span>
        </div>

        <div className='grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4'>
          {loading
            ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="flex h-[300px] flex-col p-6">
                <Skeleton circle width="64px" height="64px" className="mb-4" />
                <Skeleton width="60%" height="24px" className="mb-2" />
                <Skeleton width="90%" height="16px" className="mb-4" />
                <Skeleton width="100%" height="44px" className="mt-auto" />
              </Card>
            ))
            : getSortedRewards(rewards, isMonthly).map((reward) => renderRewardCard(reward, isMonthly))}
        </div>
      </section>
    );
  };

  const missions = definitions.filter((d) => d.reset_period !== 'never');
  const achievementsSales = definitions.filter(
    (d) => d.reset_period === 'never' && d.metric === 'total_conversions'
  );
  const achievementsCommission = definitions.filter(
    (d) => d.reset_period === 'never' && d.metric === 'total_commission'
  );

  const quickStats = [
    { icon: faBagShopping, label: 'Vendas Totais', value: formatNumber(metrics.lifetimeConversions) },
    { icon: faSackDollar, label: 'Comissão Total', value: formatCurrency(metrics.lifetimeCommissions) },
    { icon: faChartLine, label: 'Vendas no Ciclo Atual', value: formatNumber(metrics.monthlyConversions) },
  ];

  return (
    <div className='flex flex-col gap-8'>
      <Card className="rewards-hero p-6 sm:p-8">
        <div className="mb-8 flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
          <div className="rewards-hero-icon">
            <FontAwesomeIcon icon={faCrown} />
          </div>
          <div className="flex flex-col gap-1">
            <h2 className="page-title">Clube de Recompensas</h2>
            <p className="section-desc text-[15px]">
              Aproveite nossos bônus a cada ciclo e resgate presentes incríveis conforme
              você cresce com a Doxi!
            </p>
          </div>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          {quickStats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-line bg-card p-4">
              <div className="metric-label flex items-center gap-2">
                <FontAwesomeIcon icon={stat.icon} /> {stat.label}
              </div>
              <div className="metric-value mt-2">
                {loading ? <Skeleton width="110px" height="32px" /> : stat.value}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {renderRewardSection('Bônus Extras do Ciclo', 'Recomeça todo dia 1° do mês', missions, true)}
      {renderRewardSection('Prêmios por Quantidade de Vendas', 'Seus presentes vitalícios', achievementsSales, false)}
      {renderRewardSection('Prêmios por Comissões Acumuladas', 'Seus presentes vitalícios', achievementsCommission, false)}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title='Parabéns, você conseguiu! 🎉'
        size='md'
      >
        {selectedReward && (
          <div className="py-5 text-center" style={rewardColorStyle(selectedReward.color_hex)}>
            <div className="reward-icon reward-icon--active mx-auto mb-6 h-20 w-20 text-4xl">
              <FontAwesomeIcon icon={faCheckCircle} />
            </div>

            <h3 className="mb-3 text-[22px] font-bold text-main">
              Você liberou: {selectedReward.title}
            </h3>

            <p className="mb-6 text-[15px] leading-normal text-muted">
              Nossa equipe já foi avisada do seu sucesso! Em até 48 horas úteis, você
              receberá um e-mail com todos os detalhes de como receber o seu presente:
              <br />
              <br />
              <strong>{selectedReward.description}</strong>
            </p>

            <div className="soft-panel mb-6">
              <span className="metric-label">Meta Atingida</span>
              <div className="mt-1 text-lg font-bold text-main">
                {ACHIEVEMENT_METRIC_LABELS[selectedReward.metric] ||
                  selectedReward.metric}
                :{' '}
                {selectedReward.metric.includes('commission')
                  ? formatCurrency(selectedReward.goal)
                  : formatNumber(selectedReward.goal)}
              </div>
            </div>

            <Button onClick={() => setIsModalOpen(false)}>
              Perfeito, muito obrigada!
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
}
