import { JsonObject } from './json';

export type Message = {
  id?: string;
  role:
    | 'human'
    | 'ai'
    | 'generic'
    | 'developer'
    | 'system'
    | 'function'
    | 'tool'
    | 'remove';
  content: string;
  metadata: JsonObject;
  score: number;
  traceId?: string;
};

export type Conversation = {
  id: string;
  userRef: string;
  title: string;
};
