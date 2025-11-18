import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing } from '../../../src/theme/tokens';
import { useAuth } from '../../../src/store/useAuth';
import {
  assignMissionToClass,
  fetchProfessorLibrary,
  unassignMissionFromClass,
} from '../../../src/modules/missionFlow/api';
import type {
  ClassSummary,
  MissionAssignment,
  MissionSummary,
} from '../../../src/modules/missionFlow/types';
import { supabase } from '../../../src/lib/supabaseClient';

type MissionAssignmentMap = Record<string, MissionAssignment[]>;
type ClassAssignmentMap = Record<string, { missionId: string; orderIndex: number }[]>;

export default function BibliotecaMissoesProfessor() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [missions, setMissions] = useState<MissionSummary[]>([]);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [assignments, setAssignments] = useState<MissionAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modalMission, setModalMission] = useState<MissionSummary | null>(null);
  const [assigning, setAssigning] = useState(false);

  const filteredMissions = useMemo(() => {
    if (!search.trim()) return missions;
    const term = search.trim().toLowerCase();
    return missions.filter(
      (mission) =>
        mission.title.toLowerCase().includes(term) ||
        (mission.description ?? '').toLowerCase().includes(term) ||
        (mission.creatorName ?? '').toLowerCase().includes(term),
    );
  }, [missions, search]);

  const assignmentsByMission = useMemo<MissionAssignmentMap>(() => {
    const map: MissionAssignmentMap = {};
    assignments.forEach((assignment) => {
      if (!map[assignment.missionId]) map[assignment.missionId] = [];
      map[assignment.missionId].push(assignment);
    });
    Object.values(map).forEach((list) => list.sort((a, b) => a.orderIndex - b.orderIndex));
    return map;
  }, [assignments]);

  const assignmentsByClass = useMemo<ClassAssignmentMap>(() => {
    const map: ClassAssignmentMap = {};
    assignments.forEach((assignment) => {
      if (!map[assignment.classId]) map[assignment.classId] = [];
      map[assignment.classId].push({ missionId: assignment.missionId, orderIndex: assignment.orderIndex });
    });
    Object.values(map).forEach((list) => list.sort((a, b) => a.orderIndex - b.orderIndex));
    return map;
  }, [assignments]);

  async function loadData() {
    if (!user?.id) return;
    try {
      setLoading(true);
      const payload = await fetchProfessorLibrary(user.id);
      setMissions(payload.missions);
      setClasses(payload.classes);
      setAssignments(payload.assignments);
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível carregar a biblioteca de missões.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    const channel = supabase
      .channel(`prof-missions-library-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'missions', filter: 'status=eq.published' },
        () => loadData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'mission_classes' },
        () => loadData(),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'classes', filter: `teacher_id=eq.${userId}` },
        () => loadData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  function getAssignmentsForMission(missionId: string) {
    return assignmentsByMission[missionId] ?? [];
  }

  function isMissionAssignedToClass(missionId: string, classId: string) {
    return (assignmentsByClass[classId] ?? []).some((assignment) => assignment.missionId === missionId);
  }

  async function handleAssignMission(mission: MissionSummary, classRow: ClassSummary) {
    const userId = user?.id;
    if (!userId) return;
    try {
      setAssigning(true);
      const nextOrder = assignmentsByClass[classRow.id]?.length ?? 0;
      await assignMissionToClass({
        missionId: mission.id,
        classId: classRow.id,
        teacherId: userId,
        currentLength: nextOrder,
      });
      await loadData();
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível vincular a missão à turma.');
    } finally {
      setAssigning(false);
    }
  }

  async function handleUnassignMission(mission: MissionSummary, classRow: ClassSummary) {
    try {
      setAssigning(true);
      await unassignMissionFromClass(mission.id, classRow.id);
      await loadData();
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível remover a missão da turma.');
    } finally {
      setAssigning(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgLight }}>
      <View style={{ padding: spacing.lg, gap: spacing.sm }}>
        <Text style={{ fontFamily: 'Inter-Bold', fontSize: 22, color: colors.navy900 }}>Biblioteca de Missões</Text>
        <Text style={{ color: colors.navy800 }}>
          Missões publicadas pelos coordenadores. Adicione às suas turmas para criar jornadas personalizadas.
        </Text>
        <TextInput
          placeholder="Buscar por título, autor ou descrição"
          value={search}
          onChangeText={setSearch}
          style={{
            borderWidth: 1,
            borderColor: colors.navy800,
            borderRadius: radii.md,
            backgroundColor: colors.white,
            paddingHorizontal: spacing.md,
            paddingVertical: 12,
          }}
        />
      </View>

      <FlatList
        data={filteredMissions}
        keyExtractor={(mission) => mission.id}
        refreshing={refreshing}
        onRefresh={async () => {
          setRefreshing(true);
          await loadData();
          setRefreshing(false);
        }}
        contentContainerStyle={{ padding: spacing.lg, paddingTop: spacing.sm }}
        ListEmptyComponent={
          !loading ? (
            <Text style={{ textAlign: 'center', color: colors.navy800, marginTop: spacing.xl }}>
              Nenhuma missão disponível no momento.
            </Text>
          ) : null
        }
        renderItem={({ item, index }) => {
          const classesForMission = getAssignmentsForMission(item.id);
          return (
            <Animated.View
              entering={FadeInUp.duration(450).delay(index * 80)}
              style={{ backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg, marginBottom: spacing.md, ...shadows.soft }}
            >
              <Text style={{ fontFamily: 'Inter-Bold', fontSize: 16, color: colors.navy900 }}>{item.title}</Text>
              {!!item.description && (
                <Text style={{ color: colors.navy800, marginTop: spacing.xs }}>{item.description}</Text>
              )}
              <Text style={{ color: colors.navy800, marginTop: spacing.xs }}>
                Autor: {item.creatorName ?? 'Coordenador'}
              </Text>
              <Text style={{ color: colors.navy800, marginTop: spacing.xs }}>
                Turmas: {classesForMission.length > 0 ? classesForMission.map((cls) => cls.className).join(', ') : 'Nenhuma'}
              </Text>

              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md }}>
                <TouchableOpacity
                  onPress={() => router.push({ pathname: "/(professor)/missoes/[id]", params: { id: item.id } } as any)}
                  style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.brandCyan, alignItems: 'center' }}
                >
                  <Text style={{ color: colors.brandCyan, fontFamily: 'Inter-Bold' }}>Ver detalhes</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setModalMission(item)}
                  style={{ flex: 1, paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.brandCyan, alignItems: 'center' }}
                >
                  <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Gerenciar turmas</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          );
        }}
      />

      <Modal visible={!!modalMission} transparent animationType="slide" onRequestClose={() => setModalMission(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }} onPress={() => setModalMission(null)}>
          <View />
        </Pressable>
        {modalMission && (
          <View style={{ backgroundColor: colors.white, padding: spacing.lg, gap: spacing.md }}>
            <Text style={{ fontFamily: 'Inter-Bold', fontSize: 18, color: colors.navy900 }}>{modalMission.title}</Text>
            <Text style={{ color: colors.navy800 }}>
              Escolha as turmas que receberão esta missão. A ordem segue a posição atual do caminho.
            </Text>

            <View style={{ gap: spacing.sm, maxHeight: 320 }}>
              {classes.length === 0 && (
                <Text style={{ color: colors.navy800 }}>Você ainda não criou nenhuma turma.</Text>
              )}
              {classes.map((classRow) => {
                const assigned = isMissionAssignedToClass(modalMission.id, classRow.id);
                return (
                  <View
                    key={classRow.id}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: spacing.md,
                      borderRadius: radii.md,
                      borderWidth: 1,
                      borderColor: assigned ? colors.brandCyan : colors.navy800,
                    }}
                  >
                    <View style={{ flex: 1, marginRight: spacing.sm }}>
                      <Text style={{ fontFamily: 'Inter-Bold', color: colors.navy900 }}>{classRow.name}</Text>
                      <Text style={{ color: colors.navy800 }}>Código: {classRow.code}</Text>
                    </View>
                    <TouchableOpacity
                      disabled={assigning}
                      onPress={() =>
                        assigned
                          ? handleUnassignMission(modalMission, classRow)
                          : handleAssignMission(modalMission, classRow)
                      }
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                        borderRadius: radii.md,
                        backgroundColor: assigned ? colors.brandPink : colors.brandCyan,
                      }}
                    >
                      <Ionicons name={assigned ? 'remove-circle' : 'add-circle'} size={20} color={colors.white} />
                      <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>
                        {assigned ? 'Remover' : 'Adicionar'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity onPress={() => setModalMission(null)} style={{ padding: spacing.md, borderRadius: radii.md, backgroundColor: colors.navy800, alignItems: 'center' }}>
              <Text style={{ color: colors.white, fontFamily: 'Inter-Bold' }}>Concluir</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </View>
  );
}
