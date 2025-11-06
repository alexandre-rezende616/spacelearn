import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { colors, radii, shadows, spacing } from '../../../src/theme/tokens';
import { supabase } from '../../../src/lib/supabaseClient';
import { useAuth } from '../../../src/store/useAuth';

type Mission = { id: string; title: string; description: string | null; status: 'draft' | 'published'; created_at: string };

export default function MissoesCoordenador() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [items, setItems] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  async function fetchMissions() {
    const userId = user?.id;
    if (!userId) return;
    try {
      setLoading(true);
      let query = supabase
        .from('missions')
        .select('id,title,description,status,created_at')
        .eq('created_by', userId)
        .order('created_at', { ascending: false });
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error } = await query;
      if (error) throw error;
      setItems((data as Mission[]) ?? []);
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível carregar missões.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMissions();
  }, [user?.id, statusFilter]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    const channel = supabase
      .channel(`coord-missions-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'missions', filter: `created_by=eq.${userId}` },
        () => fetchMissions(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function handleCreate() {
    const userId = user?.id;
    if (!userId) return;
    if (!title.trim()) {
      Alert.alert('Título obrigatório', 'Informe o título da missão.');
      return;
    }
    try {
      const payload = { title: title.trim(), description: description.trim() || null, status: 'draft', created_by: userId };
      const { data, error } = await supabase
        .from('missions')
        .insert(payload)
        .select('id,title,description,status,created_at')
        .single();
      if (error) throw error;
      setItems((prev) => [data as Mission, ...prev]);
      setTitle('');
      setDescription('');
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível criar a missão.');
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight }}>
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 22, color: colors.navy900 }}>Missões do Coordenador</Text>
        <Text style={{ color: colors.navy800 }}>
          Crie e mantenha a biblioteca de missões que será consumida pelos professores nas turmas.
        </Text>
        <View style={{ flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' }}>
          {(['all', 'draft', 'published'] as const).map((status) => (
            <TouchableOpacity
              key={status}
              onPress={() => setStatusFilter(status)}
              style={{
                paddingVertical: 8,
                paddingHorizontal: spacing.md,
                backgroundColor: statusFilter === status ? colors.brandCyan : colors.white,
                borderRadius: radii.md,
                borderWidth: 1,
                borderColor: colors.navy800,
                minWidth: 110,
                alignItems: 'center',
              }}
            >
              <Text style={{ color: statusFilter === status ? colors.white : colors.navy800, fontFamily: 'Inter-Bold' }}>
                {status === 'all' ? 'Todas' : status === 'draft' ? 'Rascunho' : 'Publicadas'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={{ backgroundColor: colors.brandCyan, padding: spacing.lg, borderRadius: radii.lg, alignItems: 'center' }}
        >
          <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Nova missão</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.md }}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await fetchMissions();
          setRefreshing(false);
        }}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ textAlign: 'center', color: colors.navy800, marginTop: spacing.xl }}>
              Nenhuma missão cadastrada ainda.
            </Text>
          ) : null
        }
        renderItem={({ item, index }) => (
          <Animated.View
            entering={FadeInUp.duration(450).delay(index * 80)}
            style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.soft }}
          >
            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: colors.navy900 }}>{item.title}</Text>
            {!!item.description && (
              <Text style={{ color: colors.navy800, marginTop: spacing.xs }}>{item.description}</Text>
            )}
            <Text style={{ marginTop: spacing.xs, color: item.status === 'published' ? colors.brandCyan : colors.navy800 }}>
              Status: {item.status === 'published' ? 'Publicada' : 'Rascunho'}
            </Text>
            <TouchableOpacity
              onPress={() => router.push({ pathname: "/(coordenador)/missoes/[id]", params: { id: item.id } } as any)}
              style={{ marginTop: spacing.md, alignSelf: 'flex-start' }}
            >
              <Text style={{ color: colors.brandCyan, fontFamily: 'Inter-Bold' }}>Editar missão</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      />

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
          <TouchableOpacity
            onPress={handleCreate}
            style={{ marginTop: spacing.md, backgroundColor: colors.brandCyan, padding: spacing.lg, borderRadius: radii.lg, alignItems: 'center' }}
          >
            <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Criar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}
