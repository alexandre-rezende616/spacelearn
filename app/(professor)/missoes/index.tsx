import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { colors, radii, shadows, spacing } from '../../../src/theme/tokens';
import { supabase } from '../../../src/lib/supabaseClient';
import { useAuth } from '../../../src/store/useAuth';

type Mission = { id: string; title: string; description: string | null; status: 'draft'|'published'; created_at: string };

export default function MissoesProfessor() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [statusFilter, setStatusFilter] = useState<'all'|'draft'|'published'>('all');
  const [items, setItems] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  async function fetchMissions() {
    if (!user?.id) return;
    try {
      setLoading(true);
      let q = supabase
        .from('missions')
        .select('id,title,description,status,created_at')
        .eq('created_by', user.id)
        .order('created_at', { ascending: false });
      if (statusFilter !== 'all') q = q.eq('status', statusFilter);
      const { data, error } = await q;
      if (error) throw error;
      setItems((data as Mission[]) ?? []);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível carregar missões');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchMissions(); }, [user?.id, statusFilter]);

  // Realtime: atualiza lista quando missões do autor mudarem
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`prof-missions-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'missions', filter: `created_by=eq.${user.id}` },
        () => {
          fetchMissions();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleCreate() {
    if (!user?.id) return;
    if (!title.trim()) { Alert.alert('Título obrigatório', 'Informe o título da missão.'); return; }
    try {
      const { data, error } = await supabase
        .from('missions')
        .insert({ title: title.trim(), description: description.trim() || null, status: 'draft', created_by: user.id })
        .select('id,title,description,status,created_at')
        .single();
      if (error) throw error;
      setItems((prev) => [data as Mission, ...prev]);
      setTitle('');
      setDescription('');
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Erro', e?.message ?? 'Não foi possível criar a missão');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight }}>
      {/* Header */}
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 22, color: colors.navy900 }}>Minhas Missões</Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          {(['all','draft','published'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              onPress={() => setStatusFilter(s)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: spacing.md,
                backgroundColor: statusFilter === s ? colors.brandCyan : colors.white,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.navy800,
              }}
            >
              <Text style={{ color: statusFilter === s ? colors.white : colors.navy800, fontFamily: 'Inter-Bold' }}>
                {s === 'all' ? 'Todas' : s === 'draft' ? 'Rascunho' : 'Publicadas'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Ações */}
      <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
        <TouchableOpacity onPress={() => setModalVisible(true)} style={{ backgroundColor: colors.brandCyan, padding: spacing.lg, borderRadius: radii.lg, alignItems: 'center' }}>
          <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Nova missão</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <FlatList
        data={items}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.md }}
        refreshing={refreshing}
        onRefresh={async () => { setRefreshing(true); await fetchMissions(); setRefreshing(false); }}
        ListEmptyComponent={!loading ? (
          <Text style={{ textAlign: 'center', color: colors.navy800, marginTop: spacing.xl }}>Nenhuma missão.</Text>
        ) : null}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInUp.duration(450).delay(index * 80)} style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.soft }}>
            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: colors.navy900 }}>{item.title}</Text>
            {!!item.description && (
              <Text style={{ color: colors.navy800, marginTop: spacing.xs }}>{item.description}</Text>
            )}
            <Text style={{ marginTop: spacing.xs, color: item.status === 'published' ? colors.brandCyan : colors.navy800 }}>
              Status: {item.status === 'published' ? 'Publicada' : 'Rascunho'}
            </Text>
            <TouchableOpacity onPress={() => router.push(`/(professor)/missoes/${item.id}`)} style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}>
              <Text style={{ color: colors.brandCyan, fontFamily: 'Inter-Bold' }}>Editar missão</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      />

      {/* Modal Nova Missão */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }} onPress={() => setModalVisible(false)}>
          <View />
        </Pressable>
        <View style={{ backgroundColor: colors.white, padding: spacing.lg }}>
          <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900, marginBottom: spacing.md }}>Nova missão</Text>
          <TextInput
            placeholder="Título"
            value={title}
            onChangeText={setTitle}
            style={{ borderWidth: 1, borderColor: colors.navy800, borderRadius: radii.md, backgroundColor: colors.white, padding: spacing.md, marginBottom: spacing.md }}
          />
          <TextInput
            placeholder="Descrição (opcional)"
            value={description}
            onChangeText={setDescription}
            multiline
            style={{ borderWidth: 1, borderColor: colors.navy800, borderRadius: radii.md, backgroundColor: colors.white, padding: spacing.md, minHeight: 80 }}
          />
          <TouchableOpacity onPress={handleCreate} style={{ marginTop: spacing.md, backgroundColor: colors.brandCyan, padding: spacing.lg, borderRadius: radii.lg, alignItems: 'center' }}>
            <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Criar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

