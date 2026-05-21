const cpfPattern = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
const rgPattern = /\b(?:RG|Identidade)\s*[:\-]?\s*[A-Z0-9.\-]{5,}\b/gi;
const labeledPhonePattern = /\b(?:telefone|tel\.?|celular|fone)\s*[:\-]?\s*(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s]?\d{4}\b/gi;
const phonePattern = /\b(?:\(?\d{2}\)?\s*)?(?:9\s*)?\d{4}[-\s]?\d{4}\b/g;
const addressPattern = /\b(?:Rua|R\.|Avenida|Av\.|Travessa|Praça|Praca|Alameda|Estrada)\s+[^,.;\n]{3,80}(?:,\s*\d+[A-Z]?)?/gi;

function healthOrAssistanceContext(text: string): boolean {
  return /(saúde|saude|tfd|medicamento|consulta|paciente|hospital|ubs|caps|cras|assistência social|assistencia social|beneficiário|beneficiario|munícipe carente|municipe carente)/i.test(text);
}

export function maskSensitiveData(text?: string | null): string {
  if (!text) return "";

  let masked = text
    .replace(labeledPhonePattern, "[TELEFONE PROTEGIDO]")
    .replace(cpfPattern, "[CPF PROTEGIDO]")
    .replace(rgPattern, "RG [DADO PROTEGIDO]")
    .replace(phonePattern, "[TELEFONE PROTEGIDO]")
    .replace(addressPattern, "[ENDERECO PROTEGIDO]");

  if (healthOrAssistanceContext(masked)) {
    masked = masked.replace(
      /\b(Paciente|Benefici[aá]rio|Benefici[aá]ria|Mun[ií]cipe|Usu[aá]rio|Usu[aá]ria)\s+([A-ZÁ-Ú][a-zá-ú]+(?:\s+[A-ZÁ-Ú][a-zá-ú]+){1,5})/g,
      "$1 [DADO PROTEGIDO]"
    );
    masked = masked.replace(
      /\b(?:para|ao|a)\s+(?:o\s+|a\s+)?(?:paciente|benefici[aá]rio|benefici[aá]ria)\s+([A-ZÁ-Ú][a-zá-ú]+(?:\s+[A-ZÁ-Ú][a-zá-ú]+){1,5})/gi,
      "para [DADO PROTEGIDO]"
    );
  }

  return masked;
}
