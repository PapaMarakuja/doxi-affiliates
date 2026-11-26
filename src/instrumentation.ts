export function register() {
  // Month boundaries (cadastro, "do mês", ciclos) use local time; pin it so Vercel (UTC) matches Brazil.
  process.env.TZ = "America/Sao_Paulo";
}
