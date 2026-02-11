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
      <div className="flex items-center gap-2 mb-4 p-2 bg-white/5 rounded-lg text-xs font-mono truncate">
        <Folder size={14} className="text-primary-400 shrink-0" />
        <span className="truncate text-white/60">{currentPath}</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 mb-4 pr-2 custom-scrollbar">
        {currentPath !== parentPath && (
          <button
            onClick={() => fetchDocs(parentPath)}
            className="w-full text-left p-2 hover:bg-white/5 rounded-lg flex items-center gap-2 text-sm text-white/40 italic"
          >
            .. (Back)
          </button>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="animate-spin text-primary-500" /></div>
        ) : (
          items.map((item, i) => (
            <button
              key={i}
              onClick={() => item.is_directory ? fetchDocs(item.path) : null}
              className={twMerge(
                "w-full text-left p-2 rounded-lg flex items-center gap-3 text-sm transition-all",
                item.is_directory ? "hover:bg-white/10 text-white/80" : "opacity-40 cursor-default"
              )}
            >
              <Folder size={16} className={item.is_directory ? "text-primary-400" : "text-white/20"} />
              <span className="truncate">{item.name}</span>
            </button>
          ))
        )}
      </div>

      <div className="flex gap-4 pt-4 border-t border-white/10">
        <button
          onClick={onCancel}
          className="flex-1 py-2 text-white/60 hover:text-white"
        >
          Cancel
        </button>
        <button
          onClick={() => onSelect(currentPath)}
          className="flex-1 py-2 bg-primary-600 rounded-lg font-bold hover:bg-primary-500 transition-all"
        >
          Select Folder
        </button>
      </div>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isIndexModalOpen, setIndexModalOpen] = useState(false);
  const [isPickerMode, setIsPickerMode] = useState(false);
  const [manualPath, setManualPath] = useState('');
  const [indexStats, setIndexStats] = useState({ indexing: false, path: '' });

  const handleIndex = async (path: string) => {
    if (!path.trim()) return;
    setIndexStats({ indexing: true, path });
    try {
      await axios.post(`${API_BASE}/index`, { directory_path: path });
      setIndexModalOpen(false);
      setIsPickerMode(false);
      setManualPath('');
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
                      className="w-full py-2 bg-white/5 border border-white/10 hover:bg-white/10 rounded-lg flex items-center justify-center gap-2 text-sm transition-all"
                    >
                      <Folder size={16} className="text-primary-400" />
                      Browse Files
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

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 260 : 80 }}
        className="glass-morphism h-[calc(100vh-2rem)] m-4 flex flex-col items-center py-8 z-20 relative"
      >
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-10 bg-primary-600 rounded-full p-1 border border-white/20 hover:scale-110 transition-transform z-30"
        >
          <SettingsIcon size={14} className={isSidebarOpen ? "rotate-180" : ""} />
        </button>
        <div className="flex flex-col gap-6 w-full px-4">
          <NavItem
            icon={<Home />}
            label="Dashboard"
            active={activeTab === 'chat'}
            onClick={() => setActiveTab('chat')}
            expanded={isSidebarOpen}
          />
          <NavItem
            icon={<Folder />}
            label="Files"
            active={activeTab === 'files'}
            onClick={() => setActiveTab('files')}
            expanded={isSidebarOpen}
          />
          <div className="mt-auto pt-6 border-t border-white/10">
            <NavItem
              icon={<SettingsIcon />}
              label="Settings"
              active={activeTab === 'settings'}
              onClick={() => setActiveTab('settings')}
              expanded={isSidebarOpen}
            />
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className="flex-1 h-screen overflow-y-auto p-8 relative">
        <header className="mb-12 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              MCP-LiteLabs
            </h1>
            <p className="text-white/50 mt-2">Secure Local Data Intelligence Powered by MCP</p>
            <div className="mt-4 flex gap-2">
              <span className="text-xs px-2 py-1 bg-white/5 rounded border border-white/10 text-white/40">Privacy First</span>
              <span className="text-xs px-2 py-1 bg-white/5 rounded border border-white/10 text-white/40">Local RAG</span>
              <span className="text-xs px-2 py-1 bg-white/5 rounded border border-white/10 text-white/40">Offline Mode</span>
            </div>
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setIndexModalOpen(true)}
              className="px-6 py-2 glass-morphism hover:bg-white/10 transition-all font-semibold flex items-center gap-2"
            >
              <Folder size={18} />
              New Index
            </button>
          </div>
        </header>

        <section className="max-w-5xl mx-auto h-[calc(100vh-16rem)] flex flex-col">
          {activeTab === 'chat' && <ChatInterface />}
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

