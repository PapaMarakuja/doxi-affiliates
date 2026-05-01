export function maskPhone(value: string): string {
  // Always 11 digits: (XX) XXXXX-XXXX
  let v = value.replace(/\D/g, "").slice(0, 11);
  if (v.length > 2) {
    v = `(${v.slice(0, 2)}) ${v.slice(2)}`;
  }
  if (v.length > 10) {
    v = `${v.slice(0, 10)}-${v.slice(10)}`;
  }
  return v;
}

export function maskCpfCnpj(value: string): string {
  let v = value.replace(/\D/g, "").slice(0, 14);
  if (v.length <= 11) {
    // CPF: 000.000.000-00
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d)/, "$1.$2");
    v = v.replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  } else {
    // CNPJ: 00.000.000/0000-00
    v = v.replace(/^(\d{2})(\d)/, "$1.$2");
    v = v.replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3");
    v = v.replace(/\.(\d{3})(\d)/, ".$1/$2");
    v = v.replace(/(\d{4})(\d)/, "$1-$2");
  }
  return v;
}

export function guessPixType(value: string): "cpf_cnpj" | "phone" | "email" | "random" {
  // If it has spaces or ( or -, might be phone but let's check format
  const numericLength = value.replace(/\D/g, "").length;
  const hasLetters = /[a-zA-Z]/.test(value);
  const hasAtSymbol = /@/.test(value);

  if (hasAtSymbol) {
    return "email";
  }

  if (!hasLetters && value.includes("-") && !value.includes(".") && numericLength > 8) {
    // could be phone or random if random happens to have -, but random usually has letters and format like UUID
    // actually, UUID has format 8-4-4-4-12
    const parts = value.split("-");
    if (parts.length > 2) return "random";
    return "phone";
  }

  if (hasLetters && value.length > 15) {
    return "random";
  }

  // Purely numeric or numeric with formatting
  if (!hasLetters && numericLength > 0) {
    if (numericLength === 11) {
      if (value.startsWith("(")) return "phone";
      // CPF and Phone both have 11 digits. We will guess phone if starts with (, else cpf
      return "cpf_cnpj" 
    }
    if (numericLength === 14) return "cpf_cnpj";
    if (numericLength > 11 && numericLength < 14) return "phone"; // perhaps typed phone roughly
  }

  return "random";
}

export function applyPixMask(value: string, type: "cpf_cnpj" | "phone" | "email" | "random"): string {
  if (!value) return "";
  switch (type) {
    case "phone":
      return maskPhone(value);
    case "cpf_cnpj":
      return maskCpfCnpj(value);
    case "email":
      return value.toLowerCase().replace(/\s/g, "");
    case "random":
      return value; // no mask for random
    default:
      return value;
  }
}
