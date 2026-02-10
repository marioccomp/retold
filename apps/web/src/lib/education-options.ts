export const INSTITUTIONS = [
  // Federal Universities (Brazil)
  "Universidade de São Paulo (USP)",
  "Universidade Estadual de Campinas (UNICAMP)",
  "Universidade Federal do Rio de Janeiro (UFRJ)",
  "Universidade Federal de Minas Gerais (UFMG)",
  "Universidade Federal do Rio Grande do Sul (UFRGS)",
  "Universidade Federal de Santa Catarina (UFSC)",
  "Universidade Federal de São Paulo (UNIFESP)",
  "Universidade Federal de Pernambuco (UFPE)",
  "Universidade de Brasília (UnB)",
  "Universidade Federal do Ceará (UFC)",
  "Universidade Federal da Bahia (UFBA)",
  "Universidade Federal do Paraná (UFPR)",
  "Universidade Federal de São Carlos (UFSCar)",
  "Universidade Estadual Paulista (UNESP)",
  "Instituto Tecnológico de Aeronáutica (ITA)",
  "Instituto Militar de Engenharia (IME)",
  "Universidade Federal Fluminense (UFF)",
  "Universidade Federal de Viçosa (UFV)",

  // Private Universities (Brazil)
  "PUC-Rio",
  "PUC-SP",
  "PUC-RS",
  "PUC Minas",
  "FGV",
  "Insper",
  "Mackenzie",
  "FIAP",
  "Estácio",
  "Uninove",

  // International
  "Harvard University",
  "MIT",
  "Stanford University",
  "University of Oxford",
  "University of Cambridge",
  "ETH Zurich",
  "University of Toronto",
  "Princeton University",
  "Yale University",
  "Columbia University",
];

const COURSES_PT = [
  "Ciência da Computação",
  "Engenharia de Software",
  "Engenharia da Computação",
  "Sistemas de Informação",
  "Análise e Desenvolvimento de Sistemas",
  "Ciência de Dados",
  "Inteligência Artificial",
  "Segurança da Informação",
  "Jogos Digitais",
  "Redes de Computadores",
  "Gestão de TI",
  "Engenharia Elétrica",
  "Engenharia Mecatrônica",
  "Design Digital",
  "UX/UI Design",
];

const COURSES_EN = [
  "Computer Science",
  "Software Engineering",
  "Computer Engineering",
  "Information Systems",
  "Systems Analysis and Development",
  "Data Science",
  "Artificial Intelligence",
  "Cybersecurity",
  "Digital Games",
  "Computer Networks",
  "IT Management",
  "Electrical Engineering",
  "Mechatronics Engineering",
  "Digital Design",
  "UX/UI Design",
];

export function getCourses(locale: string) {
  return locale === "pt" ? COURSES_PT : COURSES_EN;
}
