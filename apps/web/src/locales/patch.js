const fs = require('fs');
const path = require('path');

const enPath = path.join(__dirname, 'en.json');
const ptPath = path.join(__dirname, 'pt.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const pt = JSON.parse(fs.readFileSync(ptPath, 'utf8'));

// Update EN
if (!en.onboarding.project.mock_tabs) {
  en.onboarding.project.mock_tabs = {
    analysis: "Analysis (AI)",
    comments: "Comments",
    commits: "Commits"
  };
  en.onboarding.project.mock_stats = {
    languages: "Languages",
    files: "Files",
    dependencies: "Dependencies",
    health: "Health",
    production: "Production Ready",
    sub_languages: "JavaScript, CSS, HTML",
    sub_files: "28 KB",
    sub_dependencies: "Next.js"
  };
  en.onboarding.project.mock_content = {
    what_it_does: "What does this project do?",
    what_it_does_text: "The project is a pedagogical simulator designed to demonstrate processor scheduling algorithms (FIFO, SJF, and Round-Robin) in an interactive web interface.",
    strengths: "Key Strengths",
    strength_1_title: "Clear Visualization",
    strength_1_text: "Transforms abstract theory into intuitive visual diagrams.",
    strength_2_title: "Classic Algorithms",
    strength_2_text: "Contains solid implementations of core schedulers.",
    architecture: "Project Architecture",
    architecture_text: "React-based frontend application (Next.js) running entirely client-side. Separate components handle process queues and the Gantt chart."
  };
}

if (!en.onboarding.profile.mock_role) {
  en.onboarding.profile.mock_role = "Fullstack Developer";
  en.onboarding.profile.mock_date = "Jan 22, 2026";
  en.onboarding.profile.mock_pr = "Merge pull request #1 from mariocomp/mariocomp-patch-1 Add instructions for running the main file";
}

if (!en.onboarding.create.mock_title_input) {
  en.onboarding.create.mock_title_input = "Scheduling Simulator";
  en.onboarding.create.mock_repo = "mariojr/scheduler";
}

// Update PT
if (!pt.onboarding.project.mock_tabs) {
  pt.onboarding.project.mock_tabs = {
    analysis: "Análise (AI)",
    comments: "Comentários",
    commits: "Commits"
  };
  pt.onboarding.project.mock_stats = {
    languages: "Linguagens",
    files: "Arquivos",
    dependencies: "Dependências",
    health: "Saúde",
    production: "Pronto p/ Produção",
    sub_languages: "JavaScript, CSS, HTML",
    sub_files: "28 KB",
    sub_dependencies: "Next.js"
  };
  pt.onboarding.project.mock_content = {
    what_it_does: "O que este projeto faz?",
    what_it_does_text: "O projeto é um simulador pedagógico projetado para demonstrar os algoritmos de escalonamento do processador (FIFO, SJF e Round-Robin) em uma interface interativa web.",
    strengths: "Principais Forças",
    strength_1_title: "Visualização Clara",
    strength_1_text: "Transforma a teoria abstrata em diagramas visuais intuitivos.",
    strength_2_title: "Algoritmos Clássicos",
    strength_2_text: "Contém implementações sólidas dos escalonadores principais.",
    architecture: "Arquitetura do Projeto",
    architecture_text: "Aplicação frontend baseada em React (Next.js) que roda inteiramente no lado do cliente. Componentes separados lidam com as filas de processos e o gráfico de Gantt."
  };
}

if (!pt.onboarding.profile.mock_role) {
  pt.onboarding.profile.mock_role = "Desenvolvedor Fullstack";
  pt.onboarding.profile.mock_date = "22 de jan. de 2026";
  pt.onboarding.profile.mock_pr = "Merge pull request #1 from mariocomp/mariocomp-patch-1 Add instructions for running the main file";
}

if (!pt.onboarding.create.mock_title_input) {
  pt.onboarding.create.mock_title_input = "Simulador de Escalonamento";
  pt.onboarding.create.mock_repo = "mariojr/escalonador";
}

fs.writeFileSync(enPath, JSON.stringify(en, null, 2) + '\n');
fs.writeFileSync(ptPath, JSON.stringify(pt, null, 2) + '\n');

console.log("Locales patched successfully.");
