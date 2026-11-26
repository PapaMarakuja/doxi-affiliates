'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTag,
  faLink,
  faCoins,
  faGift,
  faPaw,
  faArrowTrendUp,
  faMinus,
  faEquals,
  faXmark,
  faCalendarCheck,
} from '@fortawesome/free-solid-svg-icons';

export function StepBeneficios() {
  return (
    <div className="cad-benefits-container">
      {/* ── Banner de Destaque Inicial ── */}
      <div className="cad-benefits-hero-banner">
        <div className="cad-benefits-hero-header">
          <div className="cad-benefits-hero-icon">
            <FontAwesomeIcon icon={faPaw} />
          </div>
          <h3 className="cad-benefits-hero-title">
            Petiscos no pote e looks impecáveis pro seu salsicha! 🐾✨
          </h3>
        </div>
        <p className="cad-benefits-hero-desc">
          Ser parceira DoxiClub é uma via de mão dupla: você compartilha estilo com sua comunidade e a gente garante carinho, mimos exclusivos e comissões direto no seu bolso.
        </p>
      </div>

      {/* ── Tópico 1: Cupom & Link Exclusivos ── */}
      <div className="cad-benefit-block">
        <div className="cad-benefit-block-header">
          <div className="cad-benefit-block-icon">
            <FontAwesomeIcon icon={faTag} />
          </div>
          <div>
            <h4 className="cad-benefit-block-title">Cupom Exclusivo & Divulgação</h4>
            <span className="cad-benefit-block-sub">Sua marca registrada para presentear seguidores</span>
          </div>
        </div>

        <div className="cad-benefit-block-body">
          <p className="cad-benefit-text">
            Você ganha um <strong>cupom oficial personalizado com o seu nome</strong> para presentear sua comunidade com <strong>10% OFF</strong>. Cada compra realizada com ele gera comissão para você.
          </p>

          <p className="cad-benefit-text">
            E para facilitar ainda mais, você recebe seu <strong>link próprio de divulgação</strong>: ao clicar nele para entrar na loja, o seu cupom é ativado automaticamente no carrinho. Assim, mesmo se o cliente esquecer de digitar na hora de pagar, sua comissão já está garantida!
          </p>

          <div className="cad-benefit-tools-grid">
            {/* Exemplo Cupom */}
            <div className="cad-tool-card">
              <span className="cad-tool-label">Seu Cupom Oficial</span>
              <div className="cad-coupon-display">
                <FontAwesomeIcon icon={faTag} className="cad-coupon-display-icon" />
                <span className="cad-coupon-code">SEUNOME10</span>
                <span className="cad-badge-discount">10% OFF</span>
              </div>
            </div>

            {/* Exemplo Link */}
            <div className="cad-tool-card">
              <span className="cad-tool-label">Seu Link de Bio / Stories</span>
              <div className="cad-link-display">
                <FontAwesomeIcon icon={faLink} className="cad-link-display-icon" />
                <code className="cad-link-url">doxiwear.com/discount/SEUNOME10</code>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tópico 2: Comissões & Vales DoxiClub ── */}
      <div className="cad-benefit-block">
        <div className="cad-benefit-block-header">
          <div className="cad-benefit-block-icon">
            <FontAwesomeIcon icon={faCoins} />
          </div>
          <div>
            <h4 className="cad-benefit-block-title">Comissões & Vales de Mimos</h4>
            <span className="cad-benefit-block-sub">Renda no bolso e guarda-roupa renovado para seus peludos</span>
          </div>
        </div>

        <div className="cad-benefit-block-body">
          <p className="cad-benefit-text">
            Você começa recebendo <strong>5% de comissão</strong> sobre o valor líquido de todas as vendas que vierem pelo seu cupom ou link.
          </p>

          {/* Destaque de evolução */}
          <div className="cad-growth-callout">
            <FontAwesomeIcon icon={faArrowTrendUp} className="cad-growth-callout-icon" />
            <div>
              <strong>5% é só o começo!</strong>
              <p>
                Esse é o seu percentual inicial. Conforme sua presença for crescendo, o engajamento aumentar e o desempenho de vendas se destacar, a sua comissão pode subir!
              </p>
            </div>
          </div>

          {/* Destaque de Pagamento todo dia 10: PIX ou Cupom */}
          <div className="cad-growth-callout cad-growth-callout--brand">
            <FontAwesomeIcon icon={faCalendarCheck} className="cad-growth-callout-icon" />
            <div>
              <strong>Pagamentos todo dia 10: PIX ou Cupom!</strong>
              <p>
                Todo dia 10 nós realizamos o repasse das comissões acumuladas. Você escolhe sua opção de retirada: transferência direta via <strong>PIX</strong> na sua chave cadastrada ou em <strong>Cupom de Desconto</strong> no valor total para resgatar looks e novidades na loja!
              </p>
            </div>
          </div>

          <p className="cad-benefit-text">
            Além do dinheiro, parceiras ativas recebem <strong>Vales DoxiClub periódicos</strong> para resgatar peças, coleiras e novidades na loja. É a nossa forma de manter seus salsichas sempre mimados para vocês criarem conteúdos ainda mais lindos juntos.
          </p>

          {/* Cálculo e Exemplo Visual */}
          <div className="cad-calculation-section">
            <span className="cad-calc-title">Como calculamos a sua comissão:</span>

            <div className="cad-calc-flow">
              <div className="cad-calc-step">
                <span className="cad-calc-step-label">Valor dos produtos</span>
                <span className="cad-calc-step-val">R$ 150,00</span>
              </div>
              <div className="cad-calc-operator">
                <FontAwesomeIcon icon={faMinus} />
              </div>
              <div className="cad-calc-step">
                <span className="cad-calc-step-label">Frete e descontos</span>
                <span className="cad-calc-step-val">R$ 30,00</span>
              </div>
              <div className="cad-calc-operator">
                <FontAwesomeIcon icon={faEquals} />
              </div>
              <div className="cad-calc-step cad-calc-step--base">
                <span className="cad-calc-step-label">Base de cálculo</span>
                <span className="cad-calc-step-val">R$ 120,00</span>
              </div>
              <div className="cad-calc-operator">
                <FontAwesomeIcon icon={faXmark} />
              </div>
              <div className="cad-calc-step cad-calc-step--rate">
                <span className="cad-calc-step-label">Sua comissão inicial</span>
                <span className="cad-calc-step-val">5%</span>
              </div>
            </div>

            {/* Exemplo Prático Separado */}
            <div className="cad-calc-result-box">
              <div className="cad-calc-result-left">
                <FontAwesomeIcon icon={faGift} className="cad-calc-result-icon" />
                <span>Exemplo prático de retorno nessa venda:</span>
              </div>
              <div className="cad-calc-result-amount">
                R$ 6,00 <span>no seu bolso</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
