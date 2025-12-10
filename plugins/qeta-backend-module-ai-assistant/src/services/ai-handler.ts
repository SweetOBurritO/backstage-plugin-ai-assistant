import { AuthService } from '@backstage/backend-plugin-api';
import { AIHandler } from '@drodil/backstage-plugin-qeta-node';
import { AiAssistantService } from '@sweetoburrito/backstage-plugin-ai-assistant-node';

type QetaAiHandlerOptions = {
  aiAssistant: AiAssistantService;
  auth: AuthService;
};

const ANSWER_SYSTEM_PROMPT = `You are an expert assistant that helps answer questions based on provided content.
Use the tools available to you to try answer the question as accurately as possible.
Do not ask for further information from the user or further calls to action.
`;

const TAG_SUGGESTION_SYSTEM_PROMPT = `You are an expert assistant that suggests relevant tags for content based on provided content.
Use the tools available to you to suggest the most relevant tags.
Return the tags as a comma-separated list.
Do not ask for further information from the user or further calls to action.
`;

export const createQetaAiHandler = ({
  auth,
  aiAssistant,
}: QetaAiHandlerOptions): AIHandler => {
  const summarizeArticle: AIHandler['summarizeArticle'] = async article => {
    const credentials = await auth.getOwnServiceCredentials();

    const content = `Title: ${article.title}\nContent: ${article.content}`;

    const answer = await aiAssistant.summarize({
      credentials,
      content,
      length: 'a few sentences',
    });

    return {
      answer,
    };
  };

  const suggestTags: AIHandler['suggestTags'] = async (title, description) => {
    const credentials = await auth.getOwnServiceCredentials();

    const content = `
    Title: ${title}
    Description: ${description}`;

    const { messages } = await aiAssistant.prompt({
      messages: [
        {
          role: 'human',
          content,
          metadata: {},
          score: 0,
        },
      ],
      credentials,
      metadata: {
        runName: 'qeta-answer-suggest-tags',
        userId: 'system: qeta-ai-service',
      },
      systemPrompt: TAG_SUGGESTION_SYSTEM_PROMPT,
    });

    const aiMessages = messages.filter(m => m.role === 'ai');

    const tagString = aiMessages.pop()?.content ?? '';

    const tags = tagString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);

    return {
      tags,
    };
  };

  const answerNewQuestion: AIHandler['answerNewQuestion'] = async (
    title,
    description,
  ) => {
    const credentials = await auth.getOwnServiceCredentials();

    const content = `
    Title: ${title}
    Description: ${description}
    `;

    const { messages } = await aiAssistant.prompt({
      messages: [
        {
          role: 'human',
          content,
          metadata: {},
          score: 0,
        },
      ],
      credentials,
      metadata: {
        runName: 'qeta-answer-new-question',
        userId: 'system: qeta-ai-service',
      },
      systemPrompt: ANSWER_SYSTEM_PROMPT,
    });

    const aiMessages = messages.filter(m => m.role === 'ai');

    const answer = aiMessages.pop()?.content ?? 'No answer generated.';

    return {
      answer,
    };
  };

  const answerExistingQuestion: AIHandler['answerExistingQuestion'] =
    async question => {
      const credentials = await auth.getOwnServiceCredentials();

      const content = `
    Title: ${question.title}
    Content: ${question.content}
    Tags: ${question.tags ? question.tags.join(', ') : 'None'}
    Author: ${question.author}
    Experts: ${question.experts ? question.experts.join(', ') : 'None'}
    Answers: ${
      question.answers
        ? question.answers
            .map(answer => `\n- Answer by ${answer.author}: ${answer.content}`)
            .join('')
        : 'None'
    }`;

      const { messages } = await aiAssistant.prompt({
        messages: [
          {
            role: 'human',
            content,
            metadata: {},
            score: 0,
          },
        ],
        credentials,
        metadata: {
          runName: 'qeta-answer-existing-question',
          userId: 'system: qeta-ai-service',
        },
        systemPrompt: ANSWER_SYSTEM_PROMPT,
      });

      const aiMessages = messages.filter(m => m.role === 'ai');

      const answer = aiMessages.pop()?.content ?? 'No answer generated.';

      return {
        answer,
      };
    };

  return {
    answerNewQuestion,
    answerExistingQuestion,
    summarizeArticle,
    suggestTags,
  };
};
