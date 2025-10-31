import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, ScrollView, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useLocalSearchParams } from 'expo-router';
import { colors, radii, shadows, spacing } from '../../../src/theme/tokens';
import { supabase } from '../../../src/lib/supabaseClient';
import { useAuth } from '../../../src/store/useAuth';

type Mission = { id: string; title: string; description: string | null; status: 'draft'|'published' };
type Question = { id: string; prompt: string; order_index: number };
type Option = { id: string; question_id: string; text: string; is_correct: boolean };
type ClassRow = { id: string; name: string; code: string };

export default function EditMission() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useAuth((s) => s.user);
  const [mission, setMission] = useState<Mission | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [optionsByQ, setOptionsByQ] = useState<Record<string, Option[]>>({});
  const [allClasses, setAllClasses] = useState<ClassRow[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [newPrompt, setNewPrompt] = useState('');

  async function loadAll() {
    if (!id || !user?.id) return;
    try {
      setLoading(true);
      // missão
      const { data: m, error: mErr } = await supabase
        .from('missions')
        .select('id,title,description,status')
        .eq('id', id)
        .maybeSingle();
      if (mErr) throw mErr;
      setMission(m as Mission);

      // perguntas
      const { data: qs, error: qErr } = await supabase
        .from('mission_questions')
        .select('id,prompt,order_index')
        .eq('mission_id', id)
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
      } else {
        setOptionsByQ({});
      }

      // turmas do professor
      const { data: cls, error: cErr } = await supabase
        .from('classes')
        .select('id,name,code')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      if (cErr) throw cErr;
      setAllClasses((cls as ClassRow[]) ?? []);

      // turmas já vinculadas à missão
      const { data: linked, error: lErr } = await supabase
        .from('mission_classes')
        .select('class_id')
        .eq('mission_id', id);
      if (lErr) throw lErr;
      setSelectedClassIds(new Set((linked ?? []).map((r: any) => r.class_id)));
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível carregar a missão');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, [id, user?.id]);

  // Realtime: escuta alterações desta missão (própria do professor)
  useEffect(() => {
    if (!id || !user?.id) return;
    const channel = supabase
      .channel(`prof-edit-mission-${id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'missions', filter: `id=eq.${id}` },
        () => loadAll(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_questions', filter: `mission_id=eq.${id}` },
        () => loadAll(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_classes', filter: `mission_id=eq.${id}` },
        () => loadAll(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user?.id]);

  // Realtime: opções por pergunta (recria quando a lista de perguntas muda)
  useEffect(() => {
    if (!questions.length) return;
    const channel = supabase.channel(`prof-edit-mission-options-${id}`);
    questions.forEach((q) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_options', filter: `question_id=eq.${q.id}` },
        () => loadAll(),
      );
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.map((q) => q.id).join(',')]);

  async function addQuestion() {
    if (!id || !newPrompt.trim()) return;
    try {
      const nextIndex = (questions[questions.length - 1]?.order_index ?? -1) + 1;
      const { data, error } = await supabase
        .from('mission_questions')
        .insert({ mission_id: id, prompt: newPrompt.trim(), order_index: nextIndex })
        .select('id,prompt,order_index')
        .single();
      if (error) throw error;
      setQuestions((prev) => [...prev, data as Question]);
      setNewPrompt('');
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível adicionar a pergunta');
    }
  }

  async function updateQuestion(q: Question, prompt: string) {
    try {
      const { error } = await supabase
        .from('mission_questions')
        .update({ prompt: prompt.trim() })
        .eq('id', q.id);
      if (error) throw error;
      setQuestions((prev) => prev.map((it) => (it.id === q.id ? { ...it, prompt: prompt.trim() } : it)));
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível atualizar');
    }
  }

  async function removeQuestion(q: Question) {
    try {
      const { error } = await supabase.from('mission_questions').delete().eq('id', q.id);
      if (error) throw error;
      setQuestions((prev) => prev.filter((it) => it.id !== q.id));
      const copy = { ...optionsByQ }; delete copy[q.id]; setOptionsByQ(copy);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível remover');
    }
  }

  async function addOption(q: Question, text: string, correct: boolean) {
    try {
      if (correct) {
        await supabase.from('mission_options').update({ is_correct: false }).eq('question_id', q.id);
      }
      const { data, error } = await supabase
        .from('mission_options')
        .insert({ question_id: q.id, text: text.trim(), is_correct: !!correct })
        .select('id,question_id,text,is_correct')
        .single();
      if (error) throw error;
      setOptionsByQ((prev) => ({ ...prev, [q.id]: [...(prev[q.id] ?? []), data as Option] }));
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível adicionar opção');
    }
  }

  async function updateOption(opt: Option, fields: Partial<Option>) {
    try {
      if (fields.is_correct) {
        await supabase.from('mission_options').update({ is_correct: false }).eq('question_id', opt.question_id);
      }
      const { error } = await supabase.from('mission_options').update(fields).eq('id', opt.id);
      if (error) throw error;
      setOptionsByQ((prev) => ({
        ...prev,
        [opt.question_id]: (prev[opt.question_id] ?? []).map((o) => (o.id === opt.id ? { ...o, ...fields } : (fields.is_correct ? { ...o, is_correct: false } : o))),
      }));
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível atualizar opção');
    }
  }

  async function removeOption(opt: Option) {
    try {
      const { error } = await supabase.from('mission_options').delete().eq('id', opt.id);
      if (error) throw error;
      setOptionsByQ((prev) => ({
        ...prev,
        [opt.question_id]: (prev[opt.question_id] ?? []).filter((o) => o.id !== opt.id),
      }));
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível remover opção');
    }
  }

  function toggleClass(id: string) {
    setSelectedClassIds((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id); else copy.add(id);
      return copy;
    });
  }

  async function linkClasses() {
    if (!mission) return;
    try {
      const rows = Array.from(selectedClassIds).map((cid) => ({ mission_id: mission.id, class_id: cid }));
      if (rows.length === 0) return;
      const { error } = await supabase.from('mission_classes').upsert(rows, { onConflict: 'mission_id,class_id', ignoreDuplicates: true });
      if (error) throw error;
      Alert.alert('Sucesso', 'Turmas vinculadas.');
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao vincular turmas');
    }
  }

  async function publishMission() {
    if (!mission) return;
    try {
      const { error } = await supabase.from('missions').update({ status: 'published' }).eq('id', mission.id);
      if (error) throw error;
      Alert.alert('Missão publicada', 'Agora os alunos das turmas vinculadas podem jogar.');
      await loadAll();
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Falha ao publicar');
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.bgLight }} contentContainerStyle={{ padding: spacing.lg }}>
      {mission && (
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontFamily: 'Inter-Bold', fontSize: 20, color: colors.navy900 }}>{mission.title}</Text>
          {!!mission.description && <Text style={{ color: colors.navy800, marginTop: spacing.xs }}>{mission.description}</Text>}
          <Text style={{ marginTop: spacing.xs, color: mission.status === 'published' ? colors.brandCyan : colors.navy800 }}>
            Status: {mission.status === 'published' ? 'Publicada' : 'Rascunho'}
          </Text>
        </View>
      )}

      {/* Perguntas */}
      <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900 }}>Perguntas</Text>
        {questions.map((q, idx) => (
          <Animated.View key={q.id} entering={FadeInUp.duration(350).delay(idx * 60)} style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, ...shadows.soft }}>
            <Text style={{ color: colors.navy800, marginBottom: spacing.xs }}>Ordem: {q.order_index}</Text>
            <TextInput
              value={q.prompt}
              onChangeText={(t) => setQuestions((prev) => prev.map((it) => (it.id === q.id ? { ...it, prompt: t } : it)))}
              onEndEditing={() => updateQuestion(q, q.prompt)}
              style={{ borderWidth: 1, borderColor: colors.navy800, borderRadius: radii.md, backgroundColor: colors.white, padding: spacing.md }}
            />

            <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
              <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900 }}>Opções</Text>
              {(optionsByQ[q.id] ?? []).map((o) => (
                <View key={o.id} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                  <Switch value={o.is_correct} onValueChange={(v) => updateOption(o, { is_correct: v })} />
                  <TextInput
                    value={o.text}
                    onChangeText={(t) => setOptionsByQ((prev) => ({ ...prev, [q.id]: (prev[q.id] ?? []).map((x) => (x.id === o.id ? { ...x, text: t } : x)) }))}
                    onEndEditing={() => updateOption(o, { text: o.text })}
                    style={{ flex: 1, borderWidth: 1, borderColor: colors.navy800, borderRadius: radii.md, padding: spacing.md }}
                  />
                  <TouchableOpacity onPress={() => removeOption(o)}>
                    <Text style={{ color: colors.brandPink, fontFamily: 'Inter-Bold' }}>Remover</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity onPress={() => addOption(q, 'Nova opção', false)}>
                <Text style={{ color: colors.brandCyan, fontFamily: 'Inter-Bold' }}>+ Adicionar opção</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={() => removeQuestion(q)} style={{ marginTop: spacing.md }}>
              <Text style={{ color: colors.brandPink, fontFamily: 'Inter-Bold' }}>Remover pergunta</Text>
            </TouchableOpacity>
          </Animated.View>
        ))}

        <View style={{ gap: spacing.sm }}>
          <TextInput
            placeholder="Nova pergunta"
            value={newPrompt}
            onChangeText={setNewPrompt}
            style={{ borderWidth: 1, borderColor: colors.navy800, borderRadius: radii.md, padding: spacing.md, backgroundColor: colors.white }}
          />
          <TouchableOpacity onPress={addQuestion} style={{ backgroundColor: colors.brandCyan, padding: spacing.lg, borderRadius: radii.lg, alignItems: 'center' }}>
            <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Adicionar pergunta</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Publicar para turmas */}
      <View style={{ gap: spacing.md, marginBottom: spacing.xl }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900 }}>Publicar para turmas</Text>
        {allClasses.map((c) => (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.md, ...shadows.soft }}>
            <View>
              <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900 }}>{c.name}</Text>
              <Text style={{ color: colors.navy800 }}>Código: {c.code}</Text>
            </View>
            <Switch value={selectedClassIds.has(c.id)} onValueChange={() => toggleClass(c.id)} />
          </View>
        ))}
        <TouchableOpacity onPress={linkClasses} style={{ backgroundColor: colors.brandCyan, padding: spacing.lg, borderRadius: radii.lg, alignItems: 'center' }}>
          <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Vincular turmas</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={publishMission} style={{ backgroundColor: colors.brandPink, padding: spacing.lg, borderRadius: radii.lg, alignItems: 'center' }}>
          <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Publicar missão</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
