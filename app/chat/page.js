'use client';

import { useState, useEffect, useRef } from 'react';
import {
  getProfile, getJobs, getPipeline, getStats,
  addJob, addToPipeline, moveJob, removeFromPipeline, updatePipelineJob,
  getChatMessages, saveChatMessages, clearChatMessages,
} from '../../lib/storage';

const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant',
  text: 'I can help you manage your job pipeline. Paste a job description to score it, ask about your stats, or update application statuses.\n\nTry: "What\'s my pipeline?" or "Score this role" or "Mark [company] as declined".',
  timestamp: new Date().toISOString(),
  actions: [],
};

const QUICK_ACTIONS = [
  'What are my stats?',
  'Show my pipeline',
  'Score a job',
  'How many apps this week?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    const saved = getChatMessages();
    if (saved.length > 0) {
      setMessages(saved);
    } else {
      setMessages([WELCOME_MESSAGE]);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0 && messages[0].id !== 'welcome') {
      saveChatMessages(messages);
    } else if (messages.length > 1) {
      saveChatMessages(messages);
    }
  }, [messages]);

  function getContext() {
    return {
      profile: getProfile(),
      pipeline: getPipeline(),
      jobs: getJobs().slice(0, 20),
      stats: getStats(),
    };
  }

  function getHistory() {
    return messages
      .filter(m => m.id !== 'welcome')
      .map(m => ({ role: m.role, text: m.text }));
  }

  async function executeActions(actions) {
    const executed = [];

    for (const action of actions) {
      if (action.type === 'update_pipeline') {
        const p = action.payload;
        if (p.action === 'add') {
          const job = {
            id: crypto.randomUUID(),
            title: p.jobTitle || 'Untitled',
            company: p.company || 'Unknown',
            url: p.url || '',
            score: p.score || 0,
            tier: p.tier || 3,
            dateAdded: new Date().toISOString(),
          };
          addToPipeline(job, p.toStage || 'saved');
          executed.push(`Added ${p.company} — ${p.jobTitle} to ${p.toStage || 'saved'}`);
        } else if (p.action === 'move') {
          if (p.jobId && p.fromStage && p.toStage) {
            moveJob(p.jobId, p.fromStage, p.toStage);
            executed.push(`Moved to ${p.toStage}`);
          } else if (p.company || p.jobTitle) {
            // Find job by company/title match
            const pipeline = getPipeline();
            let found = false;
            for (const [stage, jobs] of Object.entries(pipeline)) {
              const match = jobs.find(j =>
                (p.company && j.company?.toLowerCase().includes(p.company.toLowerCase())) ||
                (p.jobTitle && j.title?.toLowerCase().includes(p.jobTitle.toLowerCase()))
              );
              if (match) {
                moveJob(match.id, stage, p.toStage);
                if (p.notes) updatePipelineJob(match.id, { notes: p.notes });
                executed.push(`Moved ${match.company} from ${stage} to ${p.toStage}`);
                found = true;
                break;
              }
            }
            if (!found) executed.push(`Could not find matching job to move`);
          }
        } else if (p.action === 'remove') {
          if (p.jobId) {
            removeFromPipeline(p.jobId);
            executed.push('Removed from pipeline');
          }
        }
      } else if (action.type === 'score_result') {
        const s = action.payload;
        const job = addJob({
          title: s.title || 'Untitled',
          company: s.company || 'Unknown',
          url: s.url || '',
          jd: s.description || '',
          score: s.totalScore,
          tier: s.tier,
          dimensions: s.dimensions || [],
          summary: s.summary || '',
          redFlags: s.redFlags || [],
        });
        executed.push(`Scored ${s.company}: ${s.totalScore}/18 (Tier ${s.tier})`);
      } else if (action.type === 'log_activity') {
        executed.push(`Logged: ${action.payload.label}`);
      }
    }

    return executed;
  }

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
      actions: [],
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: getHistory(),
          context: getContext(),
        }),
      });

      const data = await res.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Execute client-side actions
      const executedLabels = await executeActions(data.actions || []);

      const assistantMsg = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: data.message || 'Done.',
        timestamp: new Date().toISOString(),
        actions: executedLabels,
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: `Error: ${err.message}`,
        timestamp: new Date().toISOString(),
        actions: [],
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleTextareaChange(e) {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  }

  function handleClear() {
    clearChatMessages();
    setMessages([WELCOME_MESSAGE]);
  }

  function handleChip(text) {
    setInput(text);
    textareaRef.current?.focus();
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div>
          <h1>Chat</h1>
          <p>Manage your pipeline conversationally</p>
        </div>
        <button className="btn-secondary" onClick={handleClear} style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}>
          Clear
        </button>
      </div>

      <div className="chat-messages">
        {messages.map(msg => (
          <div key={msg.id}>
            <div className={`chat-bubble ${msg.role}`}>
              {msg.text}
            </div>
            {msg.actions && msg.actions.length > 0 && (
              <div className="chat-actions-group">
                {msg.actions.map((action, i) => (
                  <div key={i} className="chat-action-card">
                    {action}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="chat-quick-actions">
        {QUICK_ACTIONS.map(chip => (
          <button
            key={chip}
            className="chat-chip"
            onClick={() => handleChip(chip)}
          >
            {chip}
          </button>
        ))}
      </div>

      <div className="chat-input-bar">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={loading}
        />
        <button
          className="btn-primary"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          style={{ flexShrink: 0 }}
        >
          {loading ? <span className="spinner" style={{ width: '1rem', height: '1rem', borderWidth: '2px' }} /> : 'Send'}
        </button>
      </div>
    </div>
  );
}
