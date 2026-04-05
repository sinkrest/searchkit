import { NextResponse } from 'next/server';

const SYSTEM_PROMPT = `You are SearchKit Chat — a job search pipeline assistant. You help the user manage their job search from a single chat interface.

You have access to the user's current pipeline data, scored jobs, and profile (provided in each message). Use this context to give accurate, specific answers.

When the user wants to take an action (add job, move pipeline stage, log activity), use the appropriate tool. Always use log_activity after any pipeline change so the dashboard stays in sync.

Be concise. No emojis. Reference specific companies and roles by name when discussing the pipeline.

Pipeline stages: saved → applied → interviewing → offer → closed.

When scoring a job, extract the title, company, and full description from what the user provides, then use score_job.

When the user says things like "mark X as declined" or "rejected by X", move that job to the "closed" stage with a note about the outcome.`;

const TOOLS = [
  {
    name: 'get_stats',
    description: 'Get current job search statistics (total jobs scored, applied count, interviewing count, offers, response rate, etc.). Use when user asks about stats, progress, or numbers.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'get_pipeline',
    description: 'Get the full pipeline with all jobs in each stage (saved, applied, interviewing, offer, closed). Use when user asks about their pipeline, specific companies, or what stage things are in.',
    input_schema: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'score_job',
    description: 'Score a job description against the user profile for fit (0-18 scale, Tier 1-3). Use when user pastes a job description or asks to evaluate a role.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Job title' },
        company: { type: 'string', description: 'Company name' },
        url: { type: 'string', description: 'Job posting URL if available' },
        description: { type: 'string', description: 'Full job description text' }
      },
      required: ['title', 'company', 'description']
    }
  },
  {
    name: 'update_pipeline',
    description: 'Add a job to the pipeline, move it between stages, or remove it. Stages: saved, applied, interviewing, offer, closed. Use "move" to change status (e.g., applied → interviewing). Use "add" for new entries.',
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['add', 'move', 'remove'], description: 'What to do' },
        jobId: { type: 'string', description: 'Job ID (for move/remove). Find from pipeline data.' },
        jobTitle: { type: 'string', description: 'Job title (for add)' },
        company: { type: 'string', description: 'Company name (for add)' },
        url: { type: 'string', description: 'Job URL (for add)' },
        score: { type: 'number', description: 'Job score 0-18 (for add, if known)' },
        tier: { type: 'number', description: 'Tier 1-3 (for add, if known)' },
        fromStage: { type: 'string', description: 'Current stage (for move)' },
        toStage: { type: 'string', description: 'Target stage' },
        notes: { type: 'string', description: 'Optional notes about the move/addition' }
      },
      required: ['action']
    }
  },
  {
    name: 'log_activity',
    description: 'Log an event to the activity feed (visible on the dashboard). Always use after pipeline changes. Categories: application (for job actions), interview (for interview events), build (for portfolio), session (for general).',
    input_schema: {
      type: 'object',
      properties: {
        category: { type: 'string', enum: ['application', 'interview', 'build', 'session'], description: 'Event category' },
        label: { type: 'string', description: 'Short event title (e.g., "Applied to Jiga")' },
        detail: { type: 'string', description: 'Event details' }
      },
      required: ['category', 'label']
    }
  }
];

