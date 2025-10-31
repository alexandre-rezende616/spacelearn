import { useEffect, useState } from 'react';
import { Alert, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { colors, radii, shadows, spacing } from '../../src/theme/tokens';
import { useAuth } from '../../src/store/useAuth';
import { supabase } from '../../src/lib/supabaseClient';

type ClassRow = { id: string; name: string; code: string; created_at: string };

export default function TurmasAluno() {
  const user = useAuth((s) => s.user);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ClassRow[]>([]);

  async function loadMyClasses() {
    if (!user?.id) return;
    try {
      setLoading(true);
      // Busca as turmas onde o aluno está matriculado
      const { data, error } = await supabase
        .from('enrollments')
        .select('class_id, classes(id, name, code, created_at)')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (data ?? [])
        .map((r: any) => r.classes)
        .filter(Boolean) as ClassRow[];
      setItems(list);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível carregar suas turmas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMyClasses();
  }, [user?.id]);

  // Realtime: se turmas do professor receberem/alterarem publicações, aluno pode ver refletido na tela de missões.
  // Aqui, focamos em revalidar a lista de matrículas quando houver mudanças em enrollments do próprio aluno.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`student-enrollments-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'enrollments', filter: `student_id=eq.${user.id}` },
        () => loadMyClasses(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleJoin() {
    if (!user?.id) return;
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    try {
      setLoading(true);
      // Localiza turma pelo código
      const { data: cls, error: findErr } = await supabase
        .from('classes')
        .select('id, name, code, created_at')
        .eq('code', trimmed)
        .maybeSingle();
      if (findErr) throw findErr;
      if (!cls) {
        Alert.alert('Código inválido', 'Turma não encontrada para este código.');
        return;
      }
      // Matricula (ignora conflito de já matriculado)
      const { error: enrollErr } = await supabase
        .from('enrollments')
        .upsert({ class_id: cls.id, student_id: user.id }, { onConflict: 'class_id,student_id', ignoreDuplicates: true });
      if (enrollErr) throw enrollErr;
      setCode('');
      await loadMyClasses();
      Alert.alert('Sucesso', `Você entrou na turma ${cls.name}.`);
    } catch (e: any) {
      Alert.alert('Erro ao entrar', e?.message ?? 'Não foi possível entrar na turma');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight }}>
      {/* Header */}
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 22, color: colors.navy900 }}>Minhas Turmas</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <TextInput
            placeholder="Código da turma"
            autoCapitalize="characters"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.navy800,
              borderRadius: radii.md,
              backgroundColor: colors.white,
              paddingHorizontal: spacing.md,
              paddingVertical: 12,
            }}
          />
          <TouchableOpacity
            onPress={handleJoin}
            disabled={loading}
            style={{ backgroundColor: colors.brandCyan, paddingHorizontal: spacing.lg, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Entrar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm }}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await loadMyClasses();
          setRefreshing(false);
        }}
        ListEmptyComponent={!loading ? (
          <Text style={{ textAlign: 'center', color: colors.navy800, marginTop: spacing.xl }}>
            Você ainda não entrou em nenhuma turma.
          </Text>
        ) : null}
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInUp.duration(450).delay(index * 80)}
            style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.soft }}
          >
            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: colors.navy900 }}>{item.name}</Text>
            <Text style={{ color: colors.navy800, marginTop: spacing.xs }}>Código: {item.code}</Text>
          </Animated.View>
        )}
      />
    </View>
  );
}
