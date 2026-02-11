import { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, FileText, Settings as SettingsIcon, Home, Folder, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { twMerge } from 'tailwind-merge';

const API_BASE = 'http://localhost:8000';

function DirectoryPicker({ onSelect, onCancel }: { onSelect: (path: string) => void, onCancel: () => void }) {
  const [currentPath, setCurrentPath] = useState<string>('');
  const [parentPath, setParentPath] = useState<string>('');
  const [items, setItems] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocs = async (path?: string) => {
    setIsLoading(true);
    try {
      const resp = await axios.get(`${API_BASE}/browse`, { params: { path } });
      setCurrentPath(resp.data.current_path);
      setParentPath(resp.data.parent_path);
      setItems(resp.data.items);
    } catch (err) {
      alert('Error browsing directory');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  return (
    <div className="flex flex-col h-[400px]">
      <div className="flex items-center gap-2 mb-6 p-3 bg-white/5 rounded-xl text-xs font-mono">
        <Folder size={16} className="text-primary-400 shrink-0" />
        <span className="truncate text-white/60">{currentPath}</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 mb-4 pr-2 custom-scrollbar">
        {currentPath !== parentPath && (
          <button
            onClick={() => fetchDocs(parentPath)}
            className="w-full text-left p-3 hover:bg-white/5 rounded-xl flex items-center gap-3 text-sm text-white/40 font-bold"
          >
            ← Back
          </button>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" /></div>
        ) : (
          items.map((item, i) => (
            <div
              key={i}
              className={twMerge(
                "w-full flex items-center justify-between p-2 rounded-xl transition-all border border-transparent",
                item.is_directory ? "hover:bg-white/5 hover:border-white/10" : "opacity-30"
              )}
            >
              <button
                onClick={() => item.is_directory ? fetchDocs(item.path) : null}
                className={twMerge(
                  "flex-1 text-left p-2 flex items-center gap-4 text-sm font-semibold",
                  item.is_directory ? "text-white/90" : "cursor-default"
                )}
              >
                <Folder size={20} className={item.is_directory ? "text-primary-400" : "text-white/20"} />
                <span className="truncate">{item.name}</span>
              </button>
              {item.is_directory && (
                <button
                  onClick={() => onSelect(item.path)}
                  className="px-4 py-2 bg-primary-600 rounded-lg text-xs font-black uppercase tracking-tighter hover:bg-primary-500 transition-all shadow-lg shadow-primary-900/40"
                >
                  Confirm
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex gap-4 pt-6 border-t border-white/10">
        <button
          onClick={onCancel}
          className="flex-1 py-3 text-white/40 hover:text-white font-bold transition-all"
        >
          Cancel
        </button>
        <button
          onClick={() => onSelect(currentPath)}
          className="flex-1 py-3 bg-white/10 text-white rounded-xl font-black uppercase tracking-widest hover:bg-white/20 transition-all text-[10px]"
        >
          Index Folder Root
        </button>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [isIndexModalOpen, setIndexModalOpen] = useState(false);
  const [isPickerMode, setIsPickerMode] = useState(false);
  const [manualPath, setManualPath] = useState('');
  const [indexStats, setIndexStats] = useState({ indexing: false, path: '' });
  const [activeDirectory, setActiveDirectory] = useState<string>('');
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [sessions, setSessions] = useState<any[]>([]);

  const fetchSessions = async (dir: string) => {
    try {
      const resp = await axios.get(`${API_BASE}/sessions`, { params: { directory_path: dir } });
      setSessions(resp.data.sessions);
      if (resp.data.sessions.length > 0) {
        // Don't auto-switch if we already have one
        if (!currentSessionId) setCurrentSessionId(resp.data.sessions[0].id);
      } else {
        createNewSession(dir);
      }
    } catch (err) {
      console.error("Error fetching sessions");
    }
  };

  const createNewSession = async (dir: string) => {
    try {
      const resp = await axios.post(`${API_BASE}/sessions`, { directory_path: dir });
      const newSid = resp.data.session_id;
      setCurrentSessionId(newSid);
      const sessionResp = await axios.get(`${API_BASE}/sessions/${newSid}`);
      setSessions(prev => [sessionResp.data, ...prev]);
    } catch (err) {
      alert("Error creating session");
    }
  };

  const handleIndex = async (path: string) => {
    if (!path.trim()) return;
    setIndexStats({ indexing: true, path });
    try {
      await axios.post(`${API_BASE}/index`, { directory_path: path });
      setActiveDirectory(path);
      fetchSessions(path);
      setIndexModalOpen(false);
      setIsPickerMode(false);
      setManualPath('');
      setActiveTab('chat');
    } catch (err) {
      alert('Error indexing directory');
    } finally {
      setIndexStats({ indexing: false, path: '' });
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0a] text-white overflow-hidden font-sans">
      {/* Index Modal */}
      <AnimatePresence>
        {isIndexModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-morphism p-8 w-full max-w-md border border-white/10"
            >
              <h3 className="text-xl font-bold mb-4">Index New Directory</h3>

              {!isPickerMode ? (
                <>
                  <p className="text-white/50 text-sm mb-6">Enter an absolute path or use the browser to select a folder on your PC.</p>
                  <div className="space-y-4 mb-6">
                    <input
                      value={manualPath}
                      onChange={e => setManualPath(e.target.value)}
                      placeholder="/home/user/documents"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500"
                    />
                    <button
                      onClick={() => setIsPickerMode(true)}
                      className="w-full py-3 bg-white/5 border border-white/10 hover:bg-white/10 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold transition-all"
                    >
                      <Folder size={18} className="text-primary-400" />
                      Browse PC Directories
                    </button>
                  </div>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setIndexModalOpen(false)}
                      className="flex-1 py-2 text-white/60 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleIndex(manualPath)}
                      className="flex-1 py-2 bg-primary-600 rounded-lg font-bold"
                    >
                      Start Indexing
                    </button>
                  </div>
                </>
              ) : (
                <DirectoryPicker
                  onSelect={handleIndex}
                  onCancel={() => setIsPickerMode(false)}
                />
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar - FIXED WIDTH, NO TOGGLE */}
      <aside className="glass-morphism w-[280px] h-[calc(100vh-2rem)] m-4 flex flex-col py-8 z-20 relative px-4 shrink-0">
        <div className="flex flex-col gap-6 w-full">
          <NavItem
            icon={<Home />}
            label="Dashboard"
            active={activeTab === 'chat'}
            onClick={() => setActiveTab('chat')}
            expanded={true}
          />
          <NavItem
            icon={<Folder />}
            label="Files"
            active={activeTab === 'files'}
            onClick={() => setActiveTab('files')}
            expanded={true}
          />
          <div className="mt-auto pt-6 border-t border-white/10">
            {activeTab === 'chat' && activeDirectory && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3 px-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Past Chats</span>
                  <button onClick={() => createNewSession(activeDirectory)} className="p-1 hover:bg-white/10 rounded-md text-primary-400 transition-all">
                    <Send size={12} className="-rotate-45" />
                  </button>
                </div>
                <div className="space-y-1 max-h-[250px] overflow-y-auto custom-scrollbar px-1">
                  {sessions.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setCurrentSessionId(s.id)}
                      className={twMerge(
                        "w-full text-left p-2.5 rounded-xl text-xs truncate transition-all",
                        currentSessionId === s.id ? "bg-primary-500/20 text-primary-400 border border-primary-500/20" : "text-white/40 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <NavItem
              icon={<SettingsIcon size={20} />}
              label="Settings"
              active={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
              expanded={true}
            />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto p-8 relative">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              Local Intelligence
            </h1>
            {activeDirectory ? (
              <div className="flex items-center gap-2 mt-2 px-3 py-1.5 bg-primary-500/10 border border-primary-500/20 rounded-xl w-fit">
                <Folder size={14} className="text-primary-400" />
                <span className="text-sm font-bold text-primary-400 truncate max-w-[300px]">{activeDirectory.split('/').pop()}</span>
                <span className="text-[10px] text-white/20 font-mono hidden md:inline ml-2">{activeDirectory}</span>
              </div>
            ) : (
              <p className="text-white/50 mt-2 italic font-medium">Simple. Private. Powerful.</p>
            )}
            <div className="mt-4 flex gap-2">
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 bg-primary-500/10 rounded border border-primary-500/20 text-primary-400/80 font-bold">Privacy First</span>
              <span className="text-[10px] uppercase tracking-widest px-2 py-0.5 bg-primary-500/10 rounded border border-primary-500/20 text-primary-400/80 font-bold">Local RAG</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setIndexModalOpen(true)}
              className="px-6 py-2.5 bg-primary-600 hover:bg-primary-500 rounded-xl transition-all font-bold flex items-center gap-2 shadow-lg shadow-primary-900/20"
            >
              <Folder size={18} />
              Add Folder
            </button>
          </div>
        </header>

        <section className="max-w-5xl mx-auto h-[calc(100vh-16rem)] flex flex-col">
          {activeTab === 'chat' && <ChatInterface activeDirectory={activeDirectory} sessionId={currentSessionId} />}
          {activeTab === 'files' && <FileManager />}
          {activeTab === 'settings' && <SettingsView />}
        </section>

        {indexStats.indexing && (
          <div className="absolute top-4 right-8 glass-morphism px-4 py-2 flex items-center gap-3 text-sm animate-pulse">
            <Loader2 className="animate-spin text-primary-400" size={16} />
            Indexing: {indexStats.path}
          </div>
        )}
      </main>
    </div>
  );
}

function NavItem({ icon, label, active, onClick, expanded }: { icon: any, label: string, active: boolean, onClick: () => void, expanded: boolean }) {
  return (
    <button
      onClick={onClick}
      className={twMerge(
        "flex items-center gap-4 p-3 rounded-xl transition-all w-full",
        active ? "bg-primary-500/20 text-primary-400 border border-primary-500/30" : "text-white/60 hover:text-white hover:bg-white/5"
      )}
    >
      <div className="min-w-[24px]">{icon}</div>
      {expanded && <span className="font-medium whitespace-nowrap">{label}</span>}
    </button>
  );
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
}

function ChatInterface({ activeDirectory, sessionId }: { activeDirectory: string, sessionId: string }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I can help you analyze your local files. Start by indexing a folder or ask me anything if you\'ve already done so.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchHistory();
    } else {
      setMessages([{ role: 'assistant', content: 'Hello! Please select a folder to start chatting.' }]);
    }
  }, [sessionId]);

  const fetchHistory = async () => {
    try {
      const resp = await axios.get(`${API_BASE}/sessions/${sessionId}`);
      if (resp.data.messages.length > 0) {
        setMessages(resp.data.messages);
      } else {
        setMessages([{ role: 'assistant', content: `Start chatting about ${activeDirectory.split('/').pop()}` }]);
      }
    } catch (err) {
      console.error("Error fetching history");
    }
  };

  const clearChat = async () => {
    if (!sessionId) return;
    try {
      await axios.delete(`${API_BASE}/sessions/${sessionId}`);
      setMessages([{ role: 'assistant', content: 'Chat history cleared. Start fresh!' }]);
    } catch (err) {
      alert('Error clearing chat');
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeDirectory) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const resp = await axios.post(`${API_BASE}/query`, {
        text: input,
        session_id: sessionId,
        directory_path: activeDirectory
      });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: resp.data.answer,
        sources: resp.data.sources
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'An error occurred. Please check your API key or Local Model settings.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'docx') => {
    if (messages.length < 2) return;
    const lastUserQuery = [...messages].reverse().find(m => m.role === 'user')?.content;
    if (!lastUserQuery) return;

    try {
      const resp = await axios.post(`${API_BASE}/export?format=${format}`,
        { text: lastUserQuery },
        { responseType: 'blob' }
      );
      const url = window.URL.createObjectURL(new Blob([resp.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Error exporting document');
    }
  };

  return (
    <div className="flex-1 flex flex-col glass-morphism p-6 h-full relative overflow-hidden">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-white/60">AI Conversation</h3>
          <button
            onClick={clearChat}
            className="text-[10px] font-black uppercase tracking-widest px-2 py-1 bg-white/5 hover:bg-white/10 rounded-md text-white/40 transition-all border border-white/5"
          >
            Clear History
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('pdf')}
            className="text-xs px-3 py-1 glass-morphism hover:bg-white/10 flex items-center gap-1"
          >
            <FileText size={12} /> PDF
          </button>
          <button
            onClick={() => handleExport('docx')}
            className="text-xs px-3 py-1 glass-morphism hover:bg-white/10 flex items-center gap-1"
          >
            <FileText size={12} /> Word
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-6 pb-24 pr-2">
        {messages.map((msg, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            key={i}
            className={twMerge(
              "flex flex-col max-w-[80%]",
              msg.role === 'user' ? "ml-auto items-end" : "items-start"
            )}
          >
            <div className={twMerge(
              "p-4 rounded-2xl",
              msg.role === 'user' ? "bg-primary-600 text-white rounded-tr-none" : "bg-white/5 border border-white/10 rounded-tl-none"
            )}>
              {msg.content}
            </div>
            {msg.sources && msg.sources.length > 0 && (
              <div className="mt-2 text-xs text-white/30 truncate max-w-full">
                Sources: {msg.sources.map((s: string) => s.split('/').pop()).join(', ')}
              </div>
            )}
          </motion.div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-2 text-primary-400">
            <Loader2 className="animate-spin" size={18} />
            <span className="text-sm">Thinking...</span>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 left-6 right-6 flex gap-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyPress={e => e.key === 'Enter' && sendMessage()}
          placeholder="Ask about your data..."
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:outline-none focus:border-primary-500 transition-all"
        />
        <button
          onClick={sendMessage}
          disabled={isLoading}
          className="p-3 bg-primary-600 rounded-xl hover:bg-primary-500 transition-all disabled:opacity-50"
        >
          <Send size={24} />
        </button>
      </div>
    </div>
  );
}

function FileManager() {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const resp = await axios.get(`${API_BASE}/files`);
        setFiles(resp.data.files);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFiles();
  }, []);

  return (
    <div className="flex-1 glass-morphism p-8 overflow-y-auto">
      <h2 className="text-2xl font-semibold mb-6">Indexed Files</h2>
      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-primary-500" size={48} /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {files.map((file, i) => (
            <div key={i} className="p-4 bg-white/5 border border-white/10 rounded-xl flex items-center gap-4 group hover:border-primary-500/50 transition-all">
              <FileText className="text-primary-400" />
              <div className="truncate">
                <div className="font-medium truncate">{file}</div>
                <div className="text-xs text-white/30">Local Document</div>
              </div>
            </div>
          ))}
          {files.length === 0 && <div className="col-span-full text-center py-12 text-white/30 italic">No files indexed yet.</div>}
        </div>
      )}
    </div>
  );
}

const FREE_MODELS = [
  { name: 'Gemini 2.0 Flash (Fastest)', id: 'google/gemini-2.0-flash-exp:free' },
  { name: 'Mistral Small 24B', id: 'mistralai/mistral-small-24b-instruct-2501:free' },
  { name: 'Llama 3.3 70B', id: 'meta-llama/llama-3.3-70b-instruct:free' },
  { name: 'Qwen 2 72B', id: 'qwen/qwen-2-72b-instruct:free' },
];

function SettingsView() {
  const [mode, setMode] = useState<'LOCAL' | 'OPENROUTER' | 'GEMINI'>('LOCAL');
  const [cloudMode, setCloudMode] = useState<'OPENROUTER' | 'GEMINI'>('GEMINI');
  const [apiKey, setApiKey] = useState('');
  const [localModel, setLocalModel] = useState('llama3');
  const [selectedFreeModel, setSelectedFreeModel] = useState(FREE_MODELS[0].id);
  const [activeBackendMode, setActiveBackendMode] = useState<string>('LOCAL');

  // Auto-detect key type and switch tabs + mode
  useEffect(() => {
    if (apiKey.startsWith('sk-or-')) {
      setCloudMode('OPENROUTER');
      setMode('OPENROUTER'); // Auto-enable cloud if key is pasted
    } else if (apiKey.startsWith('AIza')) {
      setCloudMode('GEMINI');
      setMode('GEMINI'); // Auto-enable cloud if key is pasted
    }
  }, [apiKey]);

  const saveSettings = async () => {
    try {
      const resp = await axios.post(`${API_BASE}/settings`, {
        mode,
        openrouter_key: (mode === 'OPENROUTER' || (mode === 'LOCAL' && cloudMode === 'OPENROUTER')) ? apiKey : '',
        gemini_key: (mode === 'GEMINI' || (mode === 'LOCAL' && cloudMode === 'GEMINI')) ? apiKey : '',
        openrouter_model: selectedFreeModel,
        local_model: localModel
      });
      setActiveBackendMode(mode);
      alert(`Settings saved! Active Mode: ${mode}`);
    } catch (err) {
      alert('Error saving settings');
    }
  };

  const isGeminiKey = apiKey.startsWith('AIza');
  const isOpenRouterKey = apiKey.startsWith('sk-or-');
  const keyWarning = (cloudMode === 'GEMINI' && isOpenRouterKey) || (cloudMode === 'OPENROUTER' && isGeminiKey);

  return (
    <div className="flex-1 glass-morphism p-8 max-w-2xl mx-auto w-full overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-2xl font-bold flex items-center gap-3">Settings</h2>
        <div className="px-3 py-1 bg-primary-500/10 border border-primary-500/20 rounded-full text-[10px] font-black text-primary-400 uppercase tracking-widest">
          Active: {activeBackendMode}
        </div>
      </div>

      <div className="space-y-12">
        {/* AI Keys Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black text-primary-400 uppercase tracking-[0.3em]">AI API Configuration</h3>
            {keyWarning && (
              <span className="text-[10px] font-bold text-red-400 animate-pulse uppercase tracking-tight">⚠️ Key type mismatch</span>
            )}
          </div>

          <div className="space-y-6 bg-white/5 p-8 rounded-3xl border border-white/10 shadow-inner">
            <div className="flex gap-2 mb-4">
              {(['OPENROUTER', 'GEMINI'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => {
                    setCloudMode(m);
                    if (mode !== 'LOCAL') setMode(m);
                  }}
                  className={twMerge(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    cloudMode === m ? "bg-primary-600 text-white" : "bg-white/5 text-white/40 hover:bg-white/10"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">
                {cloudMode === 'GEMINI' ? 'Gemini API Key (AI Studio)' : 'OpenRouter Key'}
              </label>
              <input
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                type="password"
                placeholder={cloudMode === 'GEMINI' ? "AIza..." : "sk-or-..."}
                className={twMerge(
                  "w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-primary-500 outline-none text-sm font-medium transition-all",
                  keyWarning ? "border-red-500/50" : ""
                )}
              />
              {keyWarning && (
                <p className="text-[10px] text-red-400 font-medium">It looks like you're using {isGeminiKey ? 'a Gemini' : 'an OpenRouter'} key in the wrong tab!</p>
              )}
            </div>

            {cloudMode === 'OPENROUTER' && (
              <div className="space-y-3 pt-4 border-t border-white/5">
                <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Free Model Presets</label>
                <select
                  value={selectedFreeModel}
                  onChange={e => setSelectedFreeModel(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 outline-none text-sm font-medium text-white/80 appearance-none cursor-pointer focus:border-primary-500"
                >
                  {FREE_MODELS.map(m => (
                    <option key={m.id} value={m.id} className="bg-[#1a1a1a] text-white">{m.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </section>

        {/* Local AI Section */}
        <section className="space-y-6">
          <h3 className="text-[10px] font-black text-primary-400 uppercase tracking-[0.3em]">Local Intelligence</h3>
          <div className="bg-white/5 p-8 rounded-3xl border border-white/10 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-black uppercase tracking-tight">Run Local Ollama</span>
                <span className="text-[10px] font-medium text-white/20">Private & Secure indexing</span>
              </div>
              <button
                onClick={() => setMode(mode === 'LOCAL' ? cloudMode : 'LOCAL')}
                className={twMerge(
                  "w-14 h-7 rounded-full transition-all relative border border-white/10 shadow-lg",
                  mode === 'LOCAL' ? "bg-primary-600 shadow-primary-900/40" : "bg-white/5"
                )}
              >
                <div className={twMerge(
                  "absolute top-1 w-5 h-5 bg-white rounded-full transition-all shadow-md",
                  mode === 'LOCAL' ? "left-8" : "left-1"
                )} />
              </button>
            </div>

            {mode === 'LOCAL' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-6 border-t border-white/5">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-white/30 uppercase tracking-widest">Local Model</label>
                  <input value={localModel} onChange={e => setLocalModel(e.target.value)} type="text" placeholder="llama3" className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:border-primary-500 outline-none text-sm font-medium" />
                </div>
              </motion.div>
            )}
          </div>
        </section>

        <button
          onClick={saveSettings}
          className="w-full py-5 bg-primary-600 hover:bg-primary-500 rounded-3xl font-black uppercase tracking-[0.2em] text-xs shadow-2xl shadow-primary-900/60 transition-all active:scale-[0.97]"
        >
          Confirm Setup
        </button>
      </div>
    </div>
  );
}

export default App;
