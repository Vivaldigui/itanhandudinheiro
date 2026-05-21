const categories = [
  {
    name: "Saúde",
    keywords: ["saúde", "tfd", "caps", "farmácia", "farmacia", "medicamento", "paciente", "consulta", "hospital", "ubs"]
  },
  {
    name: "Educação",
    keywords: ["escola", "merenda", "aluno", "educação", "educacao", "caixa escolar", "creche", "professor"]
  },
  {
    name: "Assistência Social",
    keywords: ["cras", "assistência social", "assistencia social", "fmas", "benefício", "beneficio", "munícipe carente", "municipe carente"]
  },
  {
    name: "Obras e Engenharia",
    keywords: ["obra", "engenharia", "pavimentação", "pavimentacao", "construção", "construcao", "reforma", "medição", "medicao", "projeto"]
  },
  {
    name: "Combustível e Frota",
    keywords: ["gasolina", "diesel", "etanol", "veículo", "veiculo", "frota", "placa", "abastecimento", "lubrificante", "pneu"]
  },
  {
    name: "Medicamentos",
    keywords: ["medicamento", "remédio", "remedio", "farmacêutico", "farmaceutico", "insumo hospitalar"]
  },
  {
    name: "Alimentação / Merenda",
    keywords: ["alimentação", "alimentacao", "merenda", "gênero alimentício", "genero alimenticio", "cesta básica", "cesta basica"]
  },
  {
    name: "Tecnologia",
    keywords: ["software", "licença", "licenca", "sistema", "informática", "informatica", "google workspace", "rede", "equipamento", "computador"]
  },
  {
    name: "Eventos",
    keywords: ["evento", "show", "festa", "festival", "apresentação", "apresentacao", "sonorização", "sonorizacao"]
  },
  {
    name: "Serviços Administrativos",
    keywords: ["serviço", "servico", "assessoria", "consultoria", "administrativo", "locação", "locacao", "manutenção", "manutencao"]
  }
] as const;

function normalizeForSearch(value: string): string {
  return value
    .toLocaleLowerCase("pt-BR")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

export function classifyCategory(text: string): string {
  const haystack = normalizeForSearch(text);
  for (const category of categories) {
    if (category.keywords.some((keyword) => haystack.includes(normalizeForSearch(keyword)))) {
      return category.name;
    }
  }
  return "Outros";
}

export function estimateSecretaria(text: string): string | null {
  const category = classifyCategory(text);
  const mapping: Record<string, string> = {
    Saúde: "Saúde",
    Medicamentos: "Saúde",
    Educação: "Educação",
    "Alimentação / Merenda": "Educação",
    "Assistência Social": "Assistência Social",
    "Obras e Engenharia": "Obras e Serviços Urbanos",
    "Combustível e Frota": "Administração / Frota",
    Tecnologia: "Administração",
    Eventos: "Cultura, Turismo ou Esporte",
    "Serviços Administrativos": "Administração"
  };
  return mapping[category] ?? null;
}

export function listCategories(): string[] {
  return [...categories.map((item) => item.name), "Outros"];
}
