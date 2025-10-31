import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radii, shadows, spacing } from '../../../src/theme/tokens';
import { supabase } from '../../../src/lib/supabaseClient';
import { useAuth } from '../../../src/store/useAuth';

type Question = { id: string; prompt: string; order_index: number };
type Option = { id: string; question_id: string; text: string; is_correct: boolean };

export default function PlayMission() {
  const router = useRouter();
  const { missionId } = useLocalSearchParams<{ missionId: string }>();
  const user = useAuth((s) => s.user);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [optionsByQ, setOptionsByQ] = useState<Record<string, Option[]>>({});
  const [idx, setIdx] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const total = questions.length;

  useEffect(() => {
    (async () => {
      if (!missionId || !user?.id) return;
      try {
        setLoading(true);
        // Carrega perguntas
        const { data: qs, error: qErr } = await supabase
          .from('mission_questions')
          .select('id,prompt,order_index')
          .eq('mission_id', missionId)
          .order('order_index', { ascending: true });
        if (qErr) throw qErr;
        setQuestions((qs as Question[]) ?? []);

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
        }
      } catch (e: any) {
        Alert.alert('Erro', e?.message ?? 'Não foi possível carregar a missão');
      } finally {
        setLoading(false);
      }
    })();
  }, [missionId, user?.id]);

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
      const xp = completed ? nextCorrect * 10 : 0;
      const coins = completed ? nextCorrect * 5 : 0;
      const { error: pErr } = await supabase
        .from('progress')
        .upsert({
          mission_id: missionId,
          student_id: user.id,
          correct_count: nextCorrect,
          total_count: nextTotal,
          completed,
          xp_awarded: xp,
          coins_awarded: coins,
        }, { onConflict: 'mission_id,student_id' });
      if (pErr) throw pErr;

      setCorrectCount(nextCorrect);
      await playSound(is_correct);

      if (completed) {
        Alert.alert('Missão concluída', `Acertos: ${nextCorrect}/${nextTotal}`);
        router.back();
      } else {
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
        <Text style={{ color: colors.navy800 }}>Carregando missão...</Text>
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

