import { useEffect, useState } from 'react';
import { Alert, FlatList, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { colors, radii, shadows, spacing } from '../../../../src/theme/tokens';
import { useAuth } from '../../../../src/store/useAuth';
import { supabase } from '../../../../src/lib/supabaseClient';
import { SpaceBackground } from '../../../../src/components/SpaceBackground';
import { SpaceButton } from '../../../../src/components/SpaceButton';
import { SpaceHUD } from '../../../../src/components/SpaceHUD';

type ClassInfo = { id: string; name: string; code: string; created_at: string };
type MessagePreview = { classId: string; content: string; created_at: string };

export default function TurmasAlunoIndex() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [classes, setClasses] = useState<ClassInfo[]>([]);
  const [messages, setMessages] = useState<Record<string, MessagePreview>>({});
  const [leavingClassId, setLeavingClassId] = useState<string | null>(null);

  async function loadMyClasses() {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('enrollments')
        .select('class_id, classes(id,name,code,created_at)')
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (data ?? [])
        .map((row: any) => row.classes)
        .filter(Boolean) as ClassInfo[];
      setClasses(list);

      const classIds = list.map((cls) => cls.id);
      if (classIds.length === 0) {
        setMessages({});
        return;
      }
      const { data: msgs } = await supabase
        .from('class_messages')
        .select('id,class_id,content,created_at')
        .in('class_id', classIds)
        .order('created_at', { ascending: false });
      const map: Record<string, MessagePreview> = {};
      (msgs ?? []).forEach((row: any) => {
        if (!map[row.class_id]) {
          map[row.class_id] = { classId: row.class_id, content: row.content ?? '', created_at: row.created_at };
        }
      });
      setMessages(map);
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível carregar suas turmas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMyClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`student-classes-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'enrollments', filter: `student_id=eq.${user.id}` },
        () => loadMyClasses(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_messages' },
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
      const { data, error: joinErr } = await supabase.rpc('student_join_class_by_code', { p_code: trimmed });
      if (joinErr) throw joinErr;
      const cls = (data && data[0]) as ClassInfo | undefined;
      if (!cls) {
        Alert.alert('Código inválido', 'Turma não encontrada para este código.');
        return;
      }
      setCode('');
      await loadMyClasses();
      Alert.alert('Sucesso', `Você entrou na turma ${cls.name}.`);
    } catch (err: any) {
      Alert.alert('Erro ao entrar', err?.message ?? 'Não foi possível entrar na turma.');
    } finally {
      setLoading(false);
    }
  }

  function confirmLeave(classInfo: ClassInfo) {
    Alert.alert(
      'Sair da turma',
      `Deseja sair da turma ${classInfo.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: () => leaveClass(classInfo),
        },
      ],
    );
  }

  async function leaveClass(classInfo: ClassInfo) {
    if (!user?.id) return;
    try {
      setLeavingClassId(classInfo.id);
      const { error } = await supabase
        .from('enrollments')
        .delete()
        .eq('class_id', classInfo.id)
        .eq('student_id', user.id);
      if (error) throw error;
      await loadMyClasses();
      Alert.alert('Tudo certo', `Você saiu da turma ${classInfo.name}.`);
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível sair da turma.');
    } finally {
      setLeavingClassId(null);
    }
  }

  return (
    <SpaceBackground>
      <FlatList
        data={classes}
        keyExtractor={(cls) => cls.id}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await loadMyClasses();
          setRefreshing(false);
        }}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, gap: spacing.md, paddingBottom: spacing.lg }}
        ListHeaderComponent={
          <View style={{ gap: spacing.md, marginBottom: spacing.md }}>
            <SpaceHUD />
            <View style={{ gap: spacing.sm }}>
              <Text style={{ fontFamily: 'Inter-Bold', fontSize: 22, color: colors.white }}>Minhas Turmas</Text>
              <Text style={{ color: colors.white, opacity: 0.8 }}>
                Use o código compartilhado pelo professor para participar e acompanhar o caminho de missões.
              </Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <TextInput
                  placeholder="Código da turma"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  autoCapitalize="characters"
                  value={code}
                  onChangeText={(value) => setCode(value.toUpperCase())}
                  style={{
                    flex: 1,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.3)',
                    borderRadius: radii.md,
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    color: colors.white,
                    paddingHorizontal: spacing.md,
                    paddingVertical: 12,
                  }}
                />
                <SpaceButton label="Entrar" onPress={handleJoin} disabled={loading} />
              </View>
            </View>
          </View>
        }
        ListEmptyComponent={
          !loading ? (
            <Text style={{ textAlign: 'center', color: colors.white, marginTop: spacing.xl }}>
              Você ainda não entrou em nenhuma turma.
            </Text>
          ) : null
        }
        renderItem={({ item, index }) => {
          const preview = messages[item.id];
          const leaving = leavingClassId === item.id;
          return (
            <Animated.View
              entering={FadeInUp.duration(450).delay(index * 70)}
              style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.md, ...shadows.soft }}
            >
              <TouchableOpacity onPress={() => router.push({ pathname: "/(aluno)/(tabs)/turmas/[id]", params: { id: item.id } } as any)} activeOpacity={0.8}>
                <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900 }}>{item.name}</Text>
              </TouchableOpacity>
              <Text style={{ color: colors.navy800 }}>Código: {item.code}</Text>
              {preview && (
                <View style={{ padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.bgLight }}>
                  <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900 }}>Último aviso</Text>
                  <Text style={{ color: colors.navy800 }} numberOfLines={2}>
                    {preview.content}
                  </Text>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <SpaceButton
                  label="Ver detalhes"
                  variant="secondary"
                  onPress={() => router.push({ pathname: "/(aluno)/(tabs)/turmas/[id]", params: { id: item.id } } as any)}
                />
                <SpaceButton
                  label={leaving ? 'Saindo...' : 'Sair'}
                  onPress={() => confirmLeave(item)}
                  disabled={leaving || loading}
                  icon={<Text style={{ color: colors.white }}>🚪</Text>}
                />
              </View>
            </Animated.View>
          );
        }}
      />
    </SpaceBackground>
  );
}
