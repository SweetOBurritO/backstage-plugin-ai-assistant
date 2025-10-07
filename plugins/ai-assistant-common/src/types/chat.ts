type BaseMessage = {
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
};

export type ToolMessage = BaseMessage & {
  role: 'tool';
  name: string;
};

export type Message = BaseMessage | ToolMessage;

export type Conversation = {
  id: string;
  userRef: string;
  title: string;
};
