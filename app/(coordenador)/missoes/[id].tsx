import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, radii, shadows, spacing } from '../../../src/theme/tokens';
import { supabase } from '../../../src/lib/supabaseClient';
import { useAuth } from '../../../src/store/useAuth';
import { goBackOrReplace } from '../../../src/utils/navigation';

type Mission = { id: string; title: string; description: string | null; status: 'draft' | 'published'; created_by?: string };
type Question = { id: string; prompt: string; order_index: number };
type Option = { id: string; question_id: string; text: string; is_correct: boolean };

export default function CoordenadorEditMission() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuth((s) => s.user);

  const [mission, setMission] = useState<Mission | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [descriptionDraft, setDescriptionDraft] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [optionsByQuestion, setOptionsByQuestion] = useState<Record<string, Option[]>>({});
  const [loading, setLoading] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [questionModalVisible, setQuestionModalVisible] = useState(false);
  const [questionDraft, setQuestionDraft] = useState('');
  const [optionDrafts, setOptionDrafts] = useState<Array<{ id: string; text: string; is_correct: boolean }>>(
    Array.from({ length: 4 }, (_, index) => ({
      id: `opt-${index}`,
      text: '',
      is_correct: index === 0,
    })),
  );
  const [savingQuestion, setSavingQuestion] = useState(false);

  const currentMissionId = useMemo(() => id ?? null, [id]);

  async function loadMission() {
    if (!currentMissionId || !user?.id) return;
    try {
      setLoading(true);
      const { data: mData, error: mErr } = await supabase
        .from('missions')
        .select('id,title,description,status,created_by')
        .eq('id', currentMissionId)
        .maybeSingle();
      if (mErr) throw mErr;
      if (!mData || mData.created_by !== user.id) {
        Alert.alert('Missão não encontrada', 'Verifique se a missão pertence ao seu usuário.');
        goBackOrReplace(router, { pathname: "/(coordenador)/missoes" } as any);
        return;
      }
      setMission(mData as Mission);
      setTitleDraft(mData.title ?? '');
      setDescriptionDraft(mData.description ?? '');

      const { data: qData, error: qErr } = await supabase
        .from('mission_questions')
        .select('id,prompt,order_index')
        .eq('mission_id', currentMissionId)
        .order('order_index', { ascending: true });
      if (qErr) throw qErr;
      setQuestions((qData as Question[]) ?? []);

      const questionIds = (qData ?? []).map((q: any) => q.id);
      if (questionIds.length) {
        const { data: optData, error: optErr } = await supabase
          .from('mission_options')
          .select('id,question_id,text,is_correct')
          .in('question_id', questionIds);
        if (optErr) throw optErr;
        const grouped: Record<string, Option[]> = {};
        (optData ?? []).forEach((opt: any) => {
          if (!grouped[opt.question_id]) grouped[opt.question_id] = [];
          grouped[opt.question_id].push(opt as Option);
        });
        setOptionsByQuestion(grouped);
      } else {
        setOptionsByQuestion({});
      }
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível carregar a missão.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMission();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMissionId, user?.id]);

  useEffect(() => {
    if (!currentMissionId || !user?.id) return;
    const channel = supabase
      .channel(`coord-edit-mission-${currentMissionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'missions', filter: `id=eq.${currentMissionId}` },
        () => loadMission(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_questions', filter: `mission_id=eq.${currentMissionId}` },
        () => loadMission(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMissionId, user?.id]);

  useEffect(() => {
    if (!questions.length) return;
    const channel = supabase.channel(`coord-mission-options-${currentMissionId}`);
    questions.forEach((q) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_options', filter: `question_id=eq.${q.id}` },
        () => loadMission(),
      );
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.map((q) => q.id).join(',')]);

  async function saveMissionDetails() {
    if (!mission || !titleDraft.trim()) {
      Alert.alert('Título obrigatório', 'Informe o título da missão.');
      return;
    }
    try {
      setSavingDetails(true);
      const payload = { title: titleDraft.trim(), description: descriptionDraft.trim() || null };
      const { error } = await supabase.from('missions').update(payload).eq('id', mission.id);
      if (error) throw error;
      setMission((prev) => (prev ? { ...prev, ...payload } : prev));
      Alert.alert('Sucesso', 'Detalhes da missão atualizados.');
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível atualizar a missão.');
    } finally {
      setSavingDetails(false);
    }
  }

  async function togglePublish() {
    if (!mission) return;
    const nextStatus = mission.status === 'published' ? 'draft' : 'published';
    try {
      const { error } = await supabase.from('missions').update({ status: nextStatus }).eq('id', mission.id);
      if (error) throw error;
      setMission((prev) => (prev ? { ...prev, status: nextStatus } : prev));
      Alert.alert(
        nextStatus === 'published' ? 'Missão publicada' : 'Movida para rascunho',
        nextStatus === 'published'
          ? 'Os professores já podem utilizar esta missão nas turmas.'
          : 'A missão voltou para rascunho e deixa de aparecer na biblioteca pública.',
      );
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Falha ao atualizar o status da missão.');
    }
  }

  function openQuestionModal() {
    setQuestionDraft('');
    setOptionDrafts(Array.from({ length: 4 }, (_, index) => ({
      id: `opt-${Date.now()}-${index}`,
      text: '',
      is_correct: index === 0,
    })));
    setQuestionModalVisible(true);
  }

  function updateOptionText(optionId: string, text: string) {
    setOptionDrafts((prev) => prev.map((opt) => (opt.id === optionId ? { ...opt, text } : opt)));
  }

  function markOptionCorrect(optionId: string) {
    setOptionDrafts((prev) => prev.map((opt) => ({ ...opt, is_correct: opt.id === optionId })));
  }

  function addOptionField() {
    setOptionDrafts((prev) => [
      ...prev,
      { id: `opt-${Date.now()}`, text: '', is_correct: false },
    ]);
  }

  function removeDraftOption(optionId: string) {
    setOptionDrafts((prev) => prev.filter((opt) => opt.id !== optionId));
  }

  async function submitNewQuestion() {
    if (!currentMissionId) return;
    const prompt = questionDraft.trim();
    if (!prompt) {
      Alert.alert('Pergunta obrigatória', 'Informe o enunciado da pergunta.');
      return;
    }
    const preparedOptions = optionDrafts
      .map((opt) => ({ ...opt, text: opt.text.trim() }))
      .filter((opt) => opt.text.length > 0);

    if (preparedOptions.length < 2) {
      Alert.alert('Opções insuficientes', 'Cadastre pelo menos duas respostas.');
      return;
    }
    if (!preparedOptions.some((opt) => opt.is_correct)) {
      Alert.alert('Selecione a resposta correta', 'Marque qual alternativa é a correta.');
      return;
    }
    try {
      setSavingQuestion(true);
      const nextIndex = (questions[questions.length - 1]?.order_index ?? -1) + 1;
      const { data: createdQuestion, error: questionErr } = await supabase
        .from('mission_questions')
        .insert({ mission_id: currentMissionId, prompt, order_index: nextIndex })
        .select('id,prompt,order_index')
        .single();
      if (questionErr) throw questionErr;
      const rows = preparedOptions.map((opt) => ({
        question_id: createdQuestion.id,
        text: opt.text,
        is_correct: opt.is_correct,
      }));
      const { error: optionErr } = await supabase.from('mission_options').insert(rows);
      if (optionErr) throw optionErr;
      await loadMission();
      setQuestionModalVisible(false);
      Alert.alert('Pergunta criada', 'A nova pergunta foi adicionada à missão.');
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível salvar a pergunta.');
    } finally {
      setSavingQuestion(false);
    }
  }

  async function updateQuestion(question: Question, prompt: string) {
    try {
      const cleanPrompt = prompt.trim();
      const { error } = await supabase.from('mission_questions').update({ prompt: cleanPrompt }).eq('id', question.id);
      if (error) throw error;
      setQuestions((prev) => prev.map((q) => (q.id === question.id ? { ...q, prompt: cleanPrompt } : q)));
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível atualizar a pergunta.');
    }
  }

  async function removeQuestion(question: Question) {
    try {
      const { error } = await supabase.from('mission_questions').delete().eq('id', question.id);
      if (error) throw error;
      setQuestions((prev) => prev.filter((q) => q.id !== question.id));
      setOptionsByQuestion((prev) => {
        const copy = { ...prev };
        delete copy[question.id];
        return copy;
      });
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível remover a pergunta.');
    }
  }

  async function addOption(question: Question) {
    try {
      const { data, error } = await supabase
        .from('mission_options')
        .insert({ question_id: question.id, text: 'Nova opção', is_correct: false })
        .select('id,question_id,text,is_correct')
        .single();
      if (error) throw error;
      setOptionsByQuestion((prev) => ({ ...prev, [question.id]: [...(prev[question.id] ?? []), data as Option] }));
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível criar a opção.');
    }
  }

  async function updateOption(option: Option, fields: Partial<Option>) {
    try {
      if (fields.is_correct) {
        await supabase.from('mission_options').update({ is_correct: false }).eq('question_id', option.question_id);
      }
      const { error } = await supabase.from('mission_options').update(fields).eq('id', option.id);
      if (error) throw error;
      setOptionsByQuestion((prev) => ({
        ...prev,
        [option.question_id]: (prev[option.question_id] ?? []).map((opt) =>
          opt.id === option.id ? { ...opt, ...fields } : fields.is_correct ? { ...opt, is_correct: false } : opt,
        ),
      }));
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível atualizar a opção.');
    }
  }

  async function removeOption(option: Option) {
    try {
      const { error } = await supabase.from('mission_options').delete().eq('id', option.id);
      if (error) throw error;
      setOptionsByQuestion((prev) => ({
        ...prev,
        [option.question_id]: (prev[option.question_id] ?? []).filter((opt) => opt.id !== option.id),
      }));
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível remover a opção.');
    }
  }

  if (!mission) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bgLight, alignItems: 'center', justifyContent: 'center' }}>
        {loading ? <ActivityIndicator color={colors.brandCyan} /> : <Text style={{ color: colors.navy800 }}>Carregando missão...</Text>}
      </View>
    );
  }

  return (
    <>
      <ScrollView style={{ flex: 1, backgroundColor: colors.bgLight }} contentContainerStyle={{ padding: spacing.lg }}>
      <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 20, color: colors.navy900 }}>Detalhes da missão</Text>
        <TextInput
          placeholder="Título da missão"
          value={titleDraft}
          onChangeText={setTitleDraft}
          style={{ borderWidth: 1, borderColor: colors.navy800, borderRadius: radii.md, padding: spacing.md, backgroundColor: colors.white }}
        />
        <TextInput
          placeholder="Descrição (opcional)"
          value={descriptionDraft}
          onChangeText={setDescriptionDraft}
          multiline
          style={{ borderWidth: 1, borderColor: colors.navy800, borderRadius: radii.md, padding: spacing.md, minHeight: 90, backgroundColor: colors.white }}
        />
        <TouchableOpacity
          onPress={saveMissionDetails}
          disabled={savingDetails}
          style={{ backgroundColor: colors.brandCyan, padding: spacing.md, borderRadius: radii.md, alignItems: 'center' }}
        >
          <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>
            {savingDetails ? 'Salvando...' : 'Salvar alterações'}
          </Text>
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, padding: spacing.md, borderRadius: radii.md, ...shadows.soft }}>
          <View>
            <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900 }}>Status atual</Text>
            <Text style={{ color: colors.navy800 }}>{mission.status === 'published' ? 'Publicada' : 'Rascunho'}</Text>
          </View>
          <TouchableOpacity onPress={togglePublish} style={{ paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: mission.status === 'published' ? colors.brandPink : colors.brandCyan, borderRadius: radii.md }}>
            <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>
              {mission.status === 'published' ? 'Mover para rascunho' : 'Publicar missão'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900 }}>Perguntas</Text>
        {questions.map((question, idx) => (
          <Animated.View
            key={question.id}
            entering={FadeInUp.duration(350).delay(idx * 60)}
            style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, ...shadows.soft }}
          >
            <Text style={{ color: colors.navy800, marginBottom: spacing.xs }}>Ordem: {question.order_index + 1}</Text>
            <TextInput
              value={question.prompt}
              onChangeText={(text) =>
                setQuestions((prev) => prev.map((q) => (q.id === question.id ? { ...q, prompt: text } : q)))
              }
              onEndEditing={() => updateQuestion(question, question.prompt)}
              style={{ borderWidth: 1, borderColor: colors.navy800, borderRadius: radii.md, padding: spacing.md, backgroundColor: colors.white }}
            />

            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900 }}>Opções</Text>
              {(optionsByQuestion[question.id] ?? []).map((option) => (
                <View key={option.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Switch value={option.is_correct} onValueChange={(value) => updateOption(option, { is_correct: value })} />
                  <TextInput
                    value={option.text}
                    onChangeText={(text) =>
                      setOptionsByQuestion((prev) => ({
                        ...prev,
                        [question.id]: (prev[question.id] ?? []).map((opt) =>
                          opt.id === option.id ? { ...opt, text } : opt,
                        ),
                      }))
                    }
                    onEndEditing={() => updateOption(option, { text: option.text })}
                    style={{ flex: 1, borderWidth: 1, borderColor: colors.navy800, borderRadius: radii.md, padding: spacing.md }}
                  />
                  <TouchableOpacity onPress={() => removeOption(option)}>
                    <Text style={{ color: colors.brandPink, fontFamily: 'Inter-Bold' }}>Remover</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={() => addOption(question)}>
                <Text style={{ color: colors.brandCyan, fontFamily: 'Inter-Bold' }}>+ Adicionar opção</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => removeQuestion(question)} style={{ marginTop: spacing.md }}>
              <Text style={{ color: colors.brandPink, fontFamily: 'Inter-Bold' }}>Remover pergunta</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}

        <TouchableOpacity
          onPress={openQuestionModal}
          style={{ backgroundColor: colors.brandCyan, padding: spacing.lg, borderRadius: radii.lg, alignItems: 'center' }}
        >
          <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Nova pergunta</Text>
        </TouchableOpacity>
      </View>
      </ScrollView>

    <Modal
      visible={questionModalVisible}
      animationType="slide"
      transparent
      onRequestClose={() => setQuestionModalVisible(false)}
    >
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} onPress={() => setQuestionModalVisible(false)}>
        <View />
      </Pressable>
      <View style={{ backgroundColor: colors.white, padding: spacing.lg, gap: spacing.md }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900 }}>Nova pergunta</Text>
        <TextInput
          placeholder="Enunciado"
          value={questionDraft}
          onChangeText={setQuestionDraft}
          style={{ borderWidth: 1, borderColor: colors.navy800, borderRadius: radii.md, padding: spacing.md, backgroundColor: colors.white }}
        />

        <View style={{ gap: spacing.sm }}>
          {optionDrafts.map((option, index) => (
            <View key={option.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
              <Switch value={option.is_correct} onValueChange={() => markOptionCorrect(option.id)} />
              <TextInput
                placeholder={`Opção ${index + 1}`}
                value={option.text}
                onChangeText={(text) => updateOptionText(option.id, text)}
                style={{ flex: 1, borderWidth: 1, borderColor: colors.navy800, borderRadius: radii.md, padding: spacing.md }}
              />
              {optionDrafts.length > 2 && (
                <TouchableOpacity onPress={() => removeDraftOption(option.id)}>
                  <Text style={{ color: colors.brandPink, fontFamily: 'Inter-Bold' }}>Remover</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity onPress={addOptionField}>
            <Text style={{ color: colors.brandCyan, fontFamily: 'Inter-Bold' }}>+ Adicionar alternativa</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={submitNewQuestion}
          disabled={savingQuestion}
          style={{ backgroundColor: colors.brandCyan, padding: spacing.md, borderRadius: radii.md, alignItems: 'center' }}
        >
          <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>
            {savingQuestion ? 'Salvando...' : 'Salvar pergunta'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setQuestionModalVisible(false)} style={{ alignSelf: 'center' }}>
          <Text style={{ color: colors.navy800, fontFamily: 'Inter-Bold' }}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
    </>
  );
}
