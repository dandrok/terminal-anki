import { StudySessionRecord } from '../domain';

export const recordStudySession = (
  sessionData: Omit<StudySessionRecord, 'id'>
): StudySessionRecord => {
  const session: StudySessionRecord = {
    ...sessionData,
    id: Date.now().toString()
  };
  return session;
};
