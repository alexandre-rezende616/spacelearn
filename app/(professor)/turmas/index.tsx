import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { colors, radii, shadows, spacing } from '../../../src/theme/tokens';
import { supabase } from '../../../src/lib/supabaseClient';
import { useAuth } from '../../../src/store/useAuth';

type ClassRow = { id: string; name: string; code: string; created_at: string };

type MessagePreview = { content: string; created_at: string };

async function copyToClipboard(text: string) {
  try {
    const Clipboard = await import('expo-clipboard');
    await Clipboard.setStringAsync(text);
  } catch {
    // noop
  }
}

function generateCode(length = 6) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return result;
}

export default function TurmasProfessor() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [studentCounts, setStudentCounts] = useState<Record<string, number>>({});
  const [missionCounts, setMissionCounts] = useState<Record<string, number>>({});
  const [messages, setMessages] = useState<Record<string, MessagePreview>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [search, setSearch] = useState('');

  const filteredClasses = useMemo(() => {
    if (!search.trim()) return classes;
    const term = search.trim().toLowerCase();
    return classes.filter((cls) => cls.name.toLowerCase().includes(term) || cls.code.toLowerCase().includes(term));
  }, [classes, search]);

  async function loadClasses() {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data: classRows, error } = await supabase
        .from('classes')
        .select('id,name,code,created_at')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      const list = (classRows as ClassRow[]) ?? [];
      setClasses(list);

      const classIds = list.map((cls) => cls.id);
      if (classIds.length === 0) {
        setStudentCounts({});
        setMissionCounts({});
        setMessages({});
        return;
      }

      const [enrollRes, missionRes, messageRes] = await Promise.all([
        supabase.from('enrollments').select('class_id,student_id').in('class_id', classIds),
        supabase.from('mission_classes').select('class_id,mission_id').in('class_id', classIds),
        supabase
          .from('class_messages')
          .select('id,class_id,content,created_at')
          .in('class_id', classIds)
          .order('created_at', { ascending: false }),
      ]);

      const studentsMap: Record<string, number> = {};
      (enrollRes.data ?? []).forEach((row: any) => {
        studentsMap[row.class_id] = (studentsMap[row.class_id] ?? 0) + 1;
      });
      setStudentCounts(studentsMap);

      const missionsMap: Record<string, number> = {};
      (missionRes.data ?? []).forEach((row: any) => {
        missionsMap[row.class_id] = (missionsMap[row.class_id] ?? 0) + 1;
      });
      setMissionCounts(missionsMap);

      const messageMap: Record<string, MessagePreview> = {};
      (messageRes.data ?? []).forEach((row: any) => {
        if (!messageMap[row.class_id]) {
          messageMap[row.class_id] = { content: row.content ?? '', created_at: row.created_at };
        }
      });
      setMessages(messageMap);
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível carregar suas turmas.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadClasses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`prof-classes-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'classes', filter: `teacher_id=eq.${user.id}` },
        () => loadClasses(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'enrollments' },
        () => loadClasses(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_classes' },
        () => loadClasses(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'class_messages' },
        () => loadClasses(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleCreateClass() {
    if (!user?.id) return;
    if (!newName.trim()) {
      Alert.alert('Nome obrigatório', 'Informe o nome da turma.');
      return;
    }
    const code = (customCode.trim().toUpperCase() || generateCode()).slice(0, 10);
    try {
      const { data, error } = await supabase
        .from('classes')
        .insert({ name: newName.trim(), code, teacher_id: user.id })
        .select('id,name,code,created_at')
        .single();
      if (error) throw error;
      setClasses((prev) => [data as ClassRow, ...prev]);
      setNewName('');
      setCustomCode('');
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível criar a turma.');
    }
  }

  function renderItem({ item, index }: { item: ClassRow; index: number }) {
    const students = studentCounts[item.id] ?? 0;
    const missions = missionCounts[item.id] ?? 0;
    const lastMessage = messages[item.id];
    return (
      <Animated.View
        entering={FadeInUp.duration(450).delay(index * 80)}
        style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, gap: spacing.md, ...shadows.soft }}
      >
        <TouchableOpacity onPress={() => router.push({ pathname: "/(professor)/turmas/[id]", params: { id: item.id } } as any)} activeOpacity={0.8}>
          <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900 }}>{item.name}</Text>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <Text style={{ color: colors.navy800 }}>Código:</Text>
            <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900, letterSpacing: 1 }}>{item.code}</Text>
          </View>
          <TouchableOpacity
            onPress={async () => {
              await copyToClipboard(item.code);
              Alert.alert('Código copiado', item.code);
            }}
          >
            <Ionicons name="copy" size={18} color={colors.navy800} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ color: colors.navy800 }}>Alunos: {students}</Text>
          <Text style={{ color: colors.navy800 }}>Missões: {missions}</Text>
        </View>

        {lastMessage && (
          <View style={{ padding: spacing.sm, borderRadius: radii.md, backgroundColor: colors.bgLight }}>
            <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900 }}>Último aviso</Text>
            <Text style={{ color: colors.navy800 }} numberOfLines={2}>
              {lastMessage.content}
            </Text>
          </View>
        )}

        <TouchableOpacity
          onPress={() => router.push({ pathname: "/(professor)/turmas/[id]", params: { id: item.id } } as any)}
          style={{ alignSelf: 'flex-start', paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.brandCyan }}
        >
          <Text style={{ color: colors.brandCyan, fontFamily: 'Inter-Bold' }}>Abrir turma</Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight }}>
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 22, color: colors.navy900 }}>Minhas Turmas</Text>
        <Text style={{ color: colors.navy800 }}>
          Crie códigos únicos, acompanhe alunos e mantenha a comunicação centralizada.
        </Text>
        <TextInput
          placeholder="Buscar por nome ou código"
          value={search}
          onChangeText={setSearch}
          style={{
            borderWidth: 1,
            borderColor: colors.navy800,
            borderRadius: radii.md,
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
            backgroundColor: colors.white,
          }}
        />
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={{ backgroundColor: colors.brandCyan, padding: spacing.lg, borderRadius: radii.lg, alignItems: 'center' }}
        >
          <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Nova turma</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredClasses}
        keyExtractor={(cls) => cls.id}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await loadClasses();
          setRefreshing(false);
        }}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xl }}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ textAlign: 'center', color: colors.navy800, marginTop: spacing.xl }}>
              Nenhuma turma cadastrada. Crie a primeira para começar.
            </Text>
          ) : null
        }
        renderItem={renderItem}
      />

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setModalVisible(false)}>
          <View />
        </Pressable>
        <View style={{ backgroundColor: colors.white, padding: spacing.lg, gap: spacing.md }}>
          <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900 }}>Nova turma</Text>
          <TextInput
            placeholder="Nome da turma"
            value={newName}
            onChangeText={setNewName}
            style={{ borderWidth: 1, borderColor: colors.navy800, borderRadius: radii.md, padding: spacing.md, backgroundColor: colors.white }}
          />
          <TextInput
            placeholder="Código personalizado (opcional)"
            autoCapitalize="characters"
            value={customCode}
            onChangeText={(value) => setCustomCode(value.toUpperCase())}
            style={{ borderWidth: 1, borderColor: colors.navy800, borderRadius: radii.md, padding: spacing.md, backgroundColor: colors.white }}
          />
          <Text style={{ color: colors.navy800 }}>
            Deixe em branco para gerar um código automaticamente.
          </Text>
          <TouchableOpacity
            onPress={handleCreateClass}
            style={{ backgroundColor: colors.brandCyan, padding: spacing.lg, borderRadius: radii.lg, alignItems: 'center' }}
          >
            <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Criar turma</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
