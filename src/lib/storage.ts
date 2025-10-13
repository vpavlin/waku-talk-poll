/**
 * Local Storage utilities for persisting instances and questions
 * 
 * This allows admins to prepare questions ahead of time and return to sessions
 */

import type { Question, Answer, Instance } from '@/types/waku';

const STORAGE_KEYS = {
  INSTANCES: 'audience-qa-instances',
  QUESTIONS: 'audience-qa-questions',
  ANSWERS: 'audience-qa-answers'
} as const;

/**
 * Get all instances from localStorage
 */
export function getInstances(): Instance[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.INSTANCES);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[Storage] Error loading instances:', error);
    return [];
  }
}

/**
 * Save an instance to localStorage
 */
export function saveInstance(instance: Instance): void {
  try {
    const instances = getInstances();
    const existingIndex = instances.findIndex(i => i.id === instance.id);
    
    if (existingIndex >= 0) {
      instances[existingIndex] = instance;
    } else {
      instances.push(instance);
    }
    
    localStorage.setItem(STORAGE_KEYS.INSTANCES, JSON.stringify(instances));
    console.log('[Storage] Instance saved:', instance.id);
  } catch (error) {
    console.error('[Storage] Error saving instance:', error);
  }
}

/**
 * Get a specific instance by ID
 */
export function getInstance(instanceId: string): Instance | null {
  const instances = getInstances();
  return instances.find(i => i.id === instanceId) || null;
}

/**
 * Delete an instance
 */
export function deleteInstance(instanceId: string): void {
  try {
    const instances = getInstances().filter(i => i.id !== instanceId);
    localStorage.setItem(STORAGE_KEYS.INSTANCES, JSON.stringify(instances));
    
    // Also delete questions and answers for this instance
    deleteQuestions(instanceId);
    deleteAnswers(instanceId);
    
    console.log('[Storage] Instance deleted:', instanceId);
  } catch (error) {
    console.error('[Storage] Error deleting instance:', error);
  }
}

/**
 * Get questions for a specific instance
 */
export function getQuestions(instanceId: string): Question[] {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEYS.QUESTIONS}-${instanceId}`);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[Storage] Error loading questions:', error);
    return [];
  }
}

/**
 * Save questions for an instance
 */
export function saveQuestions(instanceId: string, questions: Question[]): void {
  try {
    localStorage.setItem(`${STORAGE_KEYS.QUESTIONS}-${instanceId}`, JSON.stringify(questions));
    console.log('[Storage] Questions saved for instance:', instanceId, questions.length);
  } catch (error) {
    console.error('[Storage] Error saving questions:', error);
  }
}

/**
 * Delete questions for an instance
 */
export function deleteQuestions(instanceId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEYS.QUESTIONS}-${instanceId}`);
  } catch (error) {
    console.error('[Storage] Error deleting questions:', error);
  }
}

/**
 * Get answers for a specific instance
 */
export function getAnswers(instanceId: string): Answer[] {
  try {
    const stored = localStorage.getItem(`${STORAGE_KEYS.ANSWERS}-${instanceId}`);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('[Storage] Error loading answers:', error);
    return [];
  }
}

/**
 * Save answers for an instance
 */
export function saveAnswers(instanceId: string, answers: Answer[]): void {
  try {
    localStorage.setItem(`${STORAGE_KEYS.ANSWERS}-${instanceId}`, JSON.stringify(answers));
    console.log('[Storage] Answers saved for instance:', instanceId, answers.length);
  } catch (error) {
    console.error('[Storage] Error saving answers:', error);
  }
}

/**
 * Delete answers for an instance
 */
export function deleteAnswers(instanceId: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEYS.ANSWERS}-${instanceId}`);
  } catch (error) {
    console.error('[Storage] Error deleting answers:', error);
  }
}

/**
 * Clear all data (useful for testing)
 */
export function clearAllData(): void {
  try {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('audience-qa-')) {
        localStorage.removeItem(key);
      }
    });
    console.log('[Storage] All data cleared');
  } catch (error) {
    console.error('[Storage] Error clearing data:', error);
  }
}
