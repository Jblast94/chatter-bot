
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import Modal from './Modal';
import { useUI, useUser, useConfig } from '@/lib/state';

export default function UserSettings() {
  const { name, info, setName, setInfo } = useUser();
  const { setShowUserConfig } = useUI();
  const { provider, setProvider, localEndpoint, setLocalEndpoint, localModelId, setLocalModelId } = useConfig();

  return (
    <Modal onClose={() => setShowUserConfig(false)}>
      <div className="userSettings">
        <p>
          Configure your hybrid identity and local model connections.
        </p>

        <form
          onSubmit={e => {
            e.preventDefault();
            setShowUserConfig(false);
          }}
        >
          <div className="section-header">
            <h3>Identity</h3>
          </div>

          <div>
            <p>Your name</p>
            <input
              type="text"
              name="name"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="How should the AI address you?"
            />
          </div>

          <div>
            <p>Contextual Info (Memory)</p>
            <textarea
              rows={2}
              name="info"
              value={info}
              onChange={e => setInfo(e.target.value)}
              placeholder="Shared memories or preferences for better character retention..."
            />
          </div>

          <hr />

          <div className="section-header">
            <h3>Model Engine</h3>
            <p className="subtext">Switch between Cloud (Gemini) and Local (Ollama/vLLM).</p>
          </div>

          <div>
            <p>Provider Engine</p>
            <select 
              value={provider} 
              onChange={(e) => setProvider(e.target.value as any)}
              className="provider-select"
            >
              <option value="gemini">Google Gemini Pro (Cloud)</option>
              <option value="local">Self-Hosted / Local API</option>
            </select>
          </div>

          {provider === 'local' && (
            <div className="local-config-fields">
              <div className="info-box">
                <span className="icon">info</span>
                <p>Ensure your local server (Ollama, vLLM, or llama.cpp) is running with OpenAI-compatible headers.</p>
              </div>
              <div>
                <p>Base URL</p>
                <input 
                  type="text" 
                  value={localEndpoint} 
                  onChange={(e) => setLocalEndpoint(e.target.value)}
                  placeholder="e.g., http://localhost:11434/v1"
                />
                <small>Default ports: Ollama (11434), vLLM (8000), llama.cpp (8080)</small>
              </div>
              <div>
                <p>Model Identifier</p>
                <input 
                  type="text" 
                  value={localModelId} 
                  onChange={(e) => setLocalModelId(e.target.value)}
                  placeholder="e.g., phi3, gemma, or llama3"
                />
              </div>
            </div>
          )}

          <button className="button primary">Save & Apply</button>
        </form>
      </div>
    </Modal>
  );
}
