import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { CheckCircle2, Clock, AlertCircle, Plus, RefreshCw, Link2 } from 'lucide-react';
import Papa from 'papaparse';

export default function App() {
  // --- STATE DECLARATIONS ---
  const [dataPoints, setDataPoints] = useState(() => {
    const saved = localStorage.getItem('ops_metrics');
    return saved ? JSON.parse(saved) : [
      { month: 'Jan', records: 420 },
      { month: 'Feb', records: 680 },
      { month: 'Mar', records: 950 },
    ];
  });

  const [tasks, setTasks] = useState(() => {
    const saved = localStorage.getItem('ops_tasks');
    return saved ? JSON.parse(saved) : [
      { id: 1, title: 'Routine Data Quality Audit (RDQA)', status: 'Completed' },
      { id: 2, title: 'Upload CAPI SurveyCTO clean dataset', status: 'In Progress' },
    ];
  });

  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem('sync_sheet_url') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [newTask, setNewTask] = useState('');
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);

  // --- PERSISTENCE EFFECTS ---
  useEffect(() => {
    localStorage.setItem('ops_metrics', JSON.stringify(dataPoints));
  }, [dataPoints]);

  useEffect(() => {
    localStorage.setItem('ops_tasks', JSON.stringify(tasks));
  }, [tasks]);

  // --- DATA SYNC LOGIC ---
  const syncFromLiveSheet = async (urlToFetch) => {
    const targetUrl = urlToFetch || sheetUrl;
    if (!targetUrl.trim()) return;

    setIsSyncing(true);
    try {
      const response = await fetch(targetUrl);
      const csvText = await response.text();

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsed = results.data
            .filter((row) => row.month && row.records)
            .map((row) => ({
              month: String(row.month).trim(),
              records: Number(row.records),
            }));

          if (parsed.length > 0) {
            setDataPoints(parsed);
            setLastSyncTime(new Date().toLocaleTimeString());
            localStorage.setItem('sync_sheet_url', targetUrl);
          }
          setIsSyncing(false);
        },
        error: () => setIsSyncing(false),
      });
    } catch (err) {
      console.error('Failed to sync live data:', err);
      setIsSyncing(false);
    }
  };

  // --- AUTO-SYNC INTERVAL (EVERY 30 SECONDS) ---
  useEffect(() => {
    if (!autoSyncEnabled || !sheetUrl.trim()) return;

    syncFromLiveSheet(sheetUrl);

    const intervalId = setInterval(() => {
      syncFromLiveSheet(sheetUrl);
    }, 30000);

    return () => clearInterval(intervalId);
  }, [sheetUrl, autoSyncEnabled]);

  // --- CALCULATIONS & HANDLERS ---
  const totalRecords = dataPoints.reduce((sum, item) => sum + Number(item.records || 0), 0);

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setTasks([...tasks, { id: Date.now(), title: newTask, status: 'Pending' }]);
    setNewTask('');
  };

  const toggleTaskStatus = (id) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        const next = t.status === 'Completed' ? 'Pending' : t.status === 'Pending' ? 'In Progress' : 'Completed';
        return { ...t, status: next };
      }
      return t;
    }));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Health Operations & Data Tracker</h1>
            <p className="text-sm text-slate-500">Live cloud sync with Google Sheets & CAPI endpoints</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Auto-Sync Toggle Button */}
            <button
              onClick={() => setAutoSyncEnabled(!autoSyncEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${autoSyncEnabled
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-slate-100 text-slate-600 border-slate-300'
                }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${autoSyncEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                  }`}
              />
              {autoSyncEnabled ? 'Auto-sync: 30s' : 'Auto-sync: Off'}
            </button>

            {/* Manual Sync Button */}
            <button
              onClick={() => syncFromLiveSheet()}
              disabled={isSyncing || !sheetUrl}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-900 text-white rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-50 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </header>

        {/* Live Cloud Data Link Bar */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-2 w-full md:w-3/4">
            <Link2 className="w-5 h-5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Paste Google Sheets 'Publish to web' CSV link here..."
              value={sheetUrl}
              onChange={(e) => setSheetUrl(e.target.value)}
              className="w-full text-xs px-3 py-2 border rounded-lg focus:ring-1 focus:ring-blue-900 outline-none"
            />
          </div>
          <button
            onClick={() => syncFromLiveSheet(sheetUrl)}
            className="w-full md:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold whitespace-nowrap transition"
          >
            Connect Cloud Sheet
          </button>
        </div>

        {/* Metric Cards & Data Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Total Aggregated Entries</span>
              <span className="text-4xl font-extrabold text-blue-950 my-2 block">
                {totalRecords.toLocaleString()}
              </span>
              <p className="text-xs text-slate-500">
                {lastSyncTime ? `Last synced with cloud at ${lastSyncTime}` : 'Loaded from cached records'}
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 text-xs text-slate-600 space-y-1">
              <span className="font-semibold block text-slate-700">Cloud Status</span>
              <p>• Rows synced: <span className="font-medium text-blue-900">{dataPoints.length}</span></p>
              <p>• Data connection: <span className="font-medium text-emerald-700">{sheetUrl ? 'Connected' : 'Standalone'}</span></p>
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm col-span-2">
            <h3 className="text-sm font-bold text-slate-700 mb-4">Data Collection Velocity (Cloud Stream)</h3>
            <div className="h-56 w-full">
              {dataPoints.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dataPoints}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="records" stroke="#0284c7" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-sm text-slate-400">
                  Connect a published Google Sheet to populate data.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Task Management Panel */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Milestone Action Tracker</h2>

          <form onSubmit={handleAddTask} className="flex gap-2 mb-6">
            <input
              type="text"
              placeholder="Add a new supervisory action or milestone..."
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="flex-1 px-4 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
            <button type="submit" className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition">
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </form>

          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => toggleTaskStatus(task.id)}
                className="flex items-center justify-between p-3.5 rounded-lg border border-slate-100 hover:bg-slate-50 cursor-pointer transition"
              >
                <span className={`text-sm font-medium ${task.status === 'Completed' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                  {task.title}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${task.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' :
                    task.status === 'In Progress' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {task.status === 'Completed' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {task.status === 'In Progress' && <Clock className="w-3.5 h-3.5" />}
                  {task.status === 'Pending' && <AlertCircle className="w-3.5 h-3.5" />}
                  {task.status}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}