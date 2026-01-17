
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { useUI, useUser, useConfig, ChatMessage } from '@/lib/state';
import c from 'classnames';

/**
 * ChatAssistant Component
 * Bridges the gap between Google Gemini Cloud services and Local self-hosted models.
 * Handles multimodal input (text/images) for Gemini and falls back to standard
 * OpenAI-compatible completions for local providers like Ollama or vLLM.
 */
export default function ChatAssistant() {
  const { 
    showChatAssistant, 
    setShowChatAssistant, 
    chatMessages, 
    addChatMessage, 
    isCodingMode, 
    setCodingMode 
  } = useUI();
  const { name } = useUser();
  const { provider, localEndpoint, localModelId } = useConfig();
  
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; type: string; data: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatMessages, loading]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const base64 = (readerEvent.target?.result as string).split(',')[1];
        setAttachments(prev => [...prev, { name: file.name, type: file.type, data: base64 }]);
      };
      reader.readAsDataURL(file);
    });
  };

  /**
   * Main Dispatcher for Messages
   * Logic splits here based on whether 'gemini' or 'local' is selected in UserSettings.
   */
  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if ((!input.trim() && attachments.length === 0) || loading) return;

    const userMsg: ChatMessage = {
      role: 'user',
      text: input,
      timestamp: new Date(),
      attachments: [...attachments],
    };

    addChatMessage(userMsg);
    setInput('');
    setAttachments([]);
    setLoading(true);

    try {
      const systemInstruction = isCodingMode 
        ? "You are an anonymous coding agent. You are elite, pithy, and focused on executing and debugging complex code."
        : `You are a helpful personal assistant helping ${name || 'the user'}.`;

      if (provider === 'gemini') {
        // --- GEMINI CLOUD LOGIC ---
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
        const parts: any[] = [{ text: input }];
        userMsg.attachments?.forEach(att => {
          if (att.type.startsWith('image/')) {
            parts.push({ inlineData: { mimeType: att.type, data: att.data } });
          } else {
            parts[0].text += `\n[Attached File: ${att.name}]`;
          }
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3-pro-preview',
          contents: [{ role: 'user', parts }],
          config: { systemInstruction, tools: isCodingMode ? [{ googleSearch: {} }] : [] }
        });

        addChatMessage({
          role: 'model',
          text: response.text || 'Empty response',
          timestamp: new Date(),
          groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks,
        });
      } else {
        // --- LOCAL / SELF-HOSTED LOGIC ---
        // Uses the standard OpenAI Chat Completion specification supported by:
        // - Ollama (/v1/chat/completions)
        // - vLLM (/v1/chat/completions)
        // - llama.cpp (/v1/chat/completions)
        const response = await fetch(`${localEndpoint.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: localModelId,
            messages: [
              { role: 'system', content: systemInstruction },
              ...chatMessages.map(m => ({ 
                role: m.role === 'user' ? 'user' : 'assistant', 
                content: m.text 
              })),
              { role: 'user', content: input }
            ],
            temperature: 0.7,
          })
        });

        const data = await response.json();
        const text = data.choices?.[0]?.message?.content || 'Local engine error.';
        
        addChatMessage({
          role: 'model',
          text: text,
          timestamp: new Date(),
        });
      }
    } catch (err) {
      console.error(err);
      addChatMessage({
        role: 'model',
        text: `Network Error: Verify that your ${provider === 'local' ? 'local server is running and CORS is enabled' : 'API Key is valid'}.`,
        timestamp: new Date(),
      });
    } finally {
      setLoading(false);
    }
  };

  if (!showChatAssistant) return null;

  return (
    <div className="chat-assistant-overlay">
      <div className="chat-assistant-panel">
        <div className="chat-header">
          <div className="header-title">
            <span className="icon">{isCodingMode ? 'terminal' : 'assistant'}</span>
            <div className="title-stack">
              <h3>{isCodingMode ? 'Coding Agent' : 'Personal Assistant'}</h3>
              <span className="provider-badge">{provider === 'gemini' ? 'Gemini 3 Pro' : `Local: ${localModelId}`}</span>
            </div>
          </div>
          <div className="header-actions">
            <button 
              className={c("mode-toggle", { active: isCodingMode })}
              onClick={() => setCodingMode(!isCodingMode)}
              title="Toggle Coding Mode"
            >
              <span className="icon">code</span>
            </button>
            <button onClick={() => setShowChatAssistant(false)}>
              <span className="icon">close</span>
            </button>
          </div>
        </div>

        <div className="chat-messages" ref={scrollRef}>
          {chatMessages.length === 0 && (
            <div className="empty-state">
              <span className="icon">{provider === 'gemini' ? 'spark' : 'dns'}</span>
              <p>Ready to assist via {provider === 'gemini' ? 'Gemini Cloud' : `Local Server (${localModelId})`}</p>
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={c("message-row", msg.role)}>
              <div className="message-bubble">
                {msg.attachments && msg.attachments.map((att, ai) => (
                  <div key={ai} className="attachment-preview">
                    {att.type.startsWith('image/') ? <img src={`data:${att.type};base64,${att.data}`} alt={att.name} /> : <div className="file-icon"><span className="icon">description</span>{att.name}</div>}
                  </div>
                ))}
                <div className="message-text">
                  {msg.text.split('\n').map((line, li) => <p key={li}>{line}</p>)}
                </div>
              </div>
            </div>
          ))}
          {loading && <div className="message-row model"><div className="message-bubble loading"><div className="dot-typing"></div></div></div>}
        </div>

        <form className="chat-input-area" onSubmit={sendMessage}>
          {attachments.length > 0 && (
            <div className="input-attachments">
              {attachments.map((att, i) => (
                <div key={i} className="attachment-chip">
                  <span>{att.name}</span>
                  <button type="button" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}><span className="icon">close</span></button>
                </div>
              ))}
            </div>
          )}
          <div className="input-row">
            <button type="button" className="icon-btn" onClick={() => fileInputRef.current?.click()}><span className="icon">attach_file</span></button>
            <input type="file" multiple hidden ref={fileInputRef} onChange={handleFileUpload} />
            <textarea 
              placeholder={provider === 'gemini' ? "Ask Gemini Cloud..." : `Ask Local ${localModelId}...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            />
            <button type="submit" className="send-btn" disabled={loading}><span className="icon">send</span></button>
          </div>
        </form>
      </div>
    </div>
  );
}
