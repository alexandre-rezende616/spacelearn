import { useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows, spacing } from '../../../src/theme/tokens';
import { supabase } from '../../../src/lib/supabaseClient';
import { useAuth } from '../../../src/store/useAuth';

type MissionRow = {
  id: string;
  title: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  creatorName?: string | null;
};

type ClassRow = { id: string; name: string; code: string };

type MissionAssignment = { classId: string; className: string; orderIndex: number };
type ClassAssignment = { missionId: string; orderIndex: number };

export default function BibliotecaMissoesProfessor() {
  const router = useRouter();
  const user = useAuth((s) => s.user);

  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [assignmentsByMission, setAssignmentsByMission] = useState<Record<string, MissionAssignment[]>>({});
  const [assignmentsByClass, setAssignmentsByClass] = useState<Record<string, ClassAssignment[]>>({});
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [modalMission, setModalMission] = useState<MissionRow | null>(null);
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

  async function loadData() {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data: classRows, error: classErr } = await supabase
        .from('classes')
        .select('id,name,code')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      if (classErr) throw classErr;
      const teacherClasses = (classRows as ClassRow[]) ?? [];
      setClasses(teacherClasses);
      const classIds = teacherClasses.map((c) => c.id);

      let assignments: { mission_id: string; class_id: string; order_index: number | null }[] = [];
      if (classIds.length) {
        const { data: assRows, error: assErr } = await supabase
          .from('mission_classes')
          .select('mission_id,class_id,order_index')
          .in('class_id', classIds);
        if (assErr) throw assErr;
        assignments = assRows ?? [];
      }

      const { data: missionRows, error: missionErr } = await supabase
        .from('missions')
        .select('id,title,description,created_by,created_at,status')
        .eq('status', 'published')
        .order('created_at', { ascending: false });
      if (missionErr) throw missionErr;

      const creatorIds = Array.from(
        new Set((missionRows ?? []).map((m: any) => m.created_by).filter((id): id is string => !!id)),
      );
      let creatorMap: Record<string, string | null> = {};
      if (creatorIds.length) {
        const { data: profileRows } = await supabase.from('profiles').select('id,nome').in('id', creatorIds);
        creatorMap = (profileRows ?? []).reduce<Record<string, string | null>>((acc, row: any) => {
          acc[row.id] = row.nome ?? null;
          return acc;
        }, {});
      }

      const missionList: MissionRow[] = (missionRows ?? []).map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        created_by: row.created_by,
        created_at: row.created_at,
        creatorName: creatorMap[row.created_by as string] ?? null,
      }));
      setMissions(missionList);

      const assignmentsMission: Record<string, MissionAssignment[]> = {};
      const assignmentsClass: Record<string, ClassAssignment[]> = {};

      assignments.forEach((assignment) => {
        const classInfo = teacherClasses.find((cls) => cls.id === assignment.class_id);
        if (!classInfo) return;
        if (!assignmentsMission[assignment.mission_id]) assignmentsMission[assignment.mission_id] = [];
        assignmentsMission[assignment.mission_id].push({
          classId: assignment.class_id,
          className: classInfo.name,
          orderIndex: assignment.order_index ?? 0,
        });

        if (!assignmentsClass[assignment.class_id]) assignmentsClass[assignment.class_id] = [];
        assignmentsClass[assignment.class_id].push({
          missionId: assignment.mission_id,
          orderIndex: assignment.order_index ?? 0,
        });
      });

      Object.values(assignmentsMission).forEach((list) =>
        list.sort((a, b) => a.orderIndex - b.orderIndex),
      );
      Object.values(assignmentsClass).forEach((list) =>
        list.sort((a, b) => a.orderIndex - b.orderIndex),
      );

      setAssignmentsByMission(assignmentsMission);
      setAssignmentsByClass(assignmentsClass);
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

  async function assignMissionToClass(mission: MissionRow, classRow: ClassRow) {
    const userId = user?.id;
    if (!userId) return;
    try {
      setAssigning(true);
      const nextOrder =
        (assignmentsByClass[classRow.id]?.length ?? 0);
      const { error } = await supabase
        .from('mission_classes')
        .upsert(
          { mission_id: mission.id, class_id: classRow.id, order_index: nextOrder, added_by: userId },
          { onConflict: 'mission_id,class_id', ignoreDuplicates: false },
        );
      if (error) throw error;
      await loadData();
    } catch (err: any) {
      Alert.alert('Erro', err?.message ?? 'Não foi possível vincular a missão à turma.');
    } finally {
      setAssigning(false);
    }
  }

  async function unassignMissionFromClass(mission: MissionRow, classRow: ClassRow) {
    try {
      setAssigning(true);
      const { error } = await supabase
        .from('mission_classes')
        .delete()
        .eq('mission_id', mission.id)
        .eq('class_id', classRow.id);
      if (error) throw error;
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
                          ? unassignMissionFromClass(modalMission, classRow)
                          : assignMissionToClass(modalMission, classRow)
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
