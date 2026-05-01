'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTicket,
  faCoins,
  faCalendarDay,
  faBagShopping,
  faArrowsRotate,
  faLock,
  faCircleCheck,
  faChartSimple,
  faCloudArrowDown,
} from '@fortawesome/free-solid-svg-icons';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { DashboardData } from '@/src/types';
import { useConfirmDialog } from '@/src/contexts/ConfirmDialogContext';
import { Skeleton } from '@/src/components/ui/Skeleton';

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatBRL = (value: number) => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
};

const formatNumber = (value: number) => {
  return value.toLocaleString('pt-BR');
};

const SYNC_COOLDOWN_SECONDS = 60 * 60;

const AFFILIATE_VISIBLE_STATS = new Set([
  'coupon-sales',
  'total-commissions',
  'monthly-commissions',
]);

// ── Custom Tooltip ─────────────────────────────────────────────────────────────

interface TooltipPayloadItem {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className='dash-chart-tooltip-wrapper'>
        <div className='dash-chart-tooltip-header'>
          <span className='dash-chart-tooltip-dot' />
          <span className='dash-chart-tooltip-label'>{label}</span>
        </div>
        <div className='dash-chart-tooltip-body'>
          <span className='dash-chart-tooltip-value'>{formatBRL(payload[0].value)}</span>
          <span className='dash-chart-tooltip-sub'>Comissão total</span>
        </div>
      </div>
    );
  }
  return null;
};

// ── Component ──────────────────────────────────────────────────────────────────

type ChartMode = 'monthly' | 'daily';

const EMPTY_CHART = Array.from({ length: 12 }, (_, i) => ({
  label: [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ][i],
  value: 0,
}));

const EMPTY_DAILY = [
  { label: 'Segunda', value: 0 },
  { label: 'Terça', value: 0 },
  { label: 'Quarta', value: 0 },
  { label: 'Quinta', value: 0 },
  { label: 'Sexta', value: 0 },
  { label: 'Sábado', value: 0 },
  { label: 'Domingo', value: 0 },
];

