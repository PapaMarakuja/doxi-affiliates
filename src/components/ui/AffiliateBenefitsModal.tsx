'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from './Modal';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDog,
  faPercent,
  faCalculator,
  faTicket,
  faHeart,
  faTag,
  faLink,
  faCopy
} from '@fortawesome/free-solid-svg-icons';
import { Affiliate, Coupon } from '@/src/types';
import { Skeleton } from './Skeleton';
import { useToast } from '@/src/contexts/ToastContext';
import Logo from '@/src/assets/images/doxi-club.png';
import Image from 'next/image';

interface AffiliateBenefitsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AffiliateBenefitsModal({ isOpen, onClose }: AffiliateBenefitsModalProps) {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ affiliate: Affiliate; coupons: Coupon[] } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchBenefits();
    }
  }, [isOpen]);

  async function fetchBenefits() {
    setLoading(true);
    try {
      const res = await fetch('/api/affiliates/me/benefits');
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      }
    } catch (error) {
      console.error('Error fetching benefits:', error);
    } finally {
      setLoading(false);
    }
  }

  const affiliate = data?.affiliate;
  const featuredCoupon = data?.coupons.find(c => c.active && c.discount_percentage !== null) || (data?.coupons && data.coupons.length > 0 ? data.coupons[0] : null);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div style={{ display: 'flex', alignItems: 'center', height: '32px' }}>
          <Image
            src={Logo}
            alt="Doxi Club"
            height={32}
            style={{ width: 'auto', height: '100%', marginRight: '8px' }}
          />
          Seus Benefícios
        </div>
      }
      size="lg"
      id="affiliate-benefits-modal"
    >
      <div className="benefits-modal-content">
        <div className="benefits-welcome">
          <div className="benefits-heart-icon">
            <FontAwesomeIcon icon={faHeart} />
          </div>
          <div className="benefits-welcome-info">
            <h4 className='benefits-welcome-title'>Obrigada por fazer parte do Doxi Club!</h4>
            <p className='benefits-welcome-text'>
              Juntos deixamos nossos salsichas ainda mais felizes e estilosos.
            </p>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div>
              <Skeleton width="150px" height="20px" className="mb-2" />
              <Skeleton height="100px" borderRadius="12px" />
            </div>
            <div>
              <Skeleton width="180px" height="20px" className="mb-2" />
              <Skeleton height="120px" borderRadius="12px" />
            </div>
          </div>
        ) : (
          <>
            {affiliate?.commission_rate && (
              <div className="benefits-section">
                <h3 className="benefits-section-title">
                  <FontAwesomeIcon icon={faPercent} /> Sua Comissão
                </h3>
                <div className="doxi-club-commission-hero">
                  <span className="doxi-club-commission-percent">{affiliate.commission_rate}%</span>
                  <p className="doxi-club-commission-label">de comissão sobre o valor líquido das vendas</p>
                </div>

                <div className="benefits-calculation">
                  <h4 className="benefits-calc-title">
                    <FontAwesomeIcon icon={faCalculator} /> Como calculamos sua comissão?
                  </h4>
                  <p className="benefits-calc-text">
                    O cálculo é feito sobre o valor dos produtos, descontando cupons e frete:
                  </p>
                  <div className="benefits-formula">
                    <code>(Valor Total - Descontos - Frete) × {affiliate.commission_rate}%</code>
                  </div>

                  <div className="benefits-calc-example">
                    <p><strong>Exemplo prático:</strong></p>
                    <p>Em uma venda de <strong>R$ 150,00</strong> onde o frete foi <strong>R$ 20,00</strong> e o cliente usou um desconto de <strong>R$ 10,00</strong>:</p>
                    <ul>
                      <li>Base de cálculo: R$ 150,00 - R$ 20,00 - R$ 10,00 = <strong>R$ 120,00</strong></li>
                      <li>Sua comissão ({affiliate.commission_rate}%): 120 × {affiliate.commission_rate / 100} = <strong>R$ {(120 * (affiliate.commission_rate / 100)).toFixed(2).replace('.', ',')}</strong></li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {featuredCoupon && (
              <div className="benefits-section">
                <h3 className="benefits-section-title">
                  <FontAwesomeIcon icon={faTicket} /> Divulgação
                </h3>

                <div className="benefits-promo-container">
                  <div className="benefits-promo-item">
                    <span className="benefits-promo-label">Seu Cupom:</span>
                    <div
                      className="benefits-inline-coupon"
                      onClick={() => {
                        navigator.clipboard.writeText(featuredCoupon.code);
                        addToast({ message: `Cupom "${featuredCoupon.code}" copiado!`, type: "success" });
                      }}
                      title="Clique para copiar o cupom"
                    >
                      <FontAwesomeIcon icon={faTag} style={{ fontSize: '12px', color: 'var(--pink-dark)' }} />
                      <span className="benefits-coupon-code">{featuredCoupon.code}</span>
                      {featuredCoupon.discount_percentage !== null && (
                        <span className="benefits-coupon-badge">
                          {featuredCoupon.discount_percentage}%
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="benefits-promo-item">
                    <span className="benefits-promo-label">Seu Link de Afiliado:</span>
                    <div
                      className="benefits-link-display"
                      onClick={() => {
                        const link = `https://doxiwear.com/?coupon=${featuredCoupon.code}`;
                        navigator.clipboard.writeText(link);
                        addToast({ message: "Link copiado para a área de transferência!", type: "success" });
                      }}
                    >
                      <code>doxiwear.com/?coupon={featuredCoupon.code}</code>
                      <FontAwesomeIcon icon={faCopy} className="benefits-link-copy-icon" />
                    </div>
                  </div>

                  <div className="benefits-cookie-info">
                    <p>
                      <span className="benefits-cookie-tag">Cookie de 7 dias:</span>
                      Ao clicar no seu link, seu cupom fica salvo no navegador do cliente por uma semana.
                      Isso significa que, mesmo que ele saia e volte depois por qualquer outro link da Doxi,
                      seu cupom será aplicado automaticamente no checkout!
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
