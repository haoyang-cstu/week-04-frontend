"use client";

import { useEffect, useRef, useState } from "react";

// One agent tool call, logged by the /ai/agent endpoint.
interface AgentStep {
  tool: string;
  input: Record<string, unknown>;
  result: unknown;
}

// One turn of the conversation. Mirrors the Anthropic message shape that the
// chat/recommend endpoints expect in `conversation_history`. Assistant turns
// produced by the agent may also carry the tool-call steps.
interface Message {
  role: "user" | "assistant";
  content: string;
  steps?: AgentStep[];
}

type Mode = "chat" | "recommend" | "agent";

// Each mode maps to a different backend endpoint and label.
const MODES: Record<Mode, { label: string; endpoint: string }> = {
  chat: { label: "General Chat", endpoint: "/ai/chat" },
  recommend: { label: "Book Recommendations", endpoint: "/ai/recommend" },
  agent: { label: "Agent", endpoint: "/ai/agent" },
};

export default function ChatPage() {
  const [mode, setMode] = useState<Mode>("chat");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep the latest message in view as the conversation grows.
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Switching modes starts a fresh conversation so context doesn't leak
  // between modes.
  function switchMode(next: Mode) {
    if (next === mode) return;
    setMode(next);
    setMessages([]);
    setError(null);
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setInput("");

    // Optimistically show the user's message right away.
    const history = messages;
    setMessages([...history, { role: "user", content: text }]);
    setLoading(true);

    try {
      const isAgent = mode === "agent";
      const body = isAgent
        ? { message: text }
        : {
            message: text,
            // Only send prior chat/assistant turns (strip any agent steps).
            conversation_history: history.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          };

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}${MODES[mode].endpoint}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }

      const data = await res.json();

      if (isAgent) {
        // /ai/agent returns { response, agent_steps }
        setMessages([
          ...history,
          { role: "user", content: text },
          { role: "assistant", content: data.response, steps: data.agent_steps },
        ]);
      } else {
        // /ai/chat and /ai/recommend return { reply, updated_history }
        setMessages(data.updated_history);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to reach the assistant"
      );
      // Roll back the optimistic user message on failure.
      setMessages(history);
      setInput(text);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  const placeholders: Record<Mode, string> = {
    chat: "Ask me anything about books!",
    recommend: "Ask for recommendations based on your library.",
    agent: 'Try: "Mark 1984 as read and give it 4 stars"',
  };

  return (
    <main className="flex flex-1 flex-col items-center bg-zinc-50 p-4 dark:bg-black">
      <div className="flex h-[calc(100vh-8rem)] w-full max-w-2xl flex-col rounded-xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        {/* Header + mode toggle */}
        <div className="border-b border-gray-200 p-4 dark:border-zinc-800">
          <h1 className="mb-3 text-lg font-semibold">Book Assistant</h1>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(MODES) as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  mode === m
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-zinc-800 dark:text-zinc-300"
                }`}
              >
                {MODES[m].label}
              </button>
            ))}
          </div>
        </div>

        {/* Message history */}
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && !loading && (
            <p className="mt-8 text-center text-sm text-gray-400">
              {placeholders[mode]}
            </p>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex flex-col ${
                m.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-2 text-sm ${
                  m.role === "user"
                    ? "rounded-br-sm bg-blue-600 text-white"
                    : "rounded-bl-sm bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-zinc-100"
                }`}
              >
                {m.content}
              </div>

              {/* Agent tool calls, shown as expandable "thinking steps" */}
              {m.steps && m.steps.length > 0 && (
                <div className="mt-1 max-w-[80%] space-y-1">
                  {m.steps.map((step, j) => (
                    <details
                      key={j}
                      className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-500 dark:border-zinc-800 dark:bg-zinc-900"
                    >
                      <summary className="cursor-pointer select-none">
                        🔧 {step.tool}
                      </summary>
                      <pre className="mt-1 overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(
                          { input: step.input, result: step.result },
                          null,
                          2
                        )}
                      </pre>
                    </details>
                  ))}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-sm bg-gray-100 px-4 py-2 text-sm text-gray-500 dark:bg-zinc-800">
                {mode === "agent" ? "Working…" : "Thinking…"}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Error banner */}
        {error && (
          <div className="border-t border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2 border-t border-gray-200 p-4 dark:border-zinc-800">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message…"
            disabled={loading}
            className="flex-1 rounded-full border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-900"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="rounded-full bg-blue-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