async function callClaudeWithTools({ system, messages, tools, context }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const systemWithContext = `${system}\n\n## Current Data\n${JSON.stringify(context, null, 2)}`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemWithContext,
      messages,
      tools,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API error ${res.status}: ${err}`);
  }

  return res.json();
}

function processToolCalls(response, context) {
  const actions = [];
  let textParts = [];

  for (const block of response.content) {
    if (block.type === 'text') {
      textParts.push(block.text);
    } else if (block.type === 'tool_use') {
      const { name, input, id } = block;

      if (name === 'get_stats') {
        actions.push({
          type: 'tool_result',
          toolUseId: id,
          result: JSON.stringify(context.stats || {}),
        });
      } else if (name === 'get_pipeline') {
        actions.push({
          type: 'tool_result',
          toolUseId: id,
          result: JSON.stringify(context.pipeline || {}),
        });
      } else if (name === 'score_job') {
        actions.push({
          type: 'score_job',
          toolUseId: id,
          payload: input,
        });
      } else if (name === 'update_pipeline') {
        actions.push({
          type: 'update_pipeline',
          toolUseId: id,
          payload: input,
        });
      } else if (name === 'log_activity') {
        actions.push({
          type: 'log_activity',
          toolUseId: id,
          payload: {
            cat: input.category,
            label: input.label,
            detail: input.detail || '',
          },
        });
      }
    }
  }

  return { text: textParts.join('\n'), actions, stopReason: response.stop_reason };
}

export async function POST(req) {
  try {
    const { message, history = [], context = {} } = await req.json();

    const messages = [
      ...history.slice(-20).map(m => ({
        role: m.role,
        content: m.text,
      })),
      { role: 'user', content: message },
    ];

    let response = await callClaudeWithTools({
      system: SYSTEM_PROMPT,
      messages,
      tools: TOOLS,
      context,
    });

    let result = processToolCalls(response, context);
    const allActions = [...result.actions];
    let finalText = result.text;

    // Handle tool use loop — Claude may need multiple turns
    let loopMessages = [...messages];
    let iterations = 0;
    const maxIterations = 5;

    while (result.stopReason === 'tool_use' && iterations < maxIterations) {
      iterations++;

      // Build tool results for the next turn
      const toolResults = [];
      const clientActions = [];

      for (const action of result.actions) {
        if (action.type === 'tool_result') {
          // Stats/pipeline — return data directly
          toolResults.push({
            type: 'tool_result',
            tool_use_id: action.toolUseId,
            content: action.result,
          });
        } else if (action.type === 'score_job') {
          // Score job — call the score API internally
          try {
            const scoreRes = await fetch(new URL('/api/score', req.url), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                profile: context.profile || {},
                jobDescription: `Title: ${action.payload.title}\nCompany: ${action.payload.company}\n\n${action.payload.description}`,
              }),
            });
            const scoreData = await scoreRes.json();
            toolResults.push({
              type: 'tool_result',
              tool_use_id: action.toolUseId,
              content: JSON.stringify(scoreData),
            });
            clientActions.push({
              type: 'score_result',
              payload: { ...action.payload, ...scoreData },
            });
          } catch (err) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: action.toolUseId,
              content: JSON.stringify({ error: err.message }),
              is_error: true,
            });
          }
        } else if (action.type === 'update_pipeline') {
          // Pipeline update — return success, client will execute
          toolResults.push({
            type: 'tool_result',
            tool_use_id: action.toolUseId,
            content: JSON.stringify({ success: true, action: action.payload }),
          });
          clientActions.push(action);
        } else if (action.type === 'log_activity') {
          // Log activity — execute server-side
          try {
            const activityRes = await fetch(new URL('/api/activity', req.url), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(action.payload),
            });
            const activityData = await activityRes.json();
            toolResults.push({
              type: 'tool_result',
              tool_use_id: action.toolUseId,
              content: JSON.stringify(activityData),
            });
            clientActions.push(action);
          } catch (err) {
            toolResults.push({
              type: 'tool_result',
              tool_use_id: action.toolUseId,
              content: JSON.stringify({ error: err.message }),
              is_error: true,
            });
          }
        }
      }

      allActions.push(...clientActions);

      // Send tool results back to Claude
      loopMessages = [
        ...loopMessages,
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults },
      ];

      response = await callClaudeWithTools({
        system: SYSTEM_PROMPT,
        messages: loopMessages,
        tools: TOOLS,
        context,
      });

      result = processToolCalls(response, context);
      if (result.text) {
        finalText = result.text;
      }
    }

    // Collect final client-side actions (no tool_result types)
    const clientActions = allActions.filter(a =>
      a.type === 'update_pipeline' || a.type === 'log_activity' || a.type === 'score_result'
    );

    return NextResponse.json({
      message: finalText,
      actions: clientActions,
    });
  } catch (err) {
    console.error('Chat API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
