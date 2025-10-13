/**
 * Types for Waku Reliable Channels implementation
 */

export interface Question {
  id: string;
  text: string;
  active: boolean;
  createdAt: number;
}

export interface Answer {
  id: string;
  questionId: string;
  text: string;
  senderId: string;
  timestamp: number;
}

export interface Instance {
  id: string;
  name: string;
  questions: Question[];
  createdAt: number;
}

/**
 * Message types exchanged via Waku Reliable Channels
 */
export enum MessageType {
  QUESTION_ADDED = 'QUESTION_ADDED',
  QUESTION_ACTIVATED = 'QUESTION_ACTIVATED',
  QUESTION_DEACTIVATED = 'QUESTION_DEACTIVATED',
  ANSWER_SUBMITTED = 'ANSWER_SUBMITTED',
  INSTANCE_CREATED = 'INSTANCE_CREATED'
}

export interface WakuMessage {
  type: MessageType;
  timestamp: number;
  senderId: string;
  payload: any;
}

export interface QuestionAddedPayload {
  question: Question;
}

export interface QuestionActivatedPayload {
  questionId: string;
}

export interface QuestionDeactivatedPayload {
  questionId: string;
}

export interface AnswerSubmittedPayload {
  answer: Answer;
}
