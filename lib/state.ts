
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { create } from 'zustand';
import { Agent, Charlotte, Paul, Shane, Penny } from './presets/agents';

/**
 * User Identity State
 * Tracks personalization data used to ground AI responses.
 */
export type User = {
  name?: string;
  info?: string;
};

export const useUser = create<
  {
    setName: (name: string) => void;
    setInfo: (info: string) => void;
  } & User
>(set => ({
  name: '',
  info: '',
  setName: name => set({ name }),
  setInfo: info => set({ info }),
}));

/**
 * Chat Message History
 * Used for both Gemini Cloud and Local OpenAI-compatible history.
 */
export type ChatMessage = {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  attachments?: { name: string; type: string; data: string }[];
  groundingChunks?: any[];
};

/**
 * Hybrid Configuration State
 * Allows switching between Google GenAI SDK and a local self-hosted API.
 * 
 * Local Engine Tips:
 * - Ollama: Use http://localhost:11434/v1
 * - vLLM: Use http://localhost:8000/v1
 * - llama.cpp: Use http://localhost:8080/v1
 */
export type ModelProvider = 'gemini' | 'local';

export const useConfig = create<{
  provider: ModelProvider;
  setProvider: (p: ModelProvider) => void;
  localEndpoint: string;
  setLocalEndpoint: (e: string) => void;
  localModelId: string;
  setLocalModelId: (id: string) => void;
}>(set => ({
  provider: 'gemini',
  setProvider: provider => set({ provider }),
  localEndpoint: 'http://localhost:11434/v1',
  setLocalEndpoint: localEndpoint => set({ localEndpoint }),
  localModelId: 'llama3',
  setLocalModelId: localModelId => set({ localModelId }),
}));

/**
 * Agent / Character Management
 */
function getAgentById(id: string) {
  const { availablePersonal, availablePresets } = useAgent.getState();
  return (
    availablePersonal.find(agent => agent.id === id) ||
    availablePresets.find(agent => agent.id === id)
  );
}

export const useAgent = create<{
  current: Agent;
  availablePresets: Agent[];
  availablePersonal: Agent[];
  setCurrent: (agent: Agent | string) => void;
  addAgent: (agent: Agent) => void;
  update: (agentId: string, adjustments: Partial<Agent>) => void;
}>(set => ({
  current: Paul,
  availablePresets: [Paul, Charlotte, Shane, Penny],
  availablePersonal: [],

  addAgent: (agent: Agent) => {
    set(state => ({
      availablePersonal: [...state.availablePersonal, agent],
      current: agent,
    }));
  },
  setCurrent: (agent: Agent | string) =>
    set({ current: typeof agent === 'string' ? getAgentById(agent) : agent }),
  update: (agentId: string, adjustments: Partial<Agent>) => {
    let agent = getAgentById(agentId);
    if (!agent) return;
    const updatedAgent = { ...agent, ...adjustments };
    set(state => ({
      availablePresets: state.availablePresets.map(a =>
        a.id === agentId ? updatedAgent : a
      ),
      availablePersonal: state.availablePersonal.map(a =>
        a.id === agentId ? updatedAgent : a
      ),
      current: state.current.id === agentId ? updatedAgent : state.current,
    }));
  },
}));

/**
 * UI State
 */
export const useUI = create<{
  showUserConfig: boolean;
  setShowUserConfig: (show: boolean) => void;
  showAgentEdit: boolean;
  setShowAgentEdit: (show: boolean) => void;
  showChatAssistant: boolean;
  setShowChatAssistant: (show: boolean) => void;
  chatMessages: ChatMessage[];
  addChatMessage: (msg: ChatMessage) => void;
  isCodingMode: boolean;
  setCodingMode: (mode: boolean) => void;
}>(set => ({
  showUserConfig: true,
  setShowUserConfig: (show: boolean) => set({ showUserConfig: show }),
  showAgentEdit: false,
  setShowAgentEdit: (show: boolean) => set({ showAgentEdit: show }),
  showChatAssistant: false,
  setShowChatAssistant: (show: boolean) => set({ showChatAssistant: show }),
  chatMessages: [],
  addChatMessage: (msg: ChatMessage) => set(state => ({ chatMessages: [...state.chatMessages, msg] })),
  isCodingMode: false,
  setCodingMode: (mode: boolean) => set({ isCodingMode: mode }),
}));
