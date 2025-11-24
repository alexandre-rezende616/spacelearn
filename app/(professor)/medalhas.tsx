import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";
import { colors, radii, shadows, spacing } from "../../src/theme/tokens";
import { supabase } from "../../src/lib/supabaseClient";
import { useAuth } from "../../src/store/useAuth";
import { Ionicons } from "@expo/vector-icons";

type Medal = {
  id: string;
  title: string;
  description: string | null;
  required_correct: number;
  created_at: string;
};

type MedalFormState = {
  title: string;
  description: string;
  requiredCorrect: string;
};

const initialForm: MedalFormState = {
  title: "",
  description: "",
  requiredCorrect: "5",
};

export default function MedalhasProfessor() {
  const user = useAuth((s) => s.user);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [medals, setMedals] = useState<Medal[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<MedalFormState>(initialForm);
  const [editingMedal, setEditingMedal] = useState<Medal | null>(null);

  const teacherId = user?.id ?? null;

  const sortedMedals = useMemo(
    () =>
      medals
        .slice()
        .sort((a, b) =>
          a.required_correct === b.required_correct
            ? a.created_at.localeCompare(b.created_at)
            : a.required_correct - b.required_correct
        ),
    [medals]
  );

  useEffect(() => {
    if (!teacherId) return;

    let mounted = true;
    async function loadMedals() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from("medals")
          .select("id,title,description,required_correct,created_at")
          .eq("teacher_id", teacherId);
        if (!mounted) return;
        if (error) throw error;
        setMedals((data as Medal[]) ?? []);
      } catch (e: any) {
        Alert.alert("Erro", e?.message ?? "Não foi possível carregar medalhas");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadMedals();

    const channel = supabase
      .channel(`prof-medals-${teacherId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "medals", filter: `teacher_id=eq.${teacherId}` },
        loadMedals
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [teacherId]);

  function openCreateModal() {
    setEditingMedal(null);
    setForm(initialForm);
    setModalVisible(true);
  }

  function openEditModal(medal: Medal) {
    setEditingMedal(medal);
    setForm({
      title: medal.title,
      description: medal.description ?? "",
      requiredCorrect: String(medal.required_correct),
    });
    setModalVisible(true);
  }

  async function saveMedal() {
    if (!teacherId) return;
    const title = form.title.trim();
    const description = form.description.trim();
    const required = Number.parseInt(form.requiredCorrect, 10);
    if (!title) {
      Alert.alert("Título obrigatório", "Informe um nome para a medalha.");
      return;
    }
    if (!Number.isFinite(required) || required <= 0) {
      Alert.alert("Número inválido", "Defina um número de acertos maior que zero.");
      return;
    }

    try {
      setSaving(true);
      if (editingMedal) {
        const { error } = await supabase
          .from("medals")
          .update({
            title,
            description: description || null,
            required_correct: required,
          })
          .eq("id", editingMedal.id)
          .eq("teacher_id", teacherId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("medals").insert({
          teacher_id: teacherId,
          title,
          description: description || null,
          required_correct: required,
        });
        if (error) throw error;
      }
      setModalVisible(false);
      setForm(initialForm);
      setEditingMedal(null);
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível salvar a medalha.");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(medal: Medal) {
    Alert.alert(
      "Remover medalha",
      `Tem certeza que quer remover "${medal.title}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => deleteMedal(medal),
        },
      ]
    );
  }

  async function deleteMedal(medal: Medal) {
    if (!teacherId) return;
    try {
      const { error } = await supabase
        .from("medals")
        .delete()
        .eq("id", medal.id)
        .eq("teacher_id", teacherId);
      if (error) throw error;
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Não foi possível remover a medalha.");
    }
  }

  if (!teacherId) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.bgLight,
        }}
      >
        <Text style={{ color: colors.navy800 }}>Você precisa estar autenticado.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight }}>
      <View style={{ padding: spacing.lg, paddingBottom: spacing.md }}>
        <Text style={{ fontFamily: "Inter-Bold", fontSize: 22, color: colors.navy900 }}>
          Gerenciar Medalhas
        </Text>
        <Text style={{ color: colors.navy800, marginTop: spacing.xs }}>
          Crie recompensas para motivar seus alunos a acertarem mais questões.
        </Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.brandCyan} size="large" />
        </View>
      ) : (
        <FlatList
          data={sortedMedals}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            padding: spacing.lg,
            gap: spacing.md,
            paddingBottom: spacing.xl * 2,
          }}
          ListEmptyComponent={
            <View
              style={{
                backgroundColor: colors.white,
                borderRadius: radii.lg,
                padding: spacing.lg,
                alignItems: "center",
                ...shadows.soft,
              }}
            >
              <Text style={{ color: colors.navy900, fontFamily: "Inter-Bold", fontSize: 16 }}>
                Nenhuma medalha criada
              </Text>
              <Text style={{ color: colors.navy800, marginTop: spacing.xs, textAlign: "center" }}>
                Clique no botão abaixo para criar sua primeira medalha.
              </Text>
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInUp.duration(350).delay(index * 80)}
              style={{
                backgroundColor: colors.white,
                borderRadius: radii.lg,
                padding: spacing.lg,
                gap: spacing.sm,
                ...shadows.soft,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                    <Ionicons name="trophy" size={20} color={colors.brandCyan} />
                    <Text style={{ color: colors.navy900, fontFamily: "Inter-Bold", fontSize: 18 }}>
                    {item.title}
                    </Text>
                </View>
                <View style={{ backgroundColor: colors.bgLight, borderRadius: radii.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 }}>
                  <Text style={{ color: colors.navy800, fontFamily: "Inter-Bold" }}>
                    {item.required_correct} acertos
                  </Text>
                </View>
              </View>
              {!!item.description && (
                <Text style={{ color: colors.navy800 }}>{item.description}</Text>
              )}
              <View style={{ flexDirection: "row", gap: spacing.md, marginTop: spacing.sm }}>
                <TouchableOpacity
                  onPress={() => openEditModal(item)}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.md,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    borderColor: colors.brandCyan,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: colors.brandCyan, fontFamily: "Inter-Bold" }}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => confirmDelete(item)}
                  style={{
                    flex: 1,
                    paddingVertical: spacing.md,
                    borderRadius: radii.md,
                    backgroundColor: colors.brandPink,
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: colors.white, fontFamily: "Inter-Bold" }}>Remover</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        />
      )}

      {/* FAB Button */}
      <TouchableOpacity
        onPress={openCreateModal}
        style={{
          position: "absolute",
          right: spacing.lg,
          bottom: spacing.lg,
          backgroundColor: colors.brandCyan,
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.md,
          borderRadius: radii.pill,
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.sm,
          ...shadows.soft,
        }}
      >
        <Ionicons name="add" size={24} color={colors.white} />
        <Text style={{ color: colors.white, fontFamily: "Inter-Bold", fontSize: 16 }}>Nova medalha</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "center",
            alignItems: "center",
            padding: spacing.lg,
          }}
        >
          <View
            style={{
              backgroundColor: colors.white,
              borderRadius: radii.lg,
              padding: spacing.lg,
              width: "100%",
              gap: spacing.md,
            }}
          >
            <Text style={{ fontFamily: "Inter-Bold", fontSize: 18, color: colors.navy900 }}>
              {editingMedal ? "Editar medalha" : "Nova medalha"}
            </Text>

            <View>
              <Text style={{ color: colors.navy800, marginBottom: spacing.xs }}>Título</Text>
              <TextInput
                value={form.title}
                onChangeText={(text) => setForm((prev) => ({ ...prev, title: text }))}
                placeholder="Ex: Mestre das órbitas"
                placeholderTextColor={colors.navy800}
                style={{
                  borderWidth: 1,
                  borderColor: colors.navy800,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  color: colors.navy900,
                  fontFamily: "Inter-Regular",
                }}
              />
            </View>

            <View>
              <Text style={{ color: colors.navy800, marginBottom: spacing.xs }}>Descrição (opcional)</Text>
              <TextInput
                value={form.description}
                onChangeText={(text) => setForm((prev) => ({ ...prev, description: text }))}
                placeholder="Mensagem para os alunos"
                placeholderTextColor={colors.navy800}
                style={{
                  borderWidth: 1,
                  borderColor: colors.navy800,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  color: colors.navy900,
                  fontFamily: "Inter-Regular",
                  minHeight: 80,
                  textAlignVertical: "top",
                }}
                multiline
              />
            </View>

            <View>
              <Text style={{ color: colors.navy800, marginBottom: spacing.xs }}>Acertos necessários</Text>
              <TextInput
                value={form.requiredCorrect}
                onChangeText={(text) =>
                  setForm((prev) => ({
                    ...prev,
                    requiredCorrect: text.replace(/[^0-9]/g, ""),
                  }))
                }
                placeholder="10"
                keyboardType="number-pad"
                placeholderTextColor={colors.navy800}
                style={{
                  borderWidth: 1,
                  borderColor: colors.navy800,
                  borderRadius: radii.md,
                  padding: spacing.md,
                  color: colors.navy900,
                  fontFamily: "Inter-Regular",
                }}
              />
            </View>

            <View style={{ flexDirection: "row", gap: spacing.md }}>
              <TouchableOpacity
                onPress={() => {
                  if (!saving) {
                    setModalVisible(false);
                    setEditingMedal(null);
                    setForm(initialForm);
                  }
                }}
                style={{
                  flex: 1,
                  paddingVertical: spacing.md,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  borderColor: colors.navy800,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.navy800, fontFamily: "Inter-Bold" }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={saveMedal}
                disabled={saving}
                style={{
                  flex: 1,
                  paddingVertical: spacing.md,
                  borderRadius: radii.md,
                  backgroundColor: colors.brandCyan,
                  alignItems: "center",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                <Text style={{ color: colors.white, fontFamily: "Inter-Bold" }}>
                  {saving ? "Salvando..." : editingMedal ? "Salvar" : "Criar"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}