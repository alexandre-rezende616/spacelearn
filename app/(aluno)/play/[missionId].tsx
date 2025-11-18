import { useEffect, useMemo, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radii, shadows, spacing } from '../../../src/theme/tokens';
import { useAuth } from '../../../src/store/useAuth';
import { goBackOrReplace } from '../../../src/utils/navigation';
import {
  diagnoseMissionAvailability,
  fetchMedals,
  fetchMissionContent,
  fetchTotalCorrect,
  submitMissionAnswer,
} from '../../../src/modules/missionFlow/api';
import type { Medal, Option, Question } from '../../../src/modules/missionFlow/types';

export default function PlayMission() {
  const router = useRouter();
  const params = useLocalSearchParams<{ missionId?: string | string[] }>();
  const missionId = useMemo(() => {
    if (Array.isArray(params.missionId)) return params.missionId[0];
    return params.missionId ?? null;
  }, [params.missionId]);
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
    if (!missionId) {
      goBackOrReplace(router, { pathname: "/(aluno)/missoes" } as any);
    }
  }, [missionId, router]);

  useEffect(() => {
    (async () => {
      if (!missionId || !user?.id) return;
      try {
        setLoading(true);
        setIdx(0);
        setCorrectCount(0);
        setOptionsByQ({});
        const content = await fetchMissionContent(missionId);
        setQuestions(content.questions as Question[]);
        setOptionsByQ(content.optionsByQuestion);
        if (content.questions.length === 0) {
          const issue = await diagnoseMissionAvailability(missionId, user.id);
          if (issue === 'no-classes') {
            Alert.alert(
              'Missão sem turma',
              'Esta missão ainda não foi atribuída a nenhuma turma. Peça ao professor para adicioná-la na jornada.',
            );
          } else if (issue === 'student-not-enrolled') {
            Alert.alert(
              'Missão indisponível',
              'Você ainda não faz parte de uma turma que tenha recebido esta missão.',
            );
          } else {
            Alert.alert(
              'Missão sem perguntas',
              'O professor ainda não adicionou questões publicadas para esta missão. Tente novamente mais tarde.',
            );
          }
        }
      } catch (e: any) {
        Alert.alert('Erro', e?.message ?? 'Não foi possível carregar a missão');
      } finally {
        setLoading(false);
      }
    })();
  }, [missionId, user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    setTotalCorrectLoaded(false);
    let active = true;
    (async () => {
      try {
        const totalSum = await fetchTotalCorrect(user.id);
        if (!active) return;
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
        const items = await fetchMedals();
        if (!active) return;
        setMedals(items);
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
    if (!missionId) return;
    try {
      const completed = idx + 1 >= total;
      const result = await submitMissionAnswer({
        missionId,
        questionId: q.id,
        optionId: option.id,
        currentCorrectCount: correctCount,
        totalQuestions: total,
        completed,
      });

      const baseTotal = totalCorrectLoaded ? totalCorrect : result.prevMissionCorrect;
      const updatedTotalCorrect = baseTotal - result.prevMissionCorrect + result.nextCorrect;
      setTotalCorrect(updatedTotalCorrect);
      const newlyUnlocked = totalCorrectLoaded
        ? medals.filter(
            (medal) =>
              totalCorrect < medal.required_correct && updatedTotalCorrect >= medal.required_correct,
          )
        : [];

      setCorrectCount(result.nextCorrect);
      await playSound(result.isCorrect);

      if (result.completed) {
        const rewardSummary =
          result.deltaXp > 0 || result.deltaCoins > 0
            ? `Recompensas: ${result.deltaXp > 0 ? `${result.deltaXp} XP` : ''}${result.deltaXp > 0 && result.deltaCoins > 0 ? ' • ' : ''}${result.deltaCoins > 0 ? `${result.deltaCoins} moedas` : ''}`
            : undefined;
        const medalMessage = newlyUnlocked.length
          ? `Medalha${newlyUnlocked.length > 1 ? 's' : ''} desbloqueada${newlyUnlocked.length > 1 ? 's' : ''}: ${newlyUnlocked
              .map((medal) => medal.title)
              .join(', ')}`
          : null;
        const finalMessage = [rewardSummary ?? `Acertos: ${result.nextCorrect}/${result.nextTotal}`, medalMessage]
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

  if (!missionId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bgLight }}>
        <Text style={{ color: colors.navy800 }}>Missão inválida.</Text>
      </View>
    );
  }

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

