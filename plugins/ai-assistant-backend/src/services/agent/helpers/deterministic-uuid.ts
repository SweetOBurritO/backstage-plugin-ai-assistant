import { v5 as uuidv5, v4 as uuidv4, validate } from 'uuid';

const MESSAGE_ID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

export const createDeterministicUuid = (message: { id?: string }): string => {
  if (message.id && validate(message.id)) {
    return message.id;
  }
  if (message.id) {
    return uuidv5(message.id, MESSAGE_ID_NAMESPACE);
  }

  return uuidv4();
};
