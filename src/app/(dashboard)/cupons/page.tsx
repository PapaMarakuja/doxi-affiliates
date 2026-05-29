'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  faPenToSquare,
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
  | 'newest'
  | 'alphabetical';

type SortDirection = 'asc' | 'desc';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'most_used', label: 'Mais usados no mês' },
  { key: 'most_revenue', label: 'Maior receita no mês' },
  { key: 'most_discount', label: 'Mais descontos no mês' },
  { key: 'most_commission', label: 'Mais comissão no mês' },
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
        isAsc ? a.monthlyUses - b.monthlyUses : b.monthlyUses - a.monthlyUses
      );
    case 'most_revenue':
      return sorted.sort((a, b) =>
        isAsc ? a.monthlyRevenue - b.monthlyRevenue : b.monthlyRevenue - a.monthlyRevenue
      );
    case 'most_discount':
      return sorted.sort((a, b) =>
        isAsc ? a.monthlyDiscount - b.monthlyDiscount : b.monthlyDiscount - a.monthlyDiscount
      );
    case 'most_commission':
      return sorted.sort((a, b) =>
        isAsc
          ? a.monthlyCommission - b.monthlyCommission
          : b.monthlyCommission - a.monthlyCommission
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
  const [filterLoading, setFilterLoading] = useState(false);
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
      setFilterLoading(false);
      setRefreshing(false);
    }
  }, [filterMonth, filterYear]);

  // Ativa loading visível ao trocar filtro (ignora mount inicial)
  const isMounted = useRef(false);
  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    setFilterLoading(true);
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

      {/* ── Área de dados com overlay de filtro ─ */}
      <div className='cupons-data-area'>
        {filterLoading && (
          <div className='cupons-filter-overlay'>
            <div className='cupons-filter-spinner' />
            <span>Carregando {displayMonthName} {filterYear}…</span>
          </div>
        )}

        {/* ── Totais ────────────────────────── */}
        {totals && (
          <div className={`cupons-totals-section${filterLoading ? ' cupons-data-area--loading' : ''}`}>
            {/* Mês em destaque */}
            <p className='cupons-totals-section-label'>
              <FontAwesomeIcon icon={faCalendarDay} />
              {displayMonthName} {filterYear}
            </p>
            <div className='cupons-totals-grid'>
              <div className='cupons-total-card cupons-total-card--monthly'>
                <div className='cupons-total-icon stat-card-icon--amber'>
                  <FontAwesomeIcon icon={faBagShopping} />
                </div>
                <div className='cupons-total-content'>
                  <span className='cupons-total-label'>Usos no mês</span>
                  <span className='cupons-total-value'>{formatNumber(totals.monthlyUses)}</span>
                </div>
              </div>
              <div className='cupons-total-card cupons-total-card--monthly'>
                <div className='cupons-total-icon stat-card-icon--green'>
                  <FontAwesomeIcon icon={faChartBar} />
                </div>
                <div className='cupons-total-content'>
                  <span className='cupons-total-label'>Receita no mês</span>
                  <span className='cupons-total-value'>{formatBRL(totals.monthlyRevenue)}</span>
                </div>
              </div>
              <div className='cupons-total-card cupons-total-card--monthly'>
                <div className='cupons-total-icon stat-card-icon--pink'>
                  <FontAwesomeIcon icon={faCalendarCheck} />
                </div>
                <div className='cupons-total-content'>
                  <span className='cupons-total-label'>Descontos no mês</span>
                  <span className='cupons-total-value'>{formatBRL(totals.monthlyDiscount)}</span>
                </div>
              </div>
              <div className='cupons-total-card cupons-total-card--monthly'>
                <div className='cupons-total-icon stat-card-icon--blue'>
                  <FontAwesomeIcon icon={faHandHoldingDollar} />
                </div>
                <div className='cupons-total-content'>
                  <span className='cupons-total-label'>Comissões no mês</span>
                  <span className='cupons-total-value'>{formatBRL(totals.monthlyCommission)}</span>
                </div>
              </div>
            </div>

            {/* Totais gerais (secundários) */}
            <p className='cupons-totals-section-label cupons-totals-section-label--secondary'>
              <FontAwesomeIcon icon={faCoins} />
              Total geral
            </p>
            <div className='cupons-totals-grid cupons-totals-grid--secondary'>
              <div className='cupons-total-card cupons-total-card--secondary'>
                <div className='cupons-total-icon stat-card-icon--amber'>
                  <FontAwesomeIcon icon={faBagShopping} />
                </div>
                <div className='cupons-total-content'>
                  <span className='cupons-total-label'>Usos totais</span>
                  <span className='cupons-total-value cupons-total-value--secondary'>
                    {formatNumber(totals.totalUses)}
                  </span>
                </div>
              </div>
              <div className='cupons-total-card cupons-total-card--secondary'>
                <div className='cupons-total-icon stat-card-icon--green'>
                  <FontAwesomeIcon icon={faCoins} />
                </div>
                <div className='cupons-total-content'>
                  <span className='cupons-total-label'>Receita total</span>
                  <span className='cupons-total-value cupons-total-value--secondary'>
                    {formatBRL(totals.totalRevenue)}
                  </span>
                </div>
              </div>
              <div className='cupons-total-card cupons-total-card--secondary'>
                <div className='cupons-total-icon stat-card-icon--pink'>
                  <FontAwesomeIcon icon={faPercent} />
                </div>
                <div className='cupons-total-content'>
                  <span className='cupons-total-label'>Descontos totais</span>
                  <span className='cupons-total-value cupons-total-value--secondary'>
                    {formatBRL(totals.totalDiscount)}
                  </span>
                </div>
              </div>
              <div className='cupons-total-card cupons-total-card--secondary'>
                <div className='cupons-total-icon stat-card-icon--blue'>
                  <FontAwesomeIcon icon={faHandHoldingDollar} />
                </div>
                <div className='cupons-total-content'>
                  <span className='cupons-total-label'>Comissões totais</span>
                  <span className='cupons-total-value cupons-total-value--secondary'>
                    {formatBRL(totals.totalCommission)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Ordenação + Lista de Cupons ──── */}
        {!loading && sortedCoupons.length > 0 && (
          <div className={`cupons-sort-container${filterLoading ? ' cupons-data-area--loading' : ''}`}>
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
          <div className={`coupon-grid${filterLoading ? ' cupons-data-area--loading' : ''}`}>
            {sortedCoupons.map((cs) => {
              const hasAffiliate = !!cs.affiliate;
              const hasMonthlyCommission = hasAffiliate && cs.monthlyCommission > 0;
              const hasTotalCommission = hasAffiliate && cs.totalCommission > 0;

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

                  {/* Hero — valores do mês em destaque */}
                  <p className='cupons-card-month-label'>{displayMonthName}</p>
                  {hasMonthlyCommission ? (
                    <div className='cupons-card-hero'>
                      <span className='coupon-card-value' style={{ margin: 0 }}>
                        {formatBRL(cs.monthlyRevenue)}
                      </span>
                      <span className='cupons-card-hero-separator'>|</span>
                      <span
                        className='cupons-card-hero-revenue'
                        style={{ alignSelf: 'center', position: 'relative', top: '-2px' }}
                      >
                        {formatBRL(cs.monthlyCommission)}
                      </span>
                    </div>
                  ) : (
                    <p className='coupon-card-value'>{formatBRL(cs.monthlyRevenue)}</p>
                  )}

                  <p className='coupon-card-uses'>
                    {formatNumber(cs.monthlyUses)} uso{cs.monthlyUses !== 1 ? 's' : ''} no mês
                    {cs.monthlyDiscount > 0 && (
                      <span className='cupons-card-discount-inline'>
                        {' '}
                        · {formatBRL(cs.monthlyDiscount)} desc.
                      </span>
                    )}
                  </p>

                  {/* Total (secundário) */}
                  <div className='cupons-card-total-row'>
                    <span className='cupons-card-total-label'>Total:</span>
                    <span className='cupons-card-total-value'>
                      {formatBRL(cs.totalRevenue)}
                      {hasTotalCommission && (
                        <>
                          <span className='cupons-card-monthly-sep'>|</span>
                          <span className='cupons-card-monthly-commission'>
                            {formatBRL(cs.totalCommission)}
                          </span>
                        </>
                      )}{' '}
                      · {cs.totalUses} uso{cs.totalUses !== 1 ? 's' : ''}
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

                  {/* Botões de ação */}
                  <div className='cupons-card-actions'>
                    <button
                      type='button'
                      className='ui-button ui-button--circle ui-button--info ui-button--sm cupons-card-action-btn'
                      aria-label={`Editar cupom ${cs.coupon.code}`}
                      title='Editar cupom'
                    >
                      <FontAwesomeIcon icon={faPenToSquare} />
                    </button>
                    <button
                      type='button'
                      className='ui-button ui-button--circle ui-button--danger ui-button--sm cupons-card-action-btn'
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
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Modal de Cadastro ─────────────── */}
      <CouponCreateModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCouponCreated={handleCouponCreated}
      />
    </div>
  );
}