function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hello! I can help you analyze your local files. Start by indexing a folder or ask me anything if you\'ve already done so.' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const resp = await axios.post(`${API_BASE}/query`, { text: input });
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: resp.data.answer,
        sources: resp.data.sources
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error connecting to the backend.' }]);
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
        <h3 className="font-semibold text-white/60">AI Conversation</h3>
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

function SettingsView() {
  const [mode, setMode] = useState<'LOCAL' | 'CLOUD' | 'OPENROUTER'>('LOCAL');
  const [openaiKey, setOpenaiKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [openrouterModel, setOpenrouterModel] = useState('google/gemini-2.0-flash-exp:free');
  const [localModel, setLocalModel] = useState('llama3');

  const saveSettings = async () => {
    try {
      await axios.post(`${API_BASE}/settings`, {
        mode,
        openai_key: openaiKey,
        openrouter_key: openrouterKey,
        openrouter_model: openrouterModel,
        local_model: localModel
      });
      alert('Settings applied successfully!');
    } catch (err) {
      alert('Error saving settings');
    }
  };

  const freeModels = [
    { name: 'Gemini 2.0 Flash (Free)', id: 'google/gemini-2.0-flash-exp:free' },
    { name: 'Llama 3.1 8B (Free)', id: 'meta-llama/llama-3.1-8b-instruct:free' },
    { name: 'Mistral 7B (Free)', id: 'mistralai/mistral-7b-instruct:free' },
  ];

  return (
    <div className="flex-1 glass-morphism p-8 max-w-2xl mx-auto w-full overflow-y-auto custom-scrollbar">
      <h2 className="text-2xl font-semibold mb-8 flex items-center gap-3">
        <SettingsIcon className="text-primary-400" />
        System Settings
      </h2>

      <div className="space-y-10">
        <div className="space-y-4">
          <label className="text-sm font-medium text-white/60 uppercase tracking-wider">Intelligence Source</label>
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setMode('LOCAL')}
              className={twMerge(
                "py-3 rounded-xl border transition-all text-sm font-bold",
                mode === 'LOCAL' ? "bg-primary-600 border-primary-500 shadow-lg" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
              )}
            >
              Ollama
            </button>
            <button
              onClick={() => setMode('OPENROUTER')}
              className={twMerge(
                "py-3 rounded-xl border transition-all text-sm font-bold",
                mode === 'OPENROUTER' ? "bg-primary-600 border-primary-500 shadow-lg" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
              )}
            >
              OpenRouter
            </button>
            <button
              onClick={() => setMode('CLOUD')}
              className={twMerge(
                "py-3 rounded-xl border transition-all text-sm font-bold",
                mode === 'CLOUD' ? "bg-primary-600 border-primary-500 shadow-lg" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
              )}
            >
              Direct AI
            </button>
          </div>
        </div>

        {mode === 'LOCAL' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/40">Ollama API URL</label>
              <input type="text" defaultValue="http://localhost:11434/v1" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-primary-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/40">Model Name</label>
              <input value={localModel} onChange={e => setLocalModel(e.target.value)} type="text" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-primary-500 outline-none" />
            </div>
          </motion.div>
        )}

        {mode === 'OPENROUTER' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/40">OpenRouter API Key (Free)</label>
              <input value={openrouterKey} onChange={e => setOpenrouterKey(e.target.value)} type="password" placeholder="sk-or-v1-..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-primary-500 outline-none" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/40">Select Free Model</label>
              <div className="grid grid-cols-1 gap-2">
                {freeModels.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setOpenrouterModel(m.id)}
                    className={twMerge(
                      "text-left px-4 py-3 rounded-xl border text-sm transition-all",
                      openrouterModel === m.id ? "bg-white/10 border-primary-500" : "bg-white/5 border-white/10 text-white/40 hover:bg-white/10"
                    )}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {mode === 'CLOUD' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-white/40">OpenAI API Key</label>
              <input value={openaiKey} onChange={e => setOpenaiKey(e.target.value)} type="password" placeholder="sk-..." className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus:border-primary-500 outline-none" />
            </div>
          </motion.div>
        )}

        <button
          onClick={saveSettings}
          className="w-full py-4 mt-8 bg-primary-600 hover:bg-primary-500 rounded-2xl font-bold shadow-xl shadow-primary-900/20 transition-all flex items-center justify-center gap-2"
        >
          <FileText size={20} />
          Apply Configuration
        </button>

        <div className="p-4 bg-primary-500/10 border border-primary-500/20 rounded-2xl text-xs text-primary-400/80 italic">
          Tip: OpenRouter Free models are perfect for local data analysis without subscription costs.
          Make sure to get a free key from OpenRouter.ai.
        </div>
      </div>
    </div>
  );
}

export default App;
