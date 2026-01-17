
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import { useUI, useUser, ChatMessage } from '@/lib/state';
import c from 'classnames';

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
      // Fix: Exclusively use process.env.API_KEY for SDK initialization
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
      
      // Build parts for the current message
      const parts: any[] = [{ text: input }];
      userMsg.attachments?.forEach(att => {
        if (att.type.startsWith('image/')) {
          parts.push({
            inlineData: {
              mimeType: att.type,
              data: att.data
            }
          });
        } else {
          // For non-image files, we'll just mention them in text for now
          parts[0].text += `\n[Attached File: ${att.name}]`;
        }
      });

      const systemInstruction = isCodingMode 
        ? "You are an anonymous coding agent. You are elite, pithy, and focused on executing and debugging complex code. You provide complete, production-ready code blocks and simulated terminal output if 'execution' is requested. Your tone is professional but mysterious."
        : `You are a helpful personal assistant named Gemini. You are helping ${name || 'the user'} with their tasks and documents.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: [{ role: 'user', parts }],
        config: {
          systemInstruction,
          tools: isCodingMode ? [{ googleSearch: {} }] : [],
        }
      });

      const modelMsg: ChatMessage = {
        role: 'model',
        text: response.text || 'I encountered an error processing your request.',
        timestamp: new Date(),
        // Fix: Correctly extract grounding chunks for search grounding as required
        groundingChunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks,
      };
      addChatMessage(modelMsg);
    } catch (err) {
      console.error(err);
      addChatMessage({
        role: 'model',
        text: 'Error: Failed to connect to Gemini Pro. Please check your network or API key.',
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
            <h3>{isCodingMode ? 'Coding Agent' : 'Personal Assistant'}</h3>
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
              <span className="icon">spark</span>
              <p>How can I assist you today?</p>
              {isCodingMode && <p className="sub">Coding Agent Active. Ready to build.</p>}
            </div>
          )}
          {chatMessages.map((msg, i) => (
            <div key={i} className={c("message-row", msg.role)}>
              <div className="message-bubble">
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="message-attachments">
                    {msg.attachments.map((att, ai) => (
                      <div key={ai} className="attachment-preview">
                        {att.type.startsWith('image/') ? (
                          <img src={`data:${att.type};base64,${att.data}`} alt={att.name} />
                        ) : (
                          <div className="file-icon">
                            <span className="icon">description</span>
                            <span>{att.name}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="message-text">
                  {msg.text.split('\n').map((line, li) => (
                    <p key={li}>{line}</p>
                  ))}
                </div>
                {/* Fix: Render grounding sources to comply with search grounding visibility rules */}
                {msg.groundingChunks && (
                  <div className="grounding-sources">
                    <p className="sources-label">Sources:</p>
                    <ul className="sources-list">
                      {msg.groundingChunks.map((chunk: any, ci: number) => (
                        chunk.web && (
                          <li key={ci}>
                            <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer">
                              {chunk.web.title || chunk.web.uri}
                            </a>
                          </li>
                        )
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="message-row model">
              <div className="message-bubble loading">
                <div className="dot-typing"></div>
              </div>
            </div>
          )}
        </div>

        <form className="chat-input-area" onSubmit={sendMessage}>
          {attachments.length > 0 && (
            <div className="input-attachments">
              {attachments.map((att, i) => (
                <div key={i} className="attachment-chip">
                  <span>{att.name}</span>
                  <button type="button" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}>
                    <span className="icon">close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="input-row">
            <button type="button" className="icon-btn" onClick={() => fileInputRef.current?.click()}>
              <span className="icon">attach_file</span>
            </button>
            <input 
              type="file" 
              multiple 
              hidden 
              ref={fileInputRef} 
              onChange={handleFileUpload}
            />
            <textarea 
              placeholder={isCodingMode ? "Ask the Coding Agent..." : "Message Assistant..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button type="submit" className="send-btn" disabled={loading}>
              <span className="icon">send</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
