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

## Configura��o do Supabase

- Arquivo do cliente: `src/lib/supabaseClient.ts`
  - Usa `AsyncStorage`, sessao persistente e URL/KEY ja estao configuradas.

- Tabela de perfis: `supabase/profiles.sql`
  - Estrutura simples com `id`, `role` (`aluno` | `professor`), `nome` e RLS habilitado.
  - Politicas permitem o usuario logado ler/alterar o proprio perfil.

- Fluxo de autenticacao
  - Cadastro (`app/auth/signup.tsx`): salva o `role` no `user_metadata` e faz `upsert` no perfil somente se houver sessao ativa (respeitando RLS). Se precisar confirmar e-mail, o upsert acontece no login.
  - Login (`app/auth/login.tsx`): pega o `role` do `profiles` com fallback no `user_metadata.role`, garante o registro em `profiles` com a sessao ativa e redireciona para o grupo correto.

## Navega��o e perfis

- Expo Router por pastas (file-based routing)
  - Grupo do aluno: `app/(aluno)`
  - Grupo do professor: `app/(professor)`
  - Auth: `app/auth`

- Root layout: `app/_layout.tsx`
  - Detecta sessao e direciona por `role` (aluno/professor) no load inicial e quando a sess�o mudar.
  - Sem sessao: vai para `/auth/login`.

## �udio (sem expo-av)

- Aviso: `expo-av` esta deprecado no SDK 54.
- O projeto usa `expo-audio` para tocar efeitos curtos.
- Exemplo real no app: `app/(aluno)/play/[lessonId].tsx`
  - `createAudioPlayer(require('...mp3')).play()` e depois `player.remove()` para liberar.

## Scripts �teis

- `npm install`  instala as depend�ncias.
- `npx expo start -c` �inicia o app e limpa o cache.
- `npm run reset-project` �comando do template (nao vamos usar no dia a dia).

## Dicas r�pidas

- Se o TypeScript reclamar do JSX: o Expo pode ajustar o `tsconfig.json` automaticamente e colocar `extends: "expo/tsconfig.base"`. Isso é normal.
- Se aparecer erro de RLS ao salvar perfil: garanta que o upsert seja feito quando houver sessao (o app ja faz isso no login/cadastro).
- Se algo quebrar apos updates de pacotes: pare o bundler, rode `npm install`, depois `npx expo start -c`.

## Roadmapzinho

- [ ] Melhorar telas de professor (turmas/missoes)
- [ ] Conteudo dinamico de missoes/quiz via Supabase
- [ ] Ajustes finos de UI/UX e feedbacks de progresso