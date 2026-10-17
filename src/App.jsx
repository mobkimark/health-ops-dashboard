import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend
} from 'recharts';
import {
  CheckCircle2, Clock, AlertCircle, RefreshCw, Lock, LogOut,
  LayoutDashboard, Activity, HeartHandshake, Users, ArrowUpRight, CheckSquare, AlertTriangle
} from 'lucide-react';
import Papa from 'papaparse';

// ==========================================
// PASTE YOUR PUBLISHED GOOGLE SHEET CSV LINK HERE
// ==========================================
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTd1xCoJK85LdFkRfpJFv19rLxh3tgJA8qv91oADnUaewOnA9gqiG8JyYZG2eZfWamTBAXpv4VfMdTw/pub?output=csv";
const TEAM_ACCESS_CODE = "MOBKI081";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => sessionStorage.getItem('ops_auth') === 'true');
  const [passcodeInput, setPasscodeInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [activeTab, setActiveTab] = useState('summary');

  // Dashboard state fed entirely from Google Sheet
  const [healthData, setHealthData] = useState([]);
  const [protectionData, setProtectionData] = useState([]);
  const [youthData, setYouthData] = useState([]);
  const [sheetTasks, setSheetTasks] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  // Parse raw sheet rows into corresponding project data and tasks
  const parseSheetData = (rows) => {
    const health = [];
    const protection = [];
    const youth = [];
    const tasks = [];

    rows.forEach((row, idx) => {
      const type = (row.type || '').trim().toLowerCase();
      const proj = (row.project || '').trim().toLowerCase();

      if (type === 'metric') {
        const entry = {
          period: row.period || `P${idx}`,
          metric1: Number(row.metric1_val || 0),
          metric2: Number(row.metric2_val || 0),
          metric3: Number(row.metric3_val || 0),
          label1: row.metric1_label || 'Metric 1',
          label2: row.metric2_label || 'Metric 2',
          label3: row.metric3_label || 'Metric 3',
        };

        if (proj === 'health') health.push(entry);
        else if (proj === 'protection') protection.push(entry);
        else if (proj === 'youth') youth.push(entry);
      } else if (type === 'task') {
        tasks.push({
          id: idx + 1,
          project: proj || 'health',
          title: row.period || row.metric1_label || 'Untitled task',
          status: row.status ? row.status.trim() : 'Pending'
        });
      }
    });

    setHealthData(health);
    setProtectionData(protection);
    setYouthData(youth);
    setSheetTasks(tasks);
  };

  const fetchLiveSheet = async () => {
    if (!SHEET_CSV_URL || SHEET_CSV_URL.includes("SampleLinkHere")) {
      setFetchError("Please set your published Google Sheets CSV URL in src/App.jsx");
      return;
    }

    setIsSyncing(true);
    setFetchError(null);

    try {
      const response = await fetch(SHEET_CSV_URL);
      if (!response.ok) throw new Error("Could not reach Google Sheets endpoint");
      const csvText = await response.text();

      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          if (results.data && results.data.length > 0) {
            parseSheetData(results.data);
            setLastSyncTime(new Date().toLocaleTimeString());
          }
          setIsSyncing(false);
        },
        error: (err) => {
          setFetchError("CSV parsing error: " + err.message);
          setIsSyncing(false);
        }
      });
    } catch (err) {
      setFetchError(err.message);
      setIsSyncing(false);
    }
  };

  // Auto-sync polling every 30 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchLiveSheet();
    const interval = setInterval(fetchLiveSheet, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Auth Handlers
  const handleLogin = (e) => {
    e.preventDefault();
    if (passcodeInput.trim() === TEAM_ACCESS_CODE) {
      sessionStorage.setItem('ops_auth', 'true');
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('ops_auth');
    setIsAuthenticated(false);
    setPasscodeInput('');
  };

  // Calculations across Google Sheet data
  const totalClinics = healthData.reduce((sum, r) => sum + r.metric1, 0);
  const totalProtectionReach = protectionData.reduce((sum, r) => sum + r.metric1, 0);
  const totalYouthParticipants = youthData.reduce((sum, r) => sum + r.metric1, 0);
  const totalTasksCompleted = sheetTasks.filter(t => t.status.toLowerCase() === 'completed').length;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200">
          <div className="w-12 h-12 bg-blue-50 text-blue-900 rounded-xl flex items-center justify-center mb-4">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Restricted Field Portal</h2>
          <p className="text-xs text-slate-500 mb-6">Enter team passcode to view sheet data</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <input
                type="password"
                placeholder="Enter passcode..."
                value={passcodeInput}
                onChange={(e) => { setPasscodeInput(e.target.value); setAuthError(false); }}
                className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-900 outline-none"
                autoFocus
              />
              {authError && (
                <p className="text-xs text-rose-600 mt-1.5 font-medium">Incorrect passcode. Try again.</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-950 text-white font-medium rounded-lg text-sm hover:bg-blue-900 transition"
            >
              Access Tracker
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col md:flex-row">

      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0">
        <div>
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-lg font-bold text-white tracking-wide">Operations Tracker</h1>
            <p className="text-xs text-slate-400 mt-0.5">Direct Google Sheet Stream</p>
          </div>

          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('summary')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'summary' ? 'bg-blue-900 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Executive Summary
            </button>

            <div className="pt-4 pb-2 px-3 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Project Streams
            </div>

            <button
              onClick={() => setActiveTab('health')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'health' ? 'bg-blue-900 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
            >
              <Activity className="w-4 h-4 text-emerald-400" />
              Primary Health & Clinics
            </button>

            <button
              onClick={() => setActiveTab('protection')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'protection' ? 'bg-blue-900 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
            >
              <HeartHandshake className="w-4 h-4 text-rose-400" />
              Protection & Rights
            </button>

            <button
              onClick={() => setActiveTab('youth')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition ${activeTab === 'youth' ? 'bg-blue-900 text-white' : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
            >
              <Users className="w-4 h-4 text-amber-400" />
              Youth & Governance
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 text-xs text-slate-400 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-amber-400' : 'bg-emerald-500 animate-pulse'}`} />
              Sheet Polling: 30s
            </span>
            <button onClick={fetchLiveSheet} title="Force Sync" className="p-1 hover:text-white">
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>
          </div>
          <p className="text-[11px] truncate">Last sync: {lastSyncTime || 'Pending connection'}</p>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
          >
            <LogOut className="w-3.5 h-3.5" /> Lock Session
          </button>
        </div>
      </aside>

      {/* MAIN VIEWPORT */}
      <main className="flex-1 p-6 md:p-8 overflow-y-auto space-y-6">

        {fetchError && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{fetchError}</span>
          </div>
        )}

        {/* VIEW 1: EXECUTIVE SUMMARY */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">Organizational Performance Overview</h2>
              <p className="text-sm text-slate-500">Live operational aggregates calculated from Google Sheets</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase">Health Audits</span>
                <p className="text-3xl font-extrabold text-slate-900 my-1">{totalClinics.toLocaleString()}</p>
                <span className="text-xs text-emerald-600 font-medium">PHC facilities monitored</span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase">Protection Reach</span>
                <p className="text-3xl font-extrabold text-slate-900 my-1">{totalProtectionReach.toLocaleString()}</p>
                <span className="text-xs text-rose-600 font-medium">Individuals sensitized</span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase">Youth Enrolled</span>
                <p className="text-3xl font-extrabold text-slate-900 my-1">{totalYouthParticipants.toLocaleString()}</p>
                <span className="text-xs text-blue-600 font-medium">Civic advocates</span>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <span className="text-xs font-bold text-slate-400 uppercase">Sheet Milestones</span>
                <p className="text-3xl font-extrabold text-slate-900 my-1">{totalTasksCompleted} / {sheetTasks.length}</p>
                <span className="text-xs text-slate-500 font-medium">Tasks marked completed</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                onClick={() => setActiveTab('health')}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-900 cursor-pointer transition group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg">
                    <Activity className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-900 transition" />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Primary Health Systems</h3>
                <p className="text-xs text-slate-500 mb-4">{healthData.length} reporting periods logged in Google Sheet.</p>
                <span className="text-xs font-semibold text-blue-900 group-hover:underline">View Portfolio →</span>
              </div>

              <div
                onClick={() => setActiveTab('protection')}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-900 cursor-pointer transition group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-rose-50 text-rose-700 rounded-lg">
                    <HeartHandshake className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-900 transition" />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Protection & Girls' Rights</h3>
                <p className="text-xs text-slate-500 mb-4">{protectionData.length} reporting periods logged in Google Sheet.</p>
                <span className="text-xs font-semibold text-blue-900 group-hover:underline">View Portfolio →</span>
              </div>

              <div
                onClick={() => setActiveTab('youth')}
                className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-blue-900 cursor-pointer transition group"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-amber-50 text-amber-700 rounded-lg">
                    <Users className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-blue-900 transition" />
                </div>
                <h3 className="font-bold text-slate-900 mb-1">Youth & Civic Policy</h3>
                <p className="text-xs text-slate-500 mb-4">{youthData.length} reporting periods logged in Google Sheet.</p>
                <span className="text-xs font-semibold text-blue-900 group-hover:underline">View Portfolio →</span>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 2: HEALTH PROJECT */}
        {activeTab === 'health' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Primary Healthcare & Facility Audits</h2>
                <p className="text-sm text-slate-500">Live data streamed from rows marked project='health'</p>
              </div>
              <button onClick={() => setActiveTab('summary')} className="text-xs text-blue-900 font-semibold hover:underline">
                ← Back to Overview
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 mb-3">Facility Audits vs Stockouts</h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={healthData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="period" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '12px' }} />
                      <Bar dataKey="metric1" name="Clinics Audited" fill="#0284c7" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="metric2" name="Stockouts Reported" fill="#e11d48" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="text-sm font-bold text-slate-700 mb-3">CAPI Submissions Record Flow</h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={healthData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="period" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Line type="monotone" dataKey="metric3" name="Digital Records" stroke="#0f766e" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: PROTECTION PROJECT */}
        {activeTab === 'protection' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Protection & Gender-Based Advocacy</h2>
                <p className="text-sm text-slate-500">Live data streamed from rows marked project='protection'</p>
              </div>
              <button onClick={() => setActiveTab('summary')} className="text-xs text-blue-900 font-semibold hover:underline">
                ← Back to Overview
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Community Reach & Protection Cases</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={protectionData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Bar dataKey="metric1" name="People Reached" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="metric2" name="Cases Supported" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: YOUTH PROJECT */}
        {activeTab === 'youth' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Youth Leadership & Civic Policy</h2>
                <p className="text-sm text-slate-500">Live data streamed from rows marked project='youth'</p>
              </div>
              <button onClick={() => setActiveTab('summary')} className="text-xs text-blue-900 font-semibold hover:underline">
                ← Back to Overview
              </button>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-700 mb-4">Youth Participation Trends</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={youthData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="period" fontSize={12} />
                    <YAxis fontSize={12} />
                    <Tooltip />
                    <Line type="monotone" dataKey="metric1" name="Participants" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* GOOGLE SHEET TASK TRACKER */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-blue-900" />
              <h3 className="text-base font-bold text-slate-900">Sheet-Driven Milestone Action Tracker</h3>
            </div>
            <span className="text-xs text-slate-400">Add or edit tasks directly in the Google Sheet</span>
          </div>

          <div className="space-y-2.5">
            {sheetTasks.length > 0 ? (
              sheetTasks
                .filter(t => activeTab === 'summary' || t.project === activeTab)
                .map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${task.project === 'health' ? 'bg-emerald-100 text-emerald-800' :
                          task.project === 'protection' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                        {task.project}
                      </span>
                      <span className={`text-xs font-medium ${task.status.toLowerCase() === 'completed' ? 'line-through text-slate-400' : 'text-slate-700'}`}>
                        {task.title}
                      </span>
                    </div>

                    <span className={`text-[11px] px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 ${task.status.toLowerCase() === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        task.status.toLowerCase() === 'in progress' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                      {task.status.toLowerCase() === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                      {task.status.toLowerCase() === 'in progress' && <Clock className="w-3 h-3" />}
                      {task.status.toLowerCase() === 'pending' && <AlertCircle className="w-3 h-3" />}
                      {task.status}
                    </span>
                  </div>
                ))
            ) : (
              <p className="text-xs text-slate-400 py-3 text-center">No tasks loaded. Add rows with type='task' to your Google Sheet.</p>
            )}
          </div>
        </div>

      </main>
    </div>
  );
}