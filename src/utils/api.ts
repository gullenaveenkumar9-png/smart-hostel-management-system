import { HostelDatabaseState } from '../types';

export async function fetchDatabase(): Promise<HostelDatabaseState> {
  const response = await fetch('/api/db');
  if (!response.ok) {
    throw new Error('Failed to load database from server');
  }
  return response.json();
}

export async function saveDatabase(state: HostelDatabaseState): Promise<boolean> {
  const response = await fetch('/api/db', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(state),
  });
  if (!response.ok) {
    throw new Error('Failed to sync database to server');
  }
  const data = await response.json();
  return data.success;
}

export async function askGeminiAssistant(
  message: string,
  userRole: string,
  userId: string,
  userName: string
): Promise<string> {
  const response = await fetch('/api/gemini/assistant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, userRole, userId, userName }),
  });
  if (!response.ok) {
    throw new Error('Failed to query Gemini AI');
  }
  const data = await response.json();
  return data.reply;
}
