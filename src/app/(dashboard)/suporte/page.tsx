"use client";

import React, { useState, useEffect } from "react";
import { Skeleton } from "@/src/components/ui/Skeleton";
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
  const [initialLoading, setInitialLoading] = useState(true);
  const [formSent, setFormSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setInitialLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

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
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "20px" }}>
      <div style={{ marginBottom: "32px" }}>
        <h2 className="page-title">
          <FontAwesomeIcon icon={faHeadset} style={{ marginRight: "12px", color: "var(--pink-dark)" }} />
          Suporte ao Afiliado
        </h2>
        <p className="page-subtitle">Como podemos ajudar você hoje? Escolha o melhor canal de atendimento.</p>
      </div>

      <div className="form-grid" style={{ gap: "24px", alignItems: "start" }}>

        {/* Formulário de E-mail */}
        <div className="form-col-7">
          <Card style={{ background: "var(--card-bg)", border: "1px solid var(--border)" }}>
            <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "32px", display: "flex", alignItems: "center", gap: "12px", color: "var(--text-main)" }}>
              <FontAwesomeIcon icon={faEnvelope} style={{ color: "var(--info)", fontSize: "18px" }} />
              {initialLoading ? <Skeleton width="180px" height="24px" /> : "Envie uma mensagem"}
            </h3>

            <form onSubmit={handleSubmit}>
              {error && <Alert type="error" message={error} />}

              <div style={{ marginBottom: "24px" }}>
                <Input
                  label="Seu Nome"
                  placeholder="Ex: Olívia Maria"
                  icon={<FontAwesomeIcon icon={faUser} />}
                  required
                  disabled={loading || formSent}
                />
              </div>

              <div style={{ marginBottom: "24px" }}>
                <Input
                  label="E-mail de Contato"
                  type="email"
                  placeholder="seu@email.com"
                  icon={<FontAwesomeIcon icon={faEnvelope} />}
                  required
                  disabled={loading || formSent}
                />
              </div>

              <div style={{ marginBottom: "32px" }}>
                <Textarea
                  label="Mensagem"
                  placeholder="Descreva sua dúvida ou problema..."
                  icon={<FontAwesomeIcon icon={faCommentDots} />}
                  required
                  disabled={loading || formSent}
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                disabled={formSent}
                style={{
                  height: "56px",
                  fontSize: "16px",
                  fontWeight: "700"
                }}
              >
                <FontAwesomeIcon icon={formSent ? faHeadset : faPaperPlane} style={{ marginRight: "10px" }} />
                {formSent ? "Mensagem Enviada!" : "Enviar Mensagem"}
              </Button>
            </form>
          </Card>
        </div>

        {/* Coluna Direita (Zap + Horários) */}
        <div className="form-col-5" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

          {/* WhatsApp Card */}
          <Card style={{
            background: "linear-gradient(135deg, #25D366 0%, #128C7E 100%)",
            color: "white",
            padding: "40px 32px",
            border: "none",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between"
          }}>
            <div>
              <div style={{
                width: "56px",
                height: "56px",
                background: "rgba(255,255,255,0.2)",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "32px",
                fontSize: "28px"
              }}>
                <FontAwesomeIcon icon={faWhatsapp} />
              </div>
              <h3 style={{ fontSize: "28px", fontWeight: "800", marginBottom: "16px", color: "white" }}>
                {initialLoading ? <Skeleton width="200px" height="34px" /> : "Atendimento Rápido"}
              </h3>
              <p style={{ fontSize: "16px", lineHeight: "1.6", opacity: "0.9", marginBottom: "40px", color: "white" }}>
                Prefere conversar por texto? Nosso time está disponível no WhatsApp para tirar suas dúvidas em tempo real.
              </p>
            </div>

            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${WHATSAPP_MESSAGE}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: "none" }}
            >
              <Button
                style={{
                  background: "white",
                  color: "#128C7E",
                  height: "56px",
                  fontSize: "16px",
                  fontWeight: "700"
                }}
              >
                <FontAwesomeIcon icon={faWhatsapp} style={{ marginRight: "10px", fontSize: "20px" }} />
                Chamar no WhatsApp
              </Button>
            </a>
          </Card>

          {/* Horários Card */}
          <Card style={{ background: "var(--card-bg)", border: "1px solid var(--border)", padding: "24px 32px" }}>
            <h4 style={{ fontSize: "15px", fontWeight: "700", marginBottom: "16px", color: "var(--text-main)" }}>Horário de Atendimento</h4>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, fontSize: "14px", color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: "12px" }}>
              <li style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Segunda a Sexta:</span>
                <strong style={{ color: "var(--text-main)" }}>08:00 - 18:00</strong>
              </li>
              <li style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Sábado:</span>
                <strong style={{ color: "var(--text-main)" }}>09:00 - 13:00</strong>
              </li>
            </ul>
          </Card>
        </div>

      </div>
    </div>
  );
}
