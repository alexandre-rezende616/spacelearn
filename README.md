# SpaceLearn (Expo + Supabase)

App em React Native com Expo Router e Supabase, focado em conteudos de espaco/ciencia para alunos e professores.

## Como rodar

- Instalar dependencias
  - `npm install`

- Iniciar o app (limpando cache)
  - `npx expo start -c`

- Abrir no emulador/dispositivo
  - Android: tecle `a`
  - iOS (Mac): tecle `i`
  - Web: tecle `w`

## Configuração do Supabase
### Variáveis de ambiente
- Agora lidas de `app.config.js` (via `extra`) com fallback dev.
- Defina no `.env` (carregado pelo `app.config.js`):
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
- O `src/lib/supabaseClient.ts` lê de `expo-constants` e avisa se faltar.

### Supabase
- Arquivo do cliente: `src/lib/supabaseClient.ts`
- Tabela de perfis: `supabase/profiles.sql`
  - Estrutura com `id`, `role` (`aluno` | `professor` | `coordenador`), `nome`, avatar, XP total e moedas.
  - Políticas permitem o usuário logado ler/alterar o próprio perfil.
- Demais tabelas e `ALTER TABLE`: veja `supabase/schema_updates.sql`.
  - Missões (`missions`, `mission_questions`, `mission_options`), turmas, jornada (`mission_classes`), avisos (`class_messages`) e registro de cosméticos (`cosmetic_purchases`).
  - Execute os comandos quando atualizar um banco já existente.
- Storage: crie um bucket público `avatars` para armazenar as fotos de perfil.

- Fluxo de autenticação
  - Cadastro (`app/auth/signup.tsx`): salva o `role` no `user_metadata` e faz `upsert` no perfil somente se houver sessão ativa (respeitando RLS). Se precisar confirmar e-mail, o upsert acontece no login.
  - Login (`app/auth/login.tsx`): pega o `role` do `profiles` com fallback no `user_metadata.role`, garante o registro em `profiles` com a sessão ativa e redireciona para o grupo correto.

### Build e deploy Web (Render - Static Site)
1) `npm install`
2) Export web: `npx expo export --platform web` (gera `dist/`).
   - Testar local: `npx serve dist` ou `npx http-server dist`.
3) Render Static Site:
   - Build Command: `npx expo export --platform web`
   - Publish Directory: `dist`
   - Env vars: `SUPABASE_URL`, `SUPABASE_ANON_KEY` (e outras que usar)
   - Node >= 18 (ex.: `NODE_VERSION=20`)
4) Supabase CORS: Settings → API → Allowed CORS origins → adicionar a URL do Render (e domínio final).
5) Rotas SPA: Expo Router já exporta com fallback para `index.html`.

### Checklist rápido
- `.env` local com `SUPABASE_URL` / `SUPABASE_ANON_KEY`
- CORS no Supabase para o domínio do Render
- Build no Render com `npx expo export --platform web` e publish `dist`

## Navegação e perfis

- Expo Router por pastas (file-based routing)
  - Grupo do aluno: `app/(aluno)` — turmas, jornadas e personalização.
  - Grupo do professor: `app/(professor)` — painéis, turmas, biblioteca de missões.
  - Grupo do coordenador: `app/(coordenador)` — gestão de missões globais.
  - Auth: `app/auth`

- Root layout: `app/_layout.tsx`
  - Detecta sessao e direciona por `role` (aluno/professor/coordenador) no load inicial e quando a sessao mudar.
  - Sem sessao: vai para `/auth/login`.


## Scripts uteis

- `npm install`  instala as dependencias.
- `npx expo start -c` inicia o app e limpa o cache.
- `npm run reset-project` comando do template (nao vamos usar no dia a dia).

## Dicas rápidas

- Se o TypeScript reclamar do JSX: o Expo pode ajustar o `tsconfig.json` automaticamente e colocar `extends: "expo/tsconfig.base"`. Isso é normal.
- Se aparecer erro de RLS ao salvar perfil: garanta que o upsert seja feito quando houver sessao (o app ja faz isso no login/cadastro).
- Se algo quebrar apos updates de pacotes: pare o bundler, rode `npm install`, depois `npx expo start -c`.

## Novidades de gameplay

- Coordenadores podem criar missões completas (perguntas/opções) e publicá-las para os professores.
- Professores montam jornadas por turma, reordenam missões e emitem avisos em tempo real.
- Alunos acompanham a jornada da turma, recebem avisos, ganham XP/moedas e personalizam o avatar.

## Roadmapzinho

- [x] Melhorar telas de professor (turmas/missões)
- [x] Conteúdo dinâmico de missões/quiz via Supabase
- [ ] Ajustes finos de UI/UX e feedbacks de progresso
