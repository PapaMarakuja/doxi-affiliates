'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTicket,
  faPlus,
  faArrowsRotate,
  faBagShopping,
  faCoins,
  faCalendarDay,
  faChartBar,
  faPercent,
  faCalendarCheck,
  faArrowDownWideShort,
  faHandHoldingDollar,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { CouponCreateModal } from '@/src/components/ui/CouponCreateModal';
import { Select } from '@/src/components/ui/Select';
import { Skeleton } from '@/src/components/ui/Skeleton';
import { useToast } from '@/src/contexts/ToastContext';
import { useConfirmDialog } from '@/src/contexts/ConfirmDialogContext';
import type { Coupon } from '@/src/types';

// ── Types ──────────────────────────────────────────────────────────────────────

interface CouponStats {
  coupon: Coupon;
  affiliate: { name: string; commission_rate: number | null } | null;
  totalUses: number;
  totalRevenue: number;
  totalDiscount: number;
  totalCommission: number;
  monthlyUses: number;
  monthlyRevenue: number;
  monthlyDiscount: number;
  monthlyCommission: number;
}

interface CouponsPageData {
  coupons: CouponStats[];
  totals: {
    totalUses: number;
    totalRevenue: number;
    totalDiscount: number;
    totalCommission: number;
    monthlyUses: number;
    monthlyRevenue: number;
    monthlyDiscount: number;
    monthlyCommission: number;
  };
}

// ── Sort Options ───────────────────────────────────────────────────────────────

type SortKey =
  | 'most_used'
  | 'most_revenue'
  | 'most_discount'
  | 'most_commission'
  | 'monthly_uses'
  | 'newest'
  | 'alphabetical';

type SortDirection = 'asc' | 'desc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'most_used', label: 'Mais usados' },
  { key: 'most_revenue', label: 'Maior receita' },
  { key: 'most_discount', label: 'Mais descontos' },
  { key: 'most_commission', label: 'Mais comissão' },
  { key: 'monthly_uses', label: 'Usos do mês' },
  { key: 'newest', label: 'Mais recente' },
  { key: 'alphabetical', label: 'A → Z' },
];

const SORT_STORAGE_KEY = 'doxi_coupons_sort';
const SORT_DIR_STORAGE_KEY = 'doxi_coupons_sort_dir';

function getStoredSort(): SortKey {
  if (typeof window === 'undefined') return 'most_used';
  const stored = localStorage.getItem(SORT_STORAGE_KEY);
  if (stored && SORT_OPTIONS.some((o) => o.key === stored)) return stored as SortKey;
  return 'most_used';
}

function getStoredDir(): SortDirection {
  if (typeof window === 'undefined') return 'desc';
  const stored = localStorage.getItem(SORT_DIR_STORAGE_KEY);
  return stored === 'asc' ? 'asc' : 'desc';
}

