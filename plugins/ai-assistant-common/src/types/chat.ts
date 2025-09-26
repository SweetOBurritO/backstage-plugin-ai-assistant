export type Message = {
  id?: string;
  role: string;
  content: string;
};

export type Conversation = {
  id: string;
  userRef: string;
  title: string;
};
