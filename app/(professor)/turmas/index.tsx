import { useEffect, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing } from "../../../src/theme/tokens";
import { supabase } from "../../../src/lib/supabaseClient";
import { useAuth } from "../../../src/store/useAuth";

type ClassRow = {
  id: string;
  name: string;
  code: string;
  created_at: string;
};

async function copyToClipboard(text: string) {
  try {
    const Clipboard = await import('expo-clipboard');
    await Clipboard.setStringAsync(text);
  } catch {
    // noop
  }
}

function generateCode(length = 7) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export default function TurmasScreen() {
  const router = useRouter();
  const user = useAuth((s) => s.user);
  const [items, setItems] = useState<ClassRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');

  async function fetchClasses() {
    try {
      if (!user?.id) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('classes')
        .select('id,name,code,created_at')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setItems((data as ClassRow[]) ?? []);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível carregar turmas');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchClasses();
  }, [user?.id]);

  async function handleCreate() {
    try {
      if (!user?.id) return;
      if (!newName.trim()) {
        Alert.alert('Nome obrigatório', 'Informe o nome da turma.');
        return;
      }
      const code = generateCode(7);
      const { data, error } = await supabase
        .from('classes')
        .insert({ name: newName.trim(), code, teacher_id: user.id })
        .select('id,name,code,created_at')
        .single();
      if (error) throw error;
      setItems((prev) => [data as ClassRow, ...prev]);
      setNewName('');
      setModalVisible(false);
    } catch (e: any) {
      Alert.alert('Erro', e.message ?? 'Não foi possível criar a turma');
    }
  }

  function renderItem({ item, index }: { item: ClassRow; index: number }) {
    return (
      <Animated.View
        entering={FadeInUp.duration(450).delay(index * 80)}
        style={{
          backgroundColor: colors.white,
          borderRadius: radii.lg,
          padding: spacing.lg,
          marginBottom: spacing.md,
          ...shadows.soft,
        }}
      >
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: colors.navy900, marginBottom: spacing.xs, flexWrap: 'wrap' }}>
          {item.name}
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: spacing.sm }}>
            <Text style={{ fontFamily: 'Inter-Regular', color: colors.navy800 }}>Código:</Text>
            <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900, letterSpacing: 1 }}>
              {item.code}
            </Text>
          </View>
          <TouchableOpacity
            onPress={async () => {
              await copyToClipboard(item.code);
              Alert.alert('Código copiado', item.code);
            }}
            style={{ paddingHorizontal: spacing.sm, paddingVertical: spacing.xs }}
          >
            <Ionicons name="copy" size={18} color={colors.navy800} />
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md }}>
          <Text style={{ color: colors.navy800 }}>Alunos: —</Text>
          <TouchableOpacity onPress={() => router.push(`/(professor)/turmas/${item.id}`)}>
            <Text style={{ color: colors.brandCyan, fontFamily: 'Inter-Bold' }}>Ver alunos</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight }}>
      {/* Header */}
      <View style={{ padding: spacing.lg, paddingBottom: spacing.md }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 22, color: colors.navy900 }}>Minhas Turmas</Text>
      </View>

      {/* Actions */}
      <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={{ backgroundColor: colors.brandCyan, padding: spacing.lg, borderRadius: radii.lg, alignItems: 'center' }}
        >
          <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Nova turma</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.md }}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await fetchClasses();
          setRefreshing(false);
        }}
        ListEmptyComponent={!loading ? (
          <Text style={{ textAlign: 'center', color: colors.navy800, marginTop: spacing.xl }}>
            Nenhuma turma ainda. Crie a primeira!
          </Text>
        ) : null}
        renderItem={renderItem}
      />

      {/* Modal de criação */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.25)' }} onPress={() => setModalVisible(false)}>
          <View />
        </Pressable>
        <View style={{ backgroundColor: colors.white, padding: spacing.lg }}>
          <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900, marginBottom: spacing.md }}>
            Nova turma
          </Text>
          <TextInput
            placeholder="Nome da turma"
            value={newName}
            onChangeText={setNewName}
            style={{
              borderWidth: 1,
              borderColor: colors.navy800,
              borderRadius: radii.md,
              padding: spacing.md,
              marginBottom: spacing.md,
              backgroundColor: colors.white,
            }}
          />
          <TouchableOpacity
            onPress={handleCreate}
            style={{ backgroundColor: colors.brandCyan, padding: spacing.lg, borderRadius: radii.lg, alignItems: 'center' }}
          >
            <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Criar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}