export default function DashboardContent() {
  const [chartMode, setChartMode] = useState<ChartMode>('monthly');
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [syncing, setSyncing] = useState(false);
  const [fullSyncing, setFullSyncing] = useState(false);
  const [lastSyncSuccess, setLastSyncSuccess] = useState(false);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [dashData, setDashData] = useState<DashboardData | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const confirm = useConfirmDialog();

  // Carrega dados do dashboard na montagem (sem sincronizar)
  useEffect(() => {
    async function loadInitialData() {
      try {
        const res = await fetch('/api/sync');
        if (res.ok) {
          const json = await res.json();
          if (json.data) setDashData(json.data);
        }
      } catch {
        // Silencioso — dados não carregados
      } finally {
        setInitialLoading(false);
      }
    }
    loadInitialData();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const isAdmin = dashData?.isAdmin ?? false;
  const lastSyncedAtMs = dashData?.lastSyncedAt
    ? new Date(dashData.lastSyncedAt).getTime()
    : null;
  const cooldown =
    lastSyncedAtMs && Number.isFinite(lastSyncedAtMs)
      ? Math.max(
        0,
        Math.ceil((lastSyncedAtMs + SYNC_COOLDOWN_SECONDS * 1000 - nowMs) / 1000)
      )
      : 0;
  const inCooldown = cooldown > 0;

  async function shouldProceedWithAdminCooldown() {
    if (!isAdmin || !inCooldown) return true;

    return confirm({
      title: 'Sincronização em cooldown',
      message: `A última sincronização foi recente. Deseja continuar mesmo assim? Tempo restante: ${formatRemainingTime(cooldown)}.`,
      confirmText: 'Sincronizar mesmo assim',
      cancelText: 'Cancelar',
      type: 'warning',
      allowClickOutside: true,
    });
  }

  async function handleSync() {
    if (syncing || fullSyncing) return;
    if (!isAdmin && inCooldown) return;

    const proceed = await shouldProceedWithAdminCooldown();
    if (!proceed) return;

    setSyncing(true);
    setLastSyncSuccess(false);

    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setDashData(json.data);
          setLastSyncSuccess(true);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSyncing(false);
    }
  }

  async function handleFullSync() {
    if (fullSyncing || syncing) return;

    const proceed = await shouldProceedWithAdminCooldown();
    if (!proceed) return;

    setFullSyncing(true);
    setLastSyncSuccess(false);

    try {
      const res = await fetch('/api/sync/full', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setDashData(json.data);
          setLastSyncSuccess(true);
        }
      } else {
        const json = await res.json();
        console.error('Full sync error:', json.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setFullSyncing(false);
    }
  }

  const canSync = isAdmin
    ? !syncing && !fullSyncing
    : !inCooldown && !syncing && !fullSyncing;

  // Stats derivados dos dados reais
  const stats = [
    {
      id: 'active-coupons',
      label: 'Cupons Ativos',
      icon: faTicket,
      value: dashData ? formatNumber(dashData.stats.activeCoupons) : '—',
      accentClass: 'stat-card-icon--pink',
    },
    {
      id: 'coupon-sales',
      label: 'Vendas Totais',
      icon: faBagShopping,
      value: dashData ? formatNumber(dashData.stats.couponSales) : '—',
      accentClass: 'stat-card-icon--amber',
    },
    {
      id: 'total-revenue',
      label: 'Receita Total',
      icon: faChartSimple,
      value: dashData ? formatBRL(dashData.stats.totalRevenue) : '—',
      accentClass: 'stat-card-icon--navy',
    },
    {
      id: 'monthly-revenue',
      label: 'Receita do Mês',
      icon: faChartSimple,
      value: dashData ? formatBRL(dashData.stats.monthlyRevenue) : '—',
      accentClass: 'stat-card-icon--navy',
    },
    {
      id: 'total-commissions',
      label: 'Comissões Totais',
      icon: faCoins,
      value: dashData ? formatBRL(dashData.stats.totalCommissions) : '—',
      accentClass: 'stat-card-icon--green',
    },
    {
      id: 'monthly-commissions',
      label: 'Comissões do Mês',
      icon: faCalendarDay,
      value: dashData ? formatBRL(dashData.stats.monthlyCommissions) : '—',
      accentClass: 'stat-card-icon--blue',
    },
  ];
  const visibleStats = isAdmin
    ? stats
    : stats.filter((stat) => AFFILIATE_VISIBLE_STATS.has(stat.id));

  const chartMonthlyData = dashData?.chartMonthly ?? EMPTY_CHART;
  const chartDailyData = dashData?.chartDaily ?? EMPTY_DAILY;

  return (
    <div className='dash-page'>
      <div className='dash-stats-grid'>
        {visibleStats.map((stat) => (
          <div
            key={stat.id}
            className={`dash-stat-card ${initialLoading ? 'dash-stat-card--skeleton' : ''}`}
          >
            <div className={`dash-stat-icon-wrapper ${stat.accentClass}`}>
              <FontAwesomeIcon icon={stat.icon} />
            </div>
            <div className='dash-stat-content'>
              <span className='dash-stat-label'>{stat.label}</span>
              <div className='dash-stat-value'>
                {initialLoading ? (
                  <Skeleton width="100px" height="28px" />
                ) : (
                  stat.value
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className='dash-main-card'>
        <div className='dash-chart-header'>
          <h3 className='dash-chart-title'>
            <FontAwesomeIcon
              icon={faChartSimple}
              className='text-muted mr-2'
              style={{ fontSize: '16px' }}
            />
            Desempenho de Comissões
          </h3>
          <div className='dash-chart-controls'>
            <button
              className={`dash-chart-btn ${chartMode === 'monthly' ? 'dash-chart-btn--active' : ''}`}
              onClick={() => setChartMode('monthly')}
            >
              Mensal
            </button>
            <button
              className={`dash-chart-btn ${chartMode === 'daily' ? 'dash-chart-btn--active' : ''}`}
              onClick={() => setChartMode('daily')}
            >
              Diário
            </button>
          </div>
        </div>

        <div className='dash-chart-container'>
          <ResponsiveContainer width='100%' height='100%'>
            {chartMode === 'daily' ? (
              <AreaChart
                data={chartDailyData}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
              >
                <defs>
                  <linearGradient id='colorValue' x1='0' y1='0' x2='0' y2='1'>
                    <stop offset='5%' stopColor='#F1A4AC' stopOpacity={0.3} />
                    <stop offset='95%' stopColor='#F1A4AC' stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray='3 3'
                  vertical={false}
                  stroke='var(--border)'
                  opacity={0.5}
                />
                <XAxis
                  dataKey='label'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  tickFormatter={(v) => `R$ ${v}`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type='monotone'
                  dataKey='value'
                  stroke='#F1A4AC'
                  strokeWidth={5}
                  fillOpacity={1}
                  fill='url(#colorValue)'
                  activeDot={{ r: 8, strokeWidth: 0, fill: '#F1A4AC' }}
                />
              </AreaChart>
            ) : (
              <BarChart
                data={chartMonthlyData}
                margin={{ top: 10, right: 10, left: 0, bottom: 10 }}
                onMouseMove={(state) => {
                  if (typeof state.activeTooltipIndex === 'number') {
                    setHoverIndex(state.activeTooltipIndex);
                  } else {
                    setHoverIndex(null);
                  }
                }}
                onMouseLeave={() => setHoverIndex(null)}
              >
                <CartesianGrid
                  strokeDasharray='3 3'
                  vertical={false}
                  stroke='var(--border)'
                  opacity={0.5}
                />
                <XAxis
                  dataKey='label'
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
                  tickFormatter={(v) => `R$ ${v}`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(241, 164, 172, 0.05)' }}
                  content={<CustomTooltip />}
                />
                <Bar dataKey='value' fill='#F1A4AC' radius={[6, 6, 0, 0]} barSize={60}>
                  {chartMonthlyData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fillOpacity={hoverIndex === null || hoverIndex === index ? 1 : 0.6}
                      className='transition-all duration-300'
                    />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className='dash-footer-sync'>
          <div className='dash-sync-message'>
            {lastSyncSuccess && (
              <>
                <FontAwesomeIcon icon={faCircleCheck} />
                <span>
                  Última sincronização realizada com sucesso
                  {dashData?.syncResult
                    ? ` — ${dashData.syncResult.synced} pedido(s) sincronizado(s)`
                    : ''}
                </span>
              </>
            )}
          </div>

          <div className='dash-sync-actions'>
            {/* Botão de Sync Completo — apenas para admin */}
            {isAdmin && (
              <button
                className={`ui-button w-fit dash-sync-btn ${fullSyncing ? '' : 'ui-button--warning'}`}
                onClick={handleFullSync}
                disabled={fullSyncing || syncing}
                id='full-sync-btn'
              >
                {fullSyncing ? (
                  <span className='dash-sync-spinner dash-sync-spinner--warning' />
                ) : (
                  <FontAwesomeIcon icon={faCloudArrowDown} />
                )}
                <span>{fullSyncing ? 'Importando tudo...' : 'Sync Completo'}</span>
              </button>
            )}

            {/* Botão de Sync Incremental */}
            <button
              className={`ui-button w-fit dash-sync-btn ${!canSync ? 'dash-sync-btn-cooldown' : 'ui-button--info'}`}
              onClick={handleSync}
              disabled={!canSync}
              id='sync-orders-btn'
            >
              {syncing ? (
                <span className='dash-sync-spinner' />
              ) : (
                <FontAwesomeIcon icon={canSync ? faArrowsRotate : faLock} />
              )}
              <span>
                {syncing
                  ? 'Sincronizando...'
                  : canSync
                    ? 'Sincronizar Pedidos'
                    : `Sincronizar novamente em ${formatRemainingTime(cooldown)}`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatRemainingTime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
