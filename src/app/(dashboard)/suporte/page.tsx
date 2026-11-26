"use client";

import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHeadset,
  faPaperPlane,
  faEnvelope,
  faUser,
  faCommentDots
} from "@fortawesome/free-solid-svg-icons";
import { faWhatsapp } from "@fortawesome/free-brands-svg-icons";
import { Card } from "@/src/components/ui/Card";
import { Input } from "@/src/components/ui/Input";
import { Textarea } from "@/src/components/ui/Textarea";
import { Button } from "@/src/components/ui/Button";
import { Alert } from "@/src/components/ui/Alert";

export default function SuportePage() {
  const [loading, setLoading] = useState(false);
  const [formSent, setFormSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const WHATSAPP_NUMBER = "5511999999999";
  const WHATSAPP_MESSAGE = encodeURIComponent("Olá! Sou um afiliado Doxi e gostaria de suporte.");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      setFormSent(true);
      setTimeout(() => setFormSent(false), 5000);
    } catch (err) {
      console.error("Support form error:", err);
      setError("Ocorreu um erro ao enviar sua mensagem.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1100px] p-5">
      <div className="mb-8">
        <h2 className="page-title">
          <FontAwesomeIcon icon={faHeadset} className="mr-3 text-brand" />
          Suporte ao Afiliado
        </h2>
        <p className="page-subtitle">Como podemos ajudar você hoje? Escolha o melhor canal de atendimento.</p>
      </div>

      <div className="form-grid items-start gap-6">
        <div className="form-col-7">
          <Card className="border border-line">
            <h3 className="section-title mb-8">
              <FontAwesomeIcon icon={faEnvelope} className="text-info" />
              Envie uma mensagem
            </h3>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              {error && <Alert type="error" message={error} />}

              <Input
                label="Seu Nome"
                placeholder="Ex: Olívia Maria"
                icon={<FontAwesomeIcon icon={faUser} />}
                required
                disabled={loading || formSent}
              />

              <Input
                label="E-mail de Contato"
                type="email"
                placeholder="seu@email.com"
                icon={<FontAwesomeIcon icon={faEnvelope} />}
                required
                disabled={loading || formSent}
              />

              <Textarea
                label="Mensagem"
                placeholder="Descreva sua dúvida ou problema..."
                icon={<FontAwesomeIcon icon={faCommentDots} />}
                required
                disabled={loading || formSent}
              />

              <Button type="submit" size="lg" loading={loading} disabled={formSent} className="mt-3">
                <FontAwesomeIcon icon={formSent ? faHeadset : faPaperPlane} />
                {formSent ? "Mensagem Enviada!" : "Enviar Mensagem"}
              </Button>
            </form>
          </Card>
        </div>

        <div className="form-col-5 flex flex-col gap-6">
          <Card className="whatsapp-card">
            <div>
              <div className="whatsapp-card-icon">
                <FontAwesomeIcon icon={faWhatsapp} />
              </div>
              <h3 className="mb-4 text-[28px] font-extrabold">Atendimento Rápido</h3>
              <p className="mb-10 text-base leading-relaxed opacity-90">
                Prefere conversar por texto? Nosso time está disponível no WhatsApp para tirar suas dúvidas em tempo real.
              </p>
            </div>

            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ui-button ui-button--lg whatsapp-card-btn no-underline"
            >
              <FontAwesomeIcon icon={faWhatsapp} className="text-xl" />
              Chamar no WhatsApp
            </a>
          </Card>

          <Card className="border border-line px-8 py-6">
            <h4 className="section-title mb-4 text-[15px]">Horário de Atendimento</h4>
            <ul className="m-0 flex list-none flex-col gap-3 p-0 text-sm text-muted">
              <li className="flex justify-between">
                <span>Segunda a Sexta:</span>
                <strong className="text-main">08:00 - 18:00</strong>
              </li>
              <li className="flex justify-between">
                <span>Sábado:</span>
                <strong className="text-main">09:00 - 13:00</strong>
              </li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
