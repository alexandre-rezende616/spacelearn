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

- Arquivo do cliente: `src/lib/supabaseClient.ts`
  - Usa `AsyncStorage`, sessao persistente e URL/KEY ja estao configuradas.

- Tabela de perfis: `supabase/profiles.sql`
  - Estrutura com `id`, `role` (`aluno` | `professor` | `coordenador`), `nome`, avatar, XP total e moedas.
  - Politicas permitem o usuario logado ler/alterar o proprio perfil.
- Demais tabelas e `ALTER TABLE`: veja `supabase/schema_updates.sql`.
  - Missões (`missions`, `mission_questions`, `mission_options`), turmas, jornada (`mission_classes`), avisos (`class_messages`) e registro de cosméticos (`cosmetic_purchases`).
  - Execute os comandos quando atualizar um banco já existente.
- Storage: crie um bucket público `avatars` para armazenar as fotos de perfil.

- Fluxo de autenticacao
  - Cadastro (`app/auth/signup.tsx`): salva o `role` no `user_metadata` e faz `upsert` no perfil somente se houver sessao ativa (respeitando RLS). Se precisar confirmar e-mail, o upsert acontece no login.
  - Login (`app/auth/login.tsx`): pega o `role` do `profiles` com fallback no `user_metadata.role`, garante o registro em `profiles` com a sessao ativa e redireciona para o grupo correto.

## Navegação e perfis

- Expo Router por pastas (file-based routing)
  - Grupo do aluno: `app/(aluno)` — turmas, jornadas e personalização.
  - Grupo do professor: `app/(professor)` — painéis, turmas, biblioteca de missões.
  - Grupo do coordenador: `app/(coordenador)` — gestão de missões globais.
  - Auth: `app/auth`

- Root layout: `app/_layout.tsx`
  - Detecta sessao e direciona por `role` (aluno/professor/coordenador) no load inicial e quando a sessao mudar.
  - Sem sessao: vai para `/auth/login`.

## audio (sem expo-av)

- Aviso: `expo-av` esta deprecado no SDK 54.
- O projeto usa `expo-audio` para tocar efeitos curtos.
- Exemplo real no app: `app/(aluno)/play/[lessonId].tsx`
  - `createAudioPlayer(require('...mp3')).play()` e depois `player.remove()` para liberar.

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
