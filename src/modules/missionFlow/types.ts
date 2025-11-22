export type MissionStatus = 'draft' | 'published';

export type MissionSummary = {
  id: string;
  title: string;
  description: string | null;
  status: MissionStatus;
  created_at: string;
  created_by?: string | null;
  creatorName?: string | null;
};

export type ClassSummary = {
  id: string;
  name: string;
  code?: string;
};

export type MissionAssignment = {
  missionId: string;
  classId: string;
  className: string;
  orderIndex: number;
};

export type MissionWithClasses = MissionSummary & {
  classes: { id: string; name: string }[];
};

export type Question = { id: string; prompt: string; order_index: number };
export type Option = { id: string; question_id: string; text: string };
export type Medal = { id: string; title: string; description: string | null; required_correct: number };

export type MissionContent = {
  questions: Question[];
  optionsByQuestion: Record<string, Option[]>;
};

export type StudentMissionPayload = {
  missions: MissionWithClasses[];
  classIds: string[];
};

export type ProfessorLibraryPayload = {
  missions: MissionSummary[];
  classes: ClassSummary[];
  assignments: MissionAssignment[];
};

export type MissionAvailabilityIssue = 'no-classes' | 'student-not-enrolled' | 'no-questions' | null;

export type AnswerResult = {
  isCorrect: boolean;
  nextCorrect: number;
  nextTotal: number;
  completed: boolean;
  deltaXp: number;
  deltaCoins: number;
  prevMissionCorrect: number;
};
