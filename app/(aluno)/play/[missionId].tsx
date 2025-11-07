import { useEffect, useMemo, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radii, shadows, spacing } from '../../../src/theme/tokens';
import { supabase } from '../../../src/lib/supabaseClient';
import { useAuth } from '../../../src/store/useAuth';
import { goBackOrReplace } from '../../../src/utils/navigation';

type Question = { id: string; prompt: string; order_index: number };
type Option = { id: string; question_id: string; text: string; is_correct: boolean };
type Medal = { id: string; title: string; description: string | null; required_correct: number };

export default function PlayMission() {
  const router = useRouter();
  const { missionId } = useLocalSearchParams<{ missionId: string }>();
  const user = useAuth((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [optionsByQ, setOptionsByQ] = useState<Record<string, Option[]>>({});
  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalCorrectLoaded, setTotalCorrectLoaded] = useState(false);
  const [medals, setMedals] = useState<Medal[]>([]);
  const total = questions.length;

  useEffect(() => {
    (async () => {
      if (!missionId || !user?.id) return;
      try {
        setLoading(true);
        setIdx(0);
        setCorrectCount(0);
        setOptionsByQ({});
        // Carrega perguntas
        const { data: qs, error: qErr } = await supabase
          .from('mission_questions')
          .select('id,prompt,order_index')
          .eq('mission_id', missionId)
          .order('order_index', { ascending: true });
        if (qErr) throw qErr;
        const questionList = (qs as Question[]) ?? [];
        setQuestions(questionList);

        const qIds = (qs ?? []).map((q: any) => q.id);
        if (qIds.length > 0) {
          const { data: opts, error: oErr } = await supabase
            .from('mission_options')
            .select('id,question_id,text,is_correct')
            .in('question_id', qIds);
          if (oErr) throw oErr;
          const map: Record<string, Option[]> = {};
          (opts ?? []).forEach((o: any) => {
            if (!map[o.question_id]) map[o.question_id] = [];
            map[o.question_id].push(o as Option);
          });
          setOptionsByQ(map);
        } else {
          await diagnoseMissionAvailability();
        }
      } catch (e: any) {
        Alert.alert('Erro', e?.message ?? 'Não foi possível carregar a missão');
      } finally {
        setLoading(false);
      }
    })();
  }, [missionId, user?.id]);

  async function diagnoseMissionAvailability() {
    try {
      if (!missionId || !user?.id) return;
      const { data: assignments } = await supabase
        .from('mission_classes')
        .select('class_id,classes(name)')
        .eq('mission_id', missionId);
      if (!assignments?.length) {
        Alert.alert(
          'Missão sem turma',
          'Esta missão ainda não foi atribuída a nenhuma turma. Peça ao professor para adicioná-la na jornada.',
        );
        return;
      }
      const classIds = assignments.map((item: any) => item.class_id);
      const { data: enrollmentRows } = await supabase
        .from('enrollments')
        .select('class_id')
        .in('class_id', classIds)
        .eq('student_id', user.id);
      if (!enrollmentRows?.length) {
        Alert.alert(
          'Missão indisponível',
          'Você ainda não faz parte de uma turma que tenha recebido esta missão.',
        );
        return;
      }
      Alert.alert(
        'Missão sem perguntas',
        'O professor ainda não adicionou questões publicadas para esta missão. Tente novamente mais tarde.',
      );
    } catch {
      // silencioso
    }
  }

  useEffect(() => {
    if (!user?.id) return;
    setTotalCorrectLoaded(false);
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('progress')
          .select('mission_id,correct_count')
          .eq('student_id', user.id);
        if (error) throw error;
        if (!active) return;
        const rows = data ?? [];
        const totalSum = rows.reduce(
          (sum, row: any) => sum + ((row.correct_count as number | null) ?? 0),
          0,
        );
        setTotalCorrect(totalSum);
      } catch {
        // silencioso
      } finally {
        if (active) setTotalCorrectLoaded(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('medals')
          .select('id,title,description,required_correct');
        if (error) throw error;
        if (!active) return;
        setMedals((data as Medal[]) ?? []);
      } catch {
        // silencioso
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function playSound(correct: boolean) {
    try {
      const mod = await import('expo-audio');
      // API pode variar; tentativa com expo-av padrão
      // @ts-ignore
      const { default: AV } = await import('expo-av');
      // @ts-ignore
      const { Audio } = AV;
      // @ts-ignore
      const sound = new Audio.Sound();
      await sound.loadAsync(correct ? require('@/assets/sounds/correct.mp3') : require('@/assets/sounds/wrong.mp3'));
      await sound.playAsync();
    } catch {
      // silencioso se audio indisponível
    }
  }

  async function answer(q: Question, option: Option) {
    if (!user?.id || !missionId) return;
    const is_correct = !!option.is_correct;
    try {
      // attempts
      const { error: aErr } = await supabase.from('attempts').insert({
        mission_id: missionId,
        question_id: q.id,
        student_id: user.id,
        selected_option_id: option.id,
        is_correct,
      });
      if (aErr) throw aErr;

      // progress (upsert)
      const nextCorrect = is_correct ? correctCount + 1 : correctCount;
      const nextTotal = total;
      const completed = idx + 1 >= total;
      const { data: existingProgress, error: existingErr } = await supabase
        .from('progress')
        .select('xp_awarded,coins_awarded,correct_count')
        .eq('mission_id', missionId)
        .eq('student_id', user.id)
        .maybeSingle();
      if (existingErr) throw existingErr;
      const prevMissionCorrect = (existingProgress?.correct_count as number | null) ?? 0;

      const xp = completed ? nextCorrect * 10 : 0;
      const coins = completed ? nextCorrect * 5 : 0;

      const { error: pErr } = await supabase
        .from('progress')
        .upsert(
          {
            mission_id: missionId,
            student_id: user.id,
            correct_count: nextCorrect,
            total_count: nextTotal,
            completed,
            xp_awarded: xp,
            coins_awarded: coins,
          },
          { onConflict: 'mission_id,student_id' },
        );
      if (pErr) throw pErr;

      const prevXp = existingProgress?.xp_awarded ?? 0;
      const prevCoins = existingProgress?.coins_awarded ?? 0;
      const deltaXp = xp - prevXp;
      const deltaCoins = coins - prevCoins;

      if (deltaXp !== 0 || deltaCoins !== 0) {
        const { data: profileRow, error: profileErr } = await supabase
          .from('profiles')
          .select('xp_total,coins_balance')
          .eq('id', user.id)
          .maybeSingle();
        if (profileErr) throw profileErr;
        const currentXp = (profileRow?.xp_total as number | null) ?? 0;
        const currentCoins = (profileRow?.coins_balance as number | null) ?? 0;
        const nextXp = Math.max(0, currentXp + deltaXp);
        const nextCoins = Math.max(0, currentCoins + deltaCoins);
        const { error: updateErr } = await supabase
          .from('profiles')
          .update({ xp_total: nextXp, coins_balance: nextCoins })
          .eq('id', user.id);
        if (updateErr) throw updateErr;
      }

      const baseTotal = totalCorrectLoaded ? totalCorrect : prevMissionCorrect;
      const updatedTotalCorrect = baseTotal - prevMissionCorrect + nextCorrect;
      setTotalCorrect(updatedTotalCorrect);
      const newlyUnlocked = totalCorrectLoaded
        ? medals.filter(
            (medal) =>
              totalCorrect < medal.required_correct && updatedTotalCorrect >= medal.required_correct,
          )
        : [];

      setCorrectCount(nextCorrect);
      await playSound(is_correct);

      if (completed) {
        const rewardSummary =
          deltaXp > 0 || deltaCoins > 0
            ? `Recompensas: ${deltaXp > 0 ? `${deltaXp} XP` : ''}${deltaXp > 0 && deltaCoins > 0 ? ' • ' : ''}${deltaCoins > 0 ? `${deltaCoins} moedas` : ''}`
            : undefined;
        const medalMessage = newlyUnlocked.length
          ? `Medalha${newlyUnlocked.length > 1 ? 's' : ''} desbloqueada${newlyUnlocked.length > 1 ? 's' : ''}: ${newlyUnlocked
              .map((medal) => medal.title)
              .join(', ')}`
          : null;
        const finalMessage = [rewardSummary ?? `Acertos: ${nextCorrect}/${nextTotal}`, medalMessage]
          .filter(Boolean)
          .join('\n\n');
        Alert.alert('Missão concluída', finalMessage);
        goBackOrReplace(router, { pathname: "/(aluno)/missoes" } as any);
      } else {
        if (newlyUnlocked.length) {
          const medalMessage =
            newlyUnlocked.length === 1
              ? `Você desbloqueou a medalha ${newlyUnlocked[0].title}!`
              : `Você desbloqueou as medalhas ${newlyUnlocked
                  .map((medal) => medal.title)
                  .join(', ')}!`;
          Alert.alert('Medalhas', medalMessage);
        }
        setIdx((v) => v + 1);
      }
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível registrar sua resposta');
    }
  }

  const current = questions[idx];
  const options = useMemo(() => (current ? (optionsByQ[current.id] ?? []) : []), [current, optionsByQ]);

  if (!current) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgLight }}>
        <Text style={{ color: colors.navy800 }}>
          {loading ? 'Carregando missão...' : 'Nenhuma pergunta disponível nesta missão.'}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight, padding: spacing.lg }}>
      <Animated.View entering={FadeInUp.duration(350)} style={{ gap: spacing.lg }}>
        <Text style={{ color: colors.navy800 }}>{`Pergunta ${idx + 1} de ${total}`}</Text>
        <Text style={{ fontSize: 20, color: colors.navy900, fontFamily: 'Inter-Bold' }}>{current.prompt}</Text>

        <View style={{ gap: spacing.md }}>
          {options.map((o) => (
            <TouchableOpacity
              key={o.id}
              onPress={() => answer(current, o)}
              style={{ backgroundColor: colors.white, padding: spacing.lg, borderRadius: radii.lg, ...shadows.soft }}
            >
              <Text style={{ color: colors.navy900 }}>{o.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

