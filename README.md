# TrustCare — OS Manager

Plataforma SaaS Multi-Tenant para gestão e controle operacional de assistências técnicas, oficinas de reparo e consultorias de TI.

## 📚 Documentação do Projeto

- **[PRD.md](file:///c:/Projetos/trustcare/PRD.md)**: Documento de Requisitos de Produto (especificação funcional completa, regras de negócio, personas e métricas).
- **[DESIGN_SYSTEM.md](file:///c:/Projetos/trustcare/DESIGN_SYSTEM.md)**: Diretrizes de design e padrões de interface (*Swiss Technical Minimalism*).
- **[IMPLEMENTATION_PLAN.md](file:///c:/Projetos/trustcare/IMPLEMENTATION_PLAN.md)**: Plano de ação e correções técnicas derivadas da auditoria.
- **[AUDITORIA.md](file:///c:/Projetos/trustcare/AUDITORIA.md)**: Auditoria técnica e mapeamento de segurança do sistema.

## 🚀 Como Iniciar

Instale as dependências e execute o servidor de desenvolvimento:

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador.

## 🛠️ Stack Tecnológica

- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Lucide Icons
- **Backend & Banco de Dados**: Supabase (PostgreSQL 15 + Row Level Security, Auth e Storage)
- **Comunicação & Cobrança**: Resend (e-mails transacionais) e Asaas (assinaturas SaaS)
- **Qualidade & Testes**: Vitest, Playwright, ESLint

