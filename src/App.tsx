import React, { useState, useEffect } from 'react';
import { fetchDatabase, saveDatabase } from './utils/api';
import { HostelDatabaseState, Student, Warden } from './types';
import StudentView from './components/StudentView';
import WardenView from './components/WardenView';
import AiAssistant from './components/AiAssistant';
import { Shield, User, Landmark, LogIn, ArrowRight, Sparkles, Building2, Calendar, CheckSquare } from 'lucide-react';

export default function App() {
  const [dbState, setDbState] = useState<HostelDatabaseState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Authentication states
  const [loggedInRole, setLoggedInRole] = useState<'student' | 'warden' | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loginTab, setLoginTab] = useState<'student' | 'warden'>('student');

  // Input states for direct login
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState(''); // Simulated password
  const [loginError, setLoginError] = useState<string | null>(null);

  // Load the initial database state from Express server
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await fetchDatabase();
        setDbState(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching database:', err);
        setError('Failed to load database. Please ensure the server is running on port 3000.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Save changes to the backend database
  useEffect(() => {
    if (dbState) {
      saveDatabase(dbState).catch((err) => {
        console.error('Failed to auto-sync state to server:', err);
      });
    }
  }, [dbState]);

  // Direct login handler
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!dbState) return;
    setLoginError(null);

    const email = emailInput.trim().toLowerCase();

    if (loginTab === 'student') {
      const foundStudent = dbState.students.find(
        (s) => s.email.toLowerCase() === email || s.registerNumber.toLowerCase() === email
      );
      if (foundStudent) {
        setLoggedInRole('student');
        setCurrentUserId(foundStudent.id);
        setEmailInput('');
        setPasswordInput('');
      } else {
        setLoginError('Invalid Student Email or Register Number. Try "aarav.sharma@college.edu"');
      }
    } else {
      const foundWarden = dbState.wardens.find((w) => w.email.toLowerCase() === email);
      if (foundWarden) {
        setLoggedInRole('warden');
        setCurrentUserId(foundWarden.id);
        setEmailInput('');
        setPasswordInput('');
      } else {
        setLoginError('Invalid Warden Email. Try "k.raghavan@college.edu"');
      }
    }
  };

  // Quick profile login handler
  const handleQuickLogin = (role: 'student' | 'warden', id: string) => {
    setLoggedInRole(role);
    setCurrentUserId(id);
    setLoginError(null);
  };

  const handleLogout = () => {
    setLoggedInRole(null);
    setCurrentUserId('');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#0a122c]">
        {/* Decorative ambient glowing background circles */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-600/10 blur-[100px] glow-bubble-1"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-emerald-600/10 blur-[100px] glow-bubble-2"></div>
        
        <div className="glass-card p-10 flex flex-col items-center justify-center text-center max-w-sm w-full mx-4 space-y-4">
          <div className="relative">
            <Building2 className="w-12 h-12 text-blue-400 animate-pulse" />
            <Sparkles className="w-5 h-5 text-yellow-300 absolute -top-1 -right-1 animate-spin" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white mt-4">Smart Hostel Engine</h2>
          <p className="text-xs text-slate-400">Loading digital registers & biometric database...</p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-emerald-400 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-white w-1/2 animate-[pulse_1.5s_infinite]"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !dbState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a122c] px-4">
        <div className="glass-card max-w-md w-full p-8 text-center space-y-4 border border-red-500/20">
          <div className="mx-auto w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-white">System Connectivity Issue</h2>
          <p className="text-xs text-slate-400 leading-relaxed">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="glass-button-primary px-5 py-2 rounded-xl text-xs font-bold w-full"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  // Active User name lookup for assistant injection
  let currentUserName = 'Guest User';
  if (loggedInRole === 'student') {
    const s = dbState.students.find(x => x.id === currentUserId);
    if (s) currentUserName = s.name;
  } else if (loggedInRole === 'warden') {
    const w = dbState.wardens.find(x => x.id === currentUserId);
    if (w) currentUserName = w.name;
  }

  return (
    <div className="min-h-screen relative flex flex-col selection:bg-blue-500/30 selection:text-blue-200">
      
      {/* BACKGROUND DECORATIONS (Floating bubble visual anchors for Glassmorphism) */}
      <div className="absolute top-[5%] left-[10%] w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-blue-600/10 to-indigo-600/10 blur-[110px] pointer-events-none glow-bubble-1"></div>
      <div className="absolute bottom-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-bl from-emerald-600/10 to-blue-500/10 blur-[130px] pointer-events-none glow-bubble-2"></div>
      <div className="absolute top-[40%] left-[50%] w-[350px] h-[350px] rounded-full bg-gradient-to-r from-purple-600/5 to-pink-600/5 blur-[100px] pointer-events-none glow-bubble-3"></div>

      {/* CONDITIONAL ROUTING BASED ON AUTHENTICATION */}
      {loggedInRole === null ? (
        <div className="flex-1 flex flex-col justify-center items-center px-4 py-12 relative z-10">
          
          {/* Main Logo Header */}
          <div className="flex flex-col items-center text-center max-w-lg mb-8">
            <div className="flex items-center gap-2 bg-blue-500/10 px-4 py-2 rounded-full border border-blue-500/15 mb-4 backdrop-blur-md">
              <Building2 className="w-4 h-4 text-blue-400" />
              <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase">College ERP Integrated</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight leading-none">
              Smart <span className="bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">Hostel</span> System
            </h1>
            <p className="text-xs text-slate-400 mt-3 leading-relaxed max-w-sm">
              AI-Powered University Accommodation, Curfew Gates, Complaint Counters, Mess Scheduling, and Real-time Auditing.
            </p>
          </div>

          {/* Login Container (Glass Card) */}
          <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
            
            {/* Quick Demo Accounts Selection Side Panel (7 cols on desktop) */}
            <div className="md:col-span-7 glass-card-no-hover p-6 md:p-8 flex flex-col justify-between space-y-6">
              <div>
                <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                  Instant Role Sandbox
                </h2>
                <p className="text-[11px] text-slate-400 mt-1">
                  Evaluate both user experiences instantly with complete mock database records.
                </p>
              </div>

              {/* Students Demo Profiles */}
              <div className="space-y-3">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Select a Resident Student Profile</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dbState.students.slice(0, 4).map((student) => (
                    <button
                      key={student.id}
                      onClick={() => handleQuickLogin('student', student.id)}
                      className="text-left glass-card p-3 rounded-xl hover:scale-[1.02] flex items-center gap-3 group border border-white/5 bg-white/[0.01]"
                    >
                      <img 
                        src={student.profilePhoto} 
                        alt={student.name}
                        className="w-10 h-10 rounded-full object-cover border border-white/10 group-hover:border-blue-400/40 transition-colors"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate group-hover:text-blue-300 transition-colors">{student.name}</p>
                        <p className="text-[10px] text-slate-400 truncate">Room {student.roomNumber} ({student.hostelBlock}-Block)</p>
                        <span className={`inline-block mt-1 text-[8px] px-1.5 py-0.2 rounded font-bold uppercase ${
                          student.feeStatus === 'Paid' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {student.feeStatus}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Wardens Demo Profiles */}
              <div className="space-y-3 pt-2">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Select a Hostel Warden Profile</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {dbState.wardens.map((warden) => (
                    <button
                      key={warden.id}
                      onClick={() => handleQuickLogin('warden', warden.id)}
                      className="text-left glass-card p-3 rounded-xl hover:scale-[1.02] flex items-center gap-3 group border border-white/5 bg-white/[0.01]"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/20 transition-colors">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate group-hover:text-blue-300 transition-colors">{warden.name}</p>
                        <p className="text-[10px] text-slate-400">In Charge: Block {warden.blockResponsible}</p>
                        <span className="inline-block mt-1 text-[8px] px-1.5 py-0.2 rounded font-bold uppercase bg-blue-500/20 text-blue-300">
                          Active Warden
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 text-[10px] text-slate-500 text-center flex items-center justify-center gap-4">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-400" />
                  <span>Interactive Bookings</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Biometric Logs</span>
                </div>
              </div>

            </div>

            {/* Traditional Login Form Panel (5 cols on desktop) */}
            <div className="md:col-span-5 glass-card-no-hover p-6 md:p-8 flex flex-col justify-between">
              <div>
                {/* Tabs */}
                <div className="flex border-b border-white/10 pb-3 mb-6 gap-4">
                  <button
                    onClick={() => { setLoginTab('student'); setLoginError(null); }}
                    className={`text-xs font-bold pb-2 border-b-2 transition-all cursor-pointer ${
                      loginTab === 'student' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Student Account
                  </button>
                  <button
                    onClick={() => { setLoginTab('warden'); setLoginError(null); }}
                    className={`text-xs font-bold pb-2 border-b-2 transition-all cursor-pointer ${
                      loginTab === 'warden' ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Hostel Warden
                  </button>
                </div>

                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                  <LogIn className="w-4 h-4 text-blue-400" />
                  Credential Login
                </h3>
                <p className="text-[11px] text-slate-400 mb-4">
                  Enter your assigned university email to access your personal dashboard.
                </p>

                {loginError && (
                  <div className="bg-red-500/15 border border-red-500/30 text-red-300 text-[10px] p-2.5 rounded-xl mb-4 leading-relaxed font-semibold">
                    {loginError}
                  </div>
                )}

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">University Email / ID</label>
                    <input
                      type="text"
                      required
                      placeholder={loginTab === 'student' ? "aarav.sharma@college.edu" : "k.raghavan@college.edu"}
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full glass-input px-3.5 py-2.5 text-xs font-semibold focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Passcode</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full glass-input px-3.5 py-2.5 text-xs font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full glass-button-primary py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 mt-2"
                  >
                    Access Hostel Gate
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              </div>

              <div className="pt-6 mt-6 border-t border-white/5 text-[9px] text-slate-400 text-center leading-relaxed">
                By signing in, you agree to comply with university dormitory curfews (10:00 PM) and guest guidelines. Secure biometric tokens are logged.
              </div>
            </div>

          </div>

          {/* Footer branding */}
          <div className="mt-12 text-[10px] text-slate-500 tracking-wider">
            SMART HOSTEL ERP SYSTEM • VERSION 2.4 • DEVELOPED FOR DIGITAL CAMPUS INITIATIVES
          </div>

        </div>
      ) : (
        <div className="flex-1 flex flex-col relative z-10 w-full">
          {/* Main Content Area */}
          {loggedInRole === 'student' ? (
            <StudentView
              dbState={dbState}
              setDbState={setDbState}
              currentStudentId={currentUserId}
              onLogout={handleLogout}
            />
          ) : (
            <WardenView
              dbState={dbState}
              setDbState={setDbState}
              currentWardenId={currentUserId}
              onLogout={handleLogout}
            />
          )}

          {/* Collapsible Persistent Gemini Assistant */}
          <AiAssistant
            userRole={loggedInRole}
            userId={currentUserId}
            userName={currentUserName}
          />
        </div>
      )}

    </div>
  );
}
