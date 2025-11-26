import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radii, spacing } from '../../../src/theme/tokens';
import { fetchMissionContent, submitMissionAnswer } from '../../../src/modules/missionFlow/api';
import type { Question, Option } from '../../../src/modules/missionFlow/types';
import { useAuth } from '../../../src/store/useAuth';

type OptionsByQuestion = Record<string, Option[]>;

export default function PlayMission() {
  const { missionId } = useLocalSearchParams<{ missionId: string }>();
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [optionsByQuestion, setOptionsByQuestion] = useState<OptionsByQuestion>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const totalQuestions = questions.length;
  const currentQuestion = useMemo(() => questions[currentIndex] ?? null, [questions, currentIndex]);
  const currentOptions = currentQuestion ? optionsByQuestion[currentQuestion.id] ?? [] : [];

  async function loadMission() {
    if (!missionId || !user?.id) return;
    try {
      setLoading(true);
      const content = await fetchMissionContent(missionId);
      setQuestions(content.questions);
      setOptionsByQuestion(content.optionsByQuestion);
      setCurrentIndex(0);
      setCorrectCount(0);
      setFeedback(null);
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível carregar esta missão.');
      router.back();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missionId, user?.id]);

  async function handleAnswer(option: Option) {
    if (!currentQuestion || submitting) return;
    try {
      setSubmitting(true);
      const completed = currentIndex === totalQuestions - 1;
      const result = await submitMissionAnswer({
        missionId: missionId as string,
        questionId: currentQuestion.id,
        optionId: option.id,
        currentCorrectCount: correctCount,
        totalQuestions: totalQuestions,
        completed,
      });

      setCorrectCount(result.nextCorrect);
      setFeedback(result.isCorrect ? 'Resposta correta!' : 'Resposta incorreta.');

      if (result.completed) {
        Alert.alert(
          'Missão concluída',
          `Você acertou ${result.nextCorrect} de ${result.totalQuestions}.`,
          [{ text: 'OK', onPress: () => router.back() }],
        );
        return;
      }

      setTimeout(() => {
        setFeedback(null);
        setCurrentIndex((prev) => Math.min(prev + 1, totalQuestions - 1));
      }, 500);
    } catch (err: any) {
      const message = err?.message ?? 'Não foi possível enviar sua resposta.';
      Alert.alert('Erro', message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!missionId) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgLight }}>
        <Text style={{ color: colors.navy800 }}>Missão não encontrada.</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgLight }}>
        <Text style={{ color: colors.navy800 }}>Carregando missão...</Text>
      </View>
    );
  }

  if (!currentQuestion) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bgLight, padding: spacing.lg }}>
        <Text style={{ color: colors.navy800, textAlign: 'center' }}>
          Nenhuma pergunta disponível para esta missão.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgLight }} contentContainerStyle={{ padding: spacing.lg, gap: spacing.md }}>
      <View style={{ alignItems: 'flex-start', gap: spacing.xs }}>
        <Text style={{ color: colors.navy800 }}>Pergunta {currentIndex + 1} de {totalQuestions}</Text>
        <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900, fontSize: 18 }}>
          {currentQuestion.prompt}
        </Text>
      </View>

      <View style={{ gap: spacing.sm }}>
        {currentOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            onPress={() => handleAnswer(option)}
            disabled={submitting}
            style={{
              borderWidth: 1,
              borderColor: colors.navy800,
              borderRadius: radii.md,
              padding: spacing.md,
              backgroundColor: colors.white,
              opacity: submitting ? 0.7 : 1,
            }}
          >
            <Text style={{ color: colors.navy900 }}>{option.text}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {feedback && (
        <Text style={{ color: feedback.includes('correta') ? '#0BA06B' : colors.brandPink, marginTop: spacing.sm }}>
          {feedback}
        </Text>
      )}

      <View style={{ marginTop: spacing.lg }}>
        <Text style={{ color: colors.navy800 }}>
          Acertos: {correctCount} / {totalQuestions}
        </Text>
      </View>
    </ScrollView>
  );
}
