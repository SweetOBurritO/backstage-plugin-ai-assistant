# Langfuse Integration

This guide explains how to set up Langfuse for observability and tracing of your AI Assistant interactions in Backstage.

## What is Langfuse?

Langfuse is an open-source LLM observability platform that provides tracing, monitoring, and analytics for your AI applications. It helps you:

- Track and debug LLM calls and agent interactions
- Monitor performance and costs
- Analyze user behavior and conversation patterns
- Identify issues and optimize your AI workflows

## Getting Started

### 1. Create a Langfuse Account

You have two options:

**Option A: Use Langfuse Cloud (Recommended for Getting Started)**

1. Sign up at [https://cloud.langfuse.com/auth/sign-up](https://cloud.langfuse.com/auth/sign-up)
2. Choose your region:
   - EU: `https://cloud.langfuse.com`
   - US: `https://us.cloud.langfuse.com`

**Option B: Self-Host Langfuse**

Follow the [self-hosting documentation](https://langfuse.com/docs/deployment/self-host) to deploy Langfuse on your own infrastructure.

### 2. Get API Credentials

1. Log in to your Langfuse instance
2. Navigate to **Project Settings**
3. Go to the **API Keys** section
4. Click **Create new API keys**
5. Copy the following credentials:
   - **Secret Key** (starts with `sk-lf-...`)
   - **Public Key** (starts with `pk-lf-...`)
   - **Base URL** (your Langfuse instance URL)

⚠️ **Important**: Save your secret key securely - it won't be shown again!

## Configuration

### AI Assistant Configuration

Add the credentials to the `aiAssistant` section:

```yaml
aiAssistant:
  langfuse:
    secretKey: sk-lf-your-secret-key
    publicKey: pk-lf-your-public-key
    baseUrl: https://cloud.langfuse.com # or https://us.cloud.langfuse.com or your self-hosted URL
```

### Environment Variables (Recommended)

For better security, you should use environment variables instead of hardcoding credentials.

**Step 1:** Create a `.env` file in the root of your Backstage project (if it doesn't exist):

```bash
# .env
LANGFUSE_SECRET_KEY=sk-lf-your-secret-key
LANGFUSE_PUBLIC_KEY=pk-lf-your-public-key
LANGFUSE_BASE_URL=https://cloud.langfuse.com
```

**Step 2:** Reference these variables in your `app-config.yaml` using the `$env:` syntax:

```yaml
aiAssistant:
  langfuse:
    secretKey:
      $env: LANGFUSE_SECRET_KEY
    publicKey:
      $env: LANGFUSE_PUBLIC_KEY
    baseUrl:
      $env: LANGFUSE_BASE_URL
```

⚠️ **Important**: Make sure `.env` is in your `.gitignore` to prevent committing secrets to version control!

## Verification

Once configured, your AI Assistant will automatically send trace data to Langfuse. To verify the integration:

1. Start your Backstage application
2. Use the AI Assistant to ask a question
3. Log in to your Langfuse dashboard
4. Navigate to the **Traces** section
5. You should see your AI Assistant interactions appearing as traces

## What Gets Tracked?

The Langfuse integration automatically captures:

- **User queries** and AI responses
- **Model calls** including prompts and completions
- **Token usage** and costs
- **Latency** and performance metrics
- **Errors** and debugging information
- **Tool usage** (when using function calling)
- **Context** including user information and session data

## Viewing Your Data

In the Langfuse dashboard, you can:

- **Browse traces**: See all AI interactions in chronological order
- **Search and filter**: Find specific conversations or issues
- **Analyze performance**: View latency, token usage, and cost metrics
- **Debug errors**: Inspect failed requests and error messages
- **Track users**: See per-user usage patterns and behavior

## Best Practices

1. **Use environment variables**: Keep your API keys secure by using environment variables instead of hardcoding them
2. **Set up alerts**: Configure Langfuse to alert you about errors or performance issues
3. **Monitor costs**: Regularly review your token usage and costs in the Langfuse dashboard
4. **Tag sessions**: Use Langfuse's tagging features to organize and categorize your traces
5. **Review regularly**: Make it a habit to review traces to identify optimization opportunities

## Troubleshooting

### Traces not appearing in Langfuse

- Verify your API keys are correct
- Check that the `baseUrl` matches your Langfuse instance
- Ensure your application has network access to Langfuse
- Check the application logs for any Langfuse-related errors

### Authentication errors

- Confirm your secret key and public key are not swapped
- Verify the keys haven't expired (regenerate if necessary)
- Check that you're using the correct region URL

### Self-hosted connection issues

- Ensure your self-hosted instance is accessible from your Backstage application
- Verify SSL/TLS certificates are properly configured
- Check firewall rules and network policies

## Additional Resources

- [Langfuse Documentation](https://langfuse.com/docs)
- [Langfuse GitHub Repository](https://github.com/langfuse/langfuse)
- [Self-Hosting Guide](https://langfuse.com/docs/deployment/self-host)
- [API Reference](https://langfuse.com/docs/api)