function sortCoupons(
  coupons: CouponStats[],
  sortKey: SortKey,
  sortDir: SortDirection
): CouponStats[] {
  const sorted = [...coupons];
  const isAsc = sortDir === 'asc';

  switch (sortKey) {
    case 'most_used':
      return sorted.sort((a, b) =>
        isAsc ? a.totalUses - b.totalUses : b.totalUses - a.totalUses
      );
    case 'most_revenue':
      return sorted.sort((a, b) =>
        isAsc ? a.totalRevenue - b.totalRevenue : b.totalRevenue - a.totalRevenue
      );
    case 'most_discount':
      return sorted.sort((a, b) =>
        isAsc ? a.totalDiscount - b.totalDiscount : b.totalDiscount - a.totalDiscount
      );
    case 'most_commission':
      return sorted.sort((a, b) =>
        isAsc
          ? a.totalCommission - b.totalCommission
          : b.totalCommission - a.totalCommission
      );
    case 'monthly_uses':
      return sorted.sort((a, b) =>
        isAsc ? a.monthlyUses - b.monthlyUses : b.monthlyUses - a.monthlyUses
      );
    case 'newest':
      return sorted.sort((a, b) => {
        const timeA = new Date(a.coupon.created_at).getTime();
        const timeB = new Date(b.coupon.created_at).getTime();
        return isAsc ? timeA - timeB : timeB - timeA;
      });
    case 'alphabetical':
      return sorted.sort((a, b) => {
        const comp = a.coupon.code.localeCompare(b.coupon.code, 'pt-BR');
        return isAsc ? comp : -comp;
      });
    default:
      return sorted;
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const formatBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatNumber = (value: number) => value.toLocaleString('pt-BR');

const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const currentDate = new Date();
const CURRENT_MONTH = currentDate.getMonth() + 1;
const CURRENT_YEAR = currentDate.getFullYear();

const yearOptions = Array.from({ length: 5 }, (_, i) => ({
  value: CURRENT_YEAR - i,
  label: (CURRENT_YEAR - i).toString(),
}));

const monthOptions = MONTHS.map((m, i) => ({
  value: i + 1,
  label: m,
}));

const sortDirOptions = [
  { value: 'desc', label: 'Decrescente' },
  { value: 'asc', label: 'Crescente' },
];

// ── Component ──────────────────────────────────────────────────────────────────

export default function CuponsPage() {
  const { addToast } = useToast();
  const confirm = useConfirmDialog();
  const [data, setData] = useState<CouponsPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingCouponId, setDeletingCouponId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>(getStoredSort);
  const [sortDir, setSortDir] = useState<SortDirection>(getStoredDir);

  const [filterMonth, setFilterMonth] = useState<number>(CURRENT_MONTH);
  const [filterYear, setFilterYear] = useState<number>(CURRENT_YEAR);

  // Busca dados da nossa base (orders)
  const loadData = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/coupons/stats?month=${filterMonth}&year=${filterYear}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.data) setData(json.data);
      }
    } catch {
      // silencioso
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterMonth, filterYear]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Persistir ordenação no localStorage
  const handleSortChange = useCallback((key: SortKey) => {
    setSortKey(key);
    localStorage.setItem(SORT_STORAGE_KEY, key);
  }, []);

  const handleDirChange = useCallback((dir: SortDirection) => {
    setSortDir(dir);
    localStorage.setItem(SORT_DIR_STORAGE_KEY, dir);
  }, []);

  // Atualizar dados (re-lê da base, sem chamar Shopify)
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    await loadData();
    addToast({ message: 'Dados atualizados', type: 'success' });
  }, [refreshing, loadData, addToast]);

  // Cupom criado → recarrega da base
  const handleCouponCreated = useCallback(
    async (coupon: Coupon) => {
      addToast({
        message: `Cupom ${coupon.code} cadastrado com sucesso!`,
        type: 'success',
      });
      await loadData();
    },
    [addToast, loadData]
  );

  const handleDeleteCoupon = useCallback(
    async (coupon: Coupon) => {
      const confirmed = await confirm({
        title: 'Excluir Cupom',
        message: `Tem certeza que deseja excluir o cupom "${coupon.code}"? Esta ação não pode ser desfeita.`,
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        type: 'danger',
      });

      if (!confirmed) return;

      setDeletingCouponId(coupon.id);
      try {
        const res = await fetch('/api/coupons', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: coupon.id }),
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          throw new Error(errorData?.error || 'Erro ao excluir cupom');
        }

        setData((prev) => {
          if (!prev) return prev;

          const removed = prev.coupons.find((item) => item.coupon.id === coupon.id);
          if (!removed) return prev;

          return {
            coupons: prev.coupons.filter((item) => item.coupon.id !== coupon.id),
            totals: {
              totalUses: prev.totals.totalUses - removed.totalUses,
              totalRevenue: prev.totals.totalRevenue - removed.totalRevenue,
              totalDiscount: prev.totals.totalDiscount - removed.totalDiscount,
              totalCommission: prev.totals.totalCommission - removed.totalCommission,
              monthlyUses: prev.totals.monthlyUses - removed.monthlyUses,
              monthlyRevenue: prev.totals.monthlyRevenue - removed.monthlyRevenue,
              monthlyDiscount: prev.totals.monthlyDiscount - removed.monthlyDiscount,
              monthlyCommission: prev.totals.monthlyCommission - removed.monthlyCommission,
            },
          };
        });

        addToast({
          message: `Cupom ${coupon.code} excluído com sucesso.`,
          type: 'success',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Erro ao excluir cupom.';
        addToast({ message, type: 'error' });
      } finally {
        setDeletingCouponId(null);
      }
    },
    [confirm, addToast]
  );

  const totals = data?.totals;
  const sortedCoupons = useMemo(
    () => sortCoupons(data?.coupons ?? [], sortKey, sortDir),
    [data?.coupons, sortKey, sortDir]
  );

  const displayMonthName = MONTHS[filterMonth - 1];
  const displayMonthStr = `de ${displayMonthName}`;

  return (
    <div className='cupons-page'>
      <div>
        <h2 className='page-title'>Cupons</h2>
        <p className='page-subtitle'>
          Gerencie seus cupons e acompanhe o desempenho de cada um.
        </p>
      </div>

      {/* ── Card de Ações ─────────────────── */}
      <div className='cupons-actions-card'>
        <div className='cupons-actions-left'>
          <FontAwesomeIcon icon={faTicket} className='cupons-actions-icon' />
          <div>
            <h3 className='cupons-actions-title'>Ações e Filtros</h3>
            <p className='cupons-actions-subtitle'>
              Filtre por mês ou cadastre um novo cupom
            </p>
          </div>
        </div>
        <div className='cupons-actions-right'>
          <div className='cupons-actions-filters'>
            <Select
              options={monthOptions}
              value={filterMonth}
              onChange={(val) => {
                if (val) setFilterMonth(Number(val));
              }}
              clearable={false}
              style={{ minWidth: '130px' }}
            />
            <Select
              options={yearOptions}
              value={filterYear}
              onChange={(val) => {
                if (val) setFilterYear(Number(val));
              }}
              clearable={false}
              style={{ minWidth: '100px' }}
            />
          </div>
          <div className='cupons-actions-buttons'>
            <button
              className='ui-button w-fit ui-button--info dash-sync-btn'
              onClick={handleRefresh}
              disabled={refreshing}
              id='coupons-refresh-btn'
            >
              {refreshing ? (
                <span className='dash-sync-spinner' />
              ) : (
                <FontAwesomeIcon icon={faArrowsRotate} />
              )}
              <span>{refreshing ? 'Atualizando...' : 'Atualizar'}</span>
            </button>
            <button
              className='ui-button w-fit ui-button--success dash-sync-btn'
              onClick={() => setCreateModalOpen(true)}
              id='coupons-create-btn'
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Novo Cupom</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Totais ────────────────────────── */}
      {totals && (
        <div className='cupons-totals-grid'>
          <div className='cupons-total-card'>
            <div className='cupons-total-icon stat-card-icon--amber'>
              <FontAwesomeIcon icon={faBagShopping} />
            </div>
            <div className='cupons-total-content'>
              <span className='cupons-total-label'>Usos Totais</span>
              <span className='cupons-total-value'>{formatNumber(totals.totalUses)}</span>
            </div>
          </div>
          <div className='cupons-total-card'>
            <div className='cupons-total-icon stat-card-icon--green'>
              <FontAwesomeIcon icon={faCoins} />
            </div>
            <div className='cupons-total-content'>
              <span className='cupons-total-label'>Receita Total</span>
              <span className='cupons-total-value'>{formatBRL(totals.totalRevenue)}</span>
            </div>
          </div>
          <div className='cupons-total-card'>
            <div className='cupons-total-icon stat-card-icon--pink'>
              <FontAwesomeIcon icon={faPercent} />
            </div>
            <div className='cupons-total-content'>
              <span className='cupons-total-label'>Descontos Dados</span>
              <span className='cupons-total-value'>
                {formatBRL(totals.totalDiscount)}
              </span>
            </div>
          </div>
          <div className='cupons-total-card'>
            <div className='cupons-total-icon stat-card-icon--blue'>
              <FontAwesomeIcon icon={faHandHoldingDollar} />
            </div>
            <div className='cupons-total-content'>
              <span className='cupons-total-label'>Comissões Totais</span>
              <span className='cupons-total-value'>
                {formatBRL(totals.totalCommission)}
              </span>
            </div>
          </div>
          <div className='cupons-total-card'>
            <div className='cupons-total-icon stat-card-icon--amber'>
              <FontAwesomeIcon icon={faCalendarDay} />
            </div>
            <div className='cupons-total-content'>
              <span className='cupons-total-label'>Usos {displayMonthStr}</span>
              <span className='cupons-total-value'>
                {formatNumber(totals.monthlyUses)}
              </span>
            </div>
          </div>
          <div className='cupons-total-card'>
            <div className='cupons-total-icon stat-card-icon--green'>
              <FontAwesomeIcon icon={faChartBar} />
            </div>
            <div className='cupons-total-content'>
              <span className='cupons-total-label'>Receita {displayMonthStr}</span>
              <span className='cupons-total-value'>
                {formatBRL(totals.monthlyRevenue)}
              </span>
            </div>
          </div>
          <div className='cupons-total-card'>
            <div className='cupons-total-icon stat-card-icon--pink'>
              <FontAwesomeIcon icon={faCalendarCheck} />
            </div>
            <div className='cupons-total-content'>
              <span className='cupons-total-label'>Descontos {displayMonthStr}</span>
              <span className='cupons-total-value'>
                {formatBRL(totals.monthlyDiscount)}
              </span>
            </div>
          </div>
          <div className='cupons-total-card'>
            <div className='cupons-total-icon stat-card-icon--blue'>
              <FontAwesomeIcon icon={faHandHoldingDollar} />
            </div>
            <div className='cupons-total-content'>
              <span className='cupons-total-label'>Comissões {displayMonthStr}</span>
              <span className='cupons-total-value'>
                {formatBRL(totals.monthlyCommission)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Ordenação + Lista de Cupons ──── */}
      {!loading && sortedCoupons.length > 0 && (
        <div className='cupons-sort-container'>
          <div className='cupons-sort-bar'>
            <div className='cupons-sort-label'>
              <FontAwesomeIcon icon={faArrowDownWideShort} />
              <span>Ordenar por</span>
            </div>
            <div className='cupons-sort-options'>
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  className={`cupons-sort-chip ${sortKey === opt.key ? 'cupons-sort-chip--active' : ''}`}
                  onClick={() => handleSortChange(opt.key)}
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className='cupons-sort-dir'>
            <Select
              options={sortDirOptions}
              value={sortDir}
              onChange={(val) => handleDirChange(val as SortDirection)}
              clearable={false}
              className='w-fit'
              style={{ minWidth: '160px' }}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className='cupons-loading-grid'>
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className='coupon-card cupons-card-skeleton'>
              <div className='coupon-card-header'>
                <div className='coupon-card-icon'>
                  <FontAwesomeIcon icon={faTicket} />
                </div>
                <Skeleton width="80px" height="20px" borderRadius="20px" />
              </div>
              <Skeleton width="120px" height="32px" className="mb-2" />
              <Skeleton width="60px" height="16px" />
            </div>
          ))}
        </div>
      ) : sortedCoupons.length === 0 ? (
        <div className='cupons-empty'>
          <FontAwesomeIcon icon={faTicket} className='cupons-empty-icon' />
          <p>Nenhum cupom cadastrado ainda.</p>
          <button
            className='ui-button w-fit ui-button--success'
            onClick={() => setCreateModalOpen(true)}
            style={{ gap: '8px' }}
          >
            <FontAwesomeIcon icon={faPlus} />
            Cadastrar primeiro cupom
          </button>
        </div>
      ) : (
        <div className='coupon-grid'>
          {sortedCoupons.map((cs) => {
            const hasAffiliate = !!cs.affiliate;
            const hasCommission = hasAffiliate && cs.totalCommission > 0;

            return (
              <div
                key={cs.coupon.id}
                className={`coupon-card ${!cs.coupon.active ? 'coupon-card--inactive' : ''}`}
              >
                <div className='coupon-card-header'>
                  <div className='coupon-card-icon'>
                    <FontAwesomeIcon icon={faTicket} />
                  </div>
                  <span className='coupon-card-code'>{cs.coupon.code}</span>
                  {!cs.coupon.active && (
                    <span className='cupons-badge-inactive'>Inativo</span>
                  )}
                </div>

                {/* Valor destaque — receita quando não tem, receita + comissão secundária quando tem */}
                {hasCommission ? (
                  <div className='cupons-card-hero'>
                    <span className='coupon-card-value' style={{ margin: 0 }}>
                      {formatBRL(cs.totalRevenue)}
                    </span>
                    <span className='cupons-card-hero-separator'>|</span>
                    <span
                      className='cupons-card-hero-revenue'
                      style={{ alignSelf: 'center', position: 'relative', top: '-2px' }}
                    >
                      {formatBRL(cs.totalCommission)}
                    </span>
                  </div>
                ) : (
                  <p className='coupon-card-value'>{formatBRL(cs.totalRevenue)}</p>
                )}

                <p className='coupon-card-uses'>
                  {formatNumber(cs.totalUses)} uso{cs.totalUses !== 1 ? 's' : ''}
                  {cs.totalDiscount > 0 && (
                    <span className='cupons-card-discount-inline'>
                      {' '}
                      · {formatBRL(cs.totalDiscount)} desc.
                    </span>
                  )}
                </p>

                {/* Mensal */}
                <div className='cupons-card-monthly'>
                  <span className='cupons-card-monthly-label'>{displayMonthName}:</span>
                  <span className='cupons-card-monthly-value'>
                    {formatBRL(cs.monthlyRevenue)}
                    {hasAffiliate && (
                      <>
                        <span className='cupons-card-monthly-sep'>|</span>
                        <span className='cupons-card-monthly-commission'>
                          {formatBRL(cs.monthlyCommission)}
                        </span>
                      </>
                    )}{' '}
                    · {cs.monthlyUses} uso{cs.monthlyUses !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Badges — desconto e comissão lado a lado */}
                <div className='cupons-card-badges'>
                  {cs.coupon.discount_percentage !== null && (
                    <div className='cupons-card-discount'>
                      {cs.coupon.discount_percentage}% desconto
                    </div>
                  )}
                  {hasAffiliate && cs.affiliate!.commission_rate != null && (
                    <div className='cupons-card-commission-badge'>
                      {cs.affiliate!.commission_rate}% comissão
                    </div>
                  )}
                </div>

                <button
                  type='button'
                  className='cupons-card-delete-badge'
                  onClick={() => handleDeleteCoupon(cs.coupon)}
                  disabled={deletingCouponId === cs.coupon.id}
                  aria-label={`Excluir cupom ${cs.coupon.code}`}
                  title='Excluir cupom'
                >
                  {deletingCouponId === cs.coupon.id ? (
                    <span className='cupons-card-delete-spinner' />
                  ) : (
                    <FontAwesomeIcon icon={faTrash} />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal de Cadastro ─────────────── */}
      <CouponCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCouponCreated={handleCouponCreated}
      />
    </div>
  );
}
