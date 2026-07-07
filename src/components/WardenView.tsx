import React, { useState } from 'react';
import { 
  Users, Home, Calendar, AlertTriangle, Clock, 
  CheckCircle2, XCircle, Search, Filter, Plus, Bell, 
  ArrowUpRight, Download, ClipboardCheck, BookOpen, AlertCircle, FileText
} from 'lucide-react';
import { HostelDatabaseState, LeaveApplication, Complaint, Visitor, AttendanceRecord, BroadcastNotice, Student, Room, NotificationItem } from '../types';
import { saveDatabase } from '../utils/api';

interface WardenViewProps {
  dbState: HostelDatabaseState;
  setDbState: React.Dispatch<React.SetStateAction<HostelDatabaseState>>;
  currentWardenId: string;
  onLogout: () => void;
}

export default function WardenView({ dbState, setDbState, currentWardenId, onLogout }: WardenViewProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leaves' | 'visitors' | 'complaints' | 'attendance' | 'students' | 'rooms' | 'notices'>('dashboard');

  // Find warden profile
  const warden = dbState.wardens.find(w => w.id === currentWardenId) || dbState.wardens[0];
  const block = warden ? warden.blockResponsible : 'A';

  // Search & Filter state
  const [studentSearch, setStudentSearch] = useState('');
  const [studentYearFilter, setStudentYearFilter] = useState('All');
  const [studentFeeFilter, setStudentFeeFilter] = useState('All');

  // Form remarks / assignment state
  const [leaveRemarks, setLeaveRemarks] = useState<{ [id: string]: string }>({});
  const [complaintRemarks, setComplaintRemarks] = useState<{ [id: string]: string }>({});
  
  // Notice broadcast form state
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '', audience: 'All' as 'All' | 'Students' });

  // Add Student / Add Room states
  const [isAddStudentOpen, setIsAddStudentOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', registerNumber: '', department: '', year: 1, phone: '', parentPhone: '', email: '', roomNumber: '', feeStatus: 'Pending' as 'Paid' | 'Pending' | 'Overdue' });

  // Attendance taking date state
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [tempAttendance, setTempAttendance] = useState<{ [studentId: string]: { status: 'Present' | 'Absent' | 'Late'; entryTime?: string; exitTime?: string; lateRemarks?: string } }>({});

  if (!warden) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-2xl shadow">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Warden Profile Not Found</h3>
        <p className="text-sm text-slate-500 mt-2">Please contact the administrator.</p>
        <button onClick={onLogout} className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg">Logout</button>
      </div>
    );
  }

  // Filter lists specific to this warden's block
  const blockStudents = dbState.students.filter(s => s.hostelBlock === block);
  const blockRooms = dbState.rooms.filter(r => r.block === block);
  const blockLeaves = dbState.leaves.filter(l => l.roomNumber.startsWith(block));
  const blockComplaints = dbState.complaints.filter(c => c.roomNumber.startsWith(block));
  const blockVisitors = dbState.visitors.filter(v => v.roomNumber.startsWith(block));
  const blockAttendance = dbState.attendance.filter(a => a.roomNumber.startsWith(block));

  // Initialize bulk attendance for a date
  const handleLoadAttendanceSheet = () => {
    const sheet: typeof tempAttendance = {};
    blockStudents.forEach(student => {
      const existing = dbState.attendance.find(a => a.studentId === student.id && a.date === attendanceDate);
      sheet[student.id] = {
        status: existing ? existing.status : 'Present',
        entryTime: existing?.entryTime || '08:30 PM',
        exitTime: existing?.exitTime || '10:00 PM',
        lateRemarks: existing?.lateRemarks || ''
      };
    });
    setTempAttendance(sheet);
  };

  React.useEffect(() => {
    handleLoadAttendanceSheet();
  }, [attendanceDate, dbState.students]);

  // Bulk save attendance sheet
  const handleSaveAttendanceSheet = async () => {
    // Filter out existing records for this block and date
    let updatedAttendance = dbState.attendance.filter(a => !(a.roomNumber.startsWith(block) && a.date === attendanceDate));

    // Create new records
    const newRecords: AttendanceRecord[] = blockStudents.map(student => {
      const sheetVal = tempAttendance[student.id] || { status: 'Present', entryTime: '08:30 PM', exitTime: '10:00 PM', lateRemarks: '' };
      return {
        id: `att_${student.id}_${attendanceDate}`,
        studentId: student.id,
        studentName: student.name,
        roomNumber: student.roomNumber,
        date: attendanceDate,
        status: sheetVal.status,
        entryTime: sheetVal.status === 'Present' || sheetVal.status === 'Late' ? sheetVal.entryTime : undefined,
        exitTime: sheetVal.status === 'Present' || sheetVal.status === 'Late' ? sheetVal.exitTime : undefined,
        lateRemarks: sheetVal.status === 'Late' ? sheetVal.lateRemarks : undefined
      };
    });

    updatedAttendance = [...updatedAttendance, ...newRecords];

    const auditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      user: warden.name,
      action: 'RECORD_ATTENDANCE',
      details: `Recorded attendance sheet for block ${block} on date ${attendanceDate}.`
    };

    const nextState = {
      ...dbState,
      attendance: updatedAttendance,
      auditLogs: [auditLog, ...dbState.auditLogs]
    };

    setDbState(nextState);
    await saveDatabase(nextState);
    alert(`Attendance saved successfully for ${attendanceDate}`);
  };

  // Leave approval
  const handleLeaveDecision = async (id: string, status: 'Approved' | 'Rejected') => {
    const remarks = leaveRemarks[id] || '';
    const leaveApp = dbState.leaves.find(l => l.id === id);

    const updatedLeaves = dbState.leaves.map(l => {
      if (l.id === id) {
        return { ...l, status, remarks };
      }
      return l;
    });

    const updatedNotifications: NotificationItem[] = leaveApp ? [
      {
        id: 'not_' + Date.now(),
        userId: leaveApp.studentId,
        title: `Leave ${status}`,
        message: `Your leave request starting ${leaveApp.startDate} has been ${status.toLowerCase()} by Warden ${warden.name}.${remarks ? ` Remarks: ${remarks}` : ''}`,
        type: status === 'Approved' ? 'success' : 'alert',
        read: false,
        createdAt: new Date().toISOString()
      },
      ...dbState.notifications
    ] : dbState.notifications;

    const auditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      user: warden.name,
      action: status === 'Approved' ? 'APPROVE_LEAVE' : 'REJECT_LEAVE',
      details: `${status} leave for student ${leaveApp?.studentName || ''}. Remarks: ${remarks}`
    };

    const nextState = {
      ...dbState,
      leaves: updatedLeaves,
      notifications: updatedNotifications,
      auditLogs: [auditLog, ...dbState.auditLogs]
    };

    setDbState(nextState);
    await saveDatabase(nextState);
  };

  // Visitor approval
  const handleVisitorDecision = async (id: string, status: 'Approved' | 'Rejected') => {
    const visitorRecord = dbState.visitors.find(v => v.id === id);
    const gatePassCode = status === 'Approved' ? `PASS_${id.slice(-4)}_${Math.floor(Math.random() * 9000 + 1000)}` : undefined;

    const updatedVisitors = dbState.visitors.map(v => {
      if (v.id === id) {
        return { ...v, status, gatePassCode };
      }
      return v;
    });

    const updatedNotifications: NotificationItem[] = visitorRecord ? [
      {
        id: 'not_' + Date.now(),
        userId: visitorRecord.studentId,
        title: `Visitor Request ${status}`,
        message: `Your visitor request for ${visitorRecord.name} was ${status.toLowerCase()}.${status === 'Approved' ? ` Digital gate pass generated.` : ''}`,
        type: status === 'Approved' ? 'success' : 'alert',
        read: false,
        createdAt: new Date().toISOString()
      },
      ...dbState.notifications
    ] : dbState.notifications;

    const auditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      user: warden.name,
      action: status === 'Approved' ? 'APPROVE_VISITOR' : 'REJECT_VISITOR',
      details: `${status} visitor ${visitorRecord?.name || ''} entry request for student ${visitorRecord?.studentName || ''}.`
    };

    const nextState = {
      ...dbState,
      visitors: updatedVisitors,
      notifications: updatedNotifications,
      auditLogs: [auditLog, ...dbState.auditLogs]
    };

    setDbState(nextState);
    await saveDatabase(nextState);
  };

  // Update Complaint Status
  const handleComplaintUpdate = async (id: string, nextStatus: Complaint['status']) => {
    const remarks = complaintRemarks[id] || '';
    const complaintRecord = dbState.complaints.find(c => c.id === id);

    const updatedComplaints = dbState.complaints.map(c => {
      if (c.id === id) {
        return {
          ...c,
          status: nextStatus,
          remarks: remarks || c.remarks,
          updatedAt: new Date().toISOString()
        };
      }
      return c;
    });

    const updatedNotifications: NotificationItem[] = complaintRecord ? [
      {
        id: 'not_' + Date.now(),
        userId: complaintRecord.studentId,
        title: `Complaint Status: ${nextStatus}`,
        message: `Your ticket regarding "${complaintRecord.description.slice(0, 30)}..." has been moved to ${nextStatus.toUpperCase()}.${remarks ? ` Remarks: ${remarks}` : ''}`,
        type: nextStatus === 'Resolved' ? 'success' : 'info',
        read: false,
        createdAt: new Date().toISOString()
      },
      ...dbState.notifications
    ] : dbState.notifications;

    const auditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      user: warden.name,
      action: 'UPDATE_COMPLAINT_STATUS',
      details: `Moved complaint #${id.slice(-6)} to ${nextStatus}. Remarks: ${remarks}`
    };

    const nextState = {
      ...dbState,
      complaints: updatedComplaints,
      notifications: updatedNotifications,
      auditLogs: [auditLog, ...dbState.auditLogs]
    };

    setDbState(nextState);
    await saveDatabase(nextState);
  };

  // Broadcast notice
  const handleBroadcastNotice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeForm.title || !noticeForm.content) return;

    const notice: BroadcastNotice = {
      id: 'not_bd_' + Date.now(),
      title: noticeForm.title,
      content: noticeForm.content,
      audience: noticeForm.audience,
      date: new Date().toISOString().split('T')[0],
      author: warden.name
    };

    const updatedNotices = [notice, ...dbState.notices];
    
    // Notify all or students
    const updatedNotifications: NotificationItem[] = [
      {
        id: 'not_' + Date.now(),
        userId: 'all',
        title: 'New Announcement',
        message: `Warden ${warden.name} posted: "${noticeForm.title}"`,
        type: 'info',
        read: false,
        createdAt: new Date().toISOString()
      },
      ...dbState.notifications
    ];

    const auditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      user: warden.name,
      action: 'BROADCAST_NOTICE',
      details: `Broadcasted notice: "${noticeForm.title}" for audience: ${noticeForm.audience}.`
    };

    const nextState = {
      ...dbState,
      notices: updatedNotices,
      notifications: updatedNotifications,
      auditLogs: [auditLog, ...dbState.auditLogs]
    };

    setDbState(nextState);
    await saveDatabase(nextState);

    setNoticeForm({ title: '', content: '', audience: 'All' });
    setActiveTab('dashboard');
    alert('Notice broadcasted successfully!');
  };

  // Enroll New Student
  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudent.name || !newStudent.registerNumber || !newStudent.roomNumber) return;

    // Check if room exists and has capacity
    const targetRoom = dbState.rooms.find(r => r.roomNumber === newStudent.roomNumber && r.block === block);
    if (!targetRoom) {
      alert(`Error: Room ${newStudent.roomNumber} does not exist in block ${block}. Please allocate a valid room.`);
      return;
    }
    if (targetRoom.availableBeds <= 0) {
      alert(`Error: Room ${newStudent.roomNumber} is already full (Occupancy: ${targetRoom.occupancy}/${targetRoom.capacity}).`);
      return;
    }

    const studentId = 's_' + Date.now();
    const studentObj: Student = {
      id: studentId,
      name: newStudent.name,
      registerNumber: newStudent.registerNumber,
      department: newStudent.department || 'Computer Science',
      year: Number(newStudent.year),
      phone: newStudent.phone || '+91 99999 00000',
      parentPhone: newStudent.parentPhone || '+91 99999 00001',
      email: newStudent.email || `${newStudent.name.toLowerCase().replace(' ', '')}@college.edu`,
      hostelBlock: block,
      roomNumber: newStudent.roomNumber,
      checkInDate: new Date().toISOString().split('T')[0],
      checkOutDate: '2027-05-30',
      feeStatus: newStudent.feeStatus,
      attendance: 100, // New student defaults
      profilePhoto: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120'
    };

    // Update Room occupancy
    const updatedRooms = dbState.rooms.map(r => {
      if (r.id === targetRoom.id) {
        const nextOccupancy = r.occupancy + 1;
        return {
          ...r,
          occupancy: nextOccupancy,
          availableBeds: r.capacity - nextOccupancy,
          status: (nextOccupancy >= r.capacity ? 'Full' : 'Available') as any
        };
      }
      return r;
    });

    // Create automatic payments
    const payments: any[] = [
      { id: 'p_h_' + Date.now(), studentId, studentName: studentObj.name, registerNumber: studentObj.registerNumber, amount: 85000, type: 'Hostel Fee', status: newStudent.feeStatus === 'Paid' ? 'Paid' : 'Pending', dueDate: '2026-07-31' },
      { id: 'p_m_' + Date.now(), studentId, studentName: studentObj.name, registerNumber: studentObj.registerNumber, amount: 35000, type: 'Mess Fee', status: newStudent.feeStatus === 'Paid' ? 'Paid' : 'Pending', dueDate: '2026-07-31' }
    ];

    const auditLog = {
      id: 'log_' + Date.now(),
      timestamp: new Date().toISOString(),
      user: warden.name,
      action: 'ENROLL_STUDENT',
      details: `Enrolled student ${studentObj.name} in Room ${block}-${studentObj.roomNumber}. Allocated beds, created fees.`
    };

    const nextState = {
      ...dbState,
      students: [...dbState.students, studentObj],
      rooms: updatedRooms,
      payments: [...dbState.payments, ...payments],
      auditLogs: [auditLog, ...dbState.auditLogs]
    };

    setDbState(nextState);
    await saveDatabase(nextState);

    setNewStudent({ name: '', registerNumber: '', department: '', year: 1, phone: '', parentPhone: '', email: '', roomNumber: '', feeStatus: 'Pending' });
    setIsAddStudentOpen(false);
    alert('Student enrolled and room allocated successfully!');
  };

  // Export functions (PDF / Excel simulation)
  const handleExportData = (type: 'pdf' | 'excel', category: string) => {
    alert(`Generating high-quality ${type.toUpperCase()} Report for: ${category}. Downloading files directly...`);
  };

  return (
    <div className="w-full min-h-screen bg-transparent text-slate-100">
      
      {/* Warden Header */}
      <div className="glass-panel sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/20 rounded-xl text-blue-400 border border-blue-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">{warden.name}</h1>
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-indigo-400/20">BLOCK WARDEN</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Warden Office | Block Responsible: <strong>Block {block}</strong> | {warden.email}
              </p>
            </div>
          </div>

          {/* Navigation Tab Menu & Logout */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
              {[
                { id: 'dashboard', label: 'Warden Desk', icon: ClipboardCheck },
                { id: 'leaves', label: 'Outings & Leaves', icon: Calendar },
                { id: 'visitors', label: 'Visitor Approvals', icon: Clock },
                { id: 'complaints', label: 'Maintenance Hub', icon: AlertTriangle },
                { id: 'attendance', label: 'Daily Curfew', icon: ClipboardCheck },
                { id: 'students', label: 'Students', icon: Users },
                { id: 'rooms', label: 'Room Grid', icon: Home },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200 shrink-0 ${
                      isActive 
                        ? 'bg-blue-600/90 text-white shadow-md shadow-blue-500/20 border border-blue-400/30' 
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={onLogout}
              className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* WARDEN DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            
            {/* KPI Cards specific to Warden's block */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Residents in Block {block}</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-slate-800 dark:text-slate-100">{blockStudents.length}</span>
                  <span className="text-[10px] text-slate-400 font-medium">students</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Pending Leaves</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-slate-800 dark:text-slate-100">
                    {blockLeaves.filter(l => l.status === 'Pending').length}
                  </span>
                  <span className="text-[10px] text-amber-500 font-bold">requires action</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Unresolved Complaints</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-slate-800 dark:text-slate-100">
                    {blockComplaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length}
                  </span>
                  <span className="text-[10px] text-red-500 font-bold">active tickets</span>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Empty Beds Available</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-slate-800 dark:text-slate-100">
                    {blockRooms.reduce((sum, r) => sum + r.availableBeds, 0)}
                  </span>
                  <span className="text-[10px] text-emerald-500 font-bold">free beds</span>
                </div>
              </div>
            </div>

            {/* Quick Action Tasks */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Leave Requests Queue */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-amber-500" />
                      Pending Outing Leaves (Action Required)
                    </h3>
                    <button onClick={() => setActiveTab('leaves')} className="text-blue-600 hover:underline text-xs font-bold cursor-pointer">View All</button>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {blockLeaves.filter(l => l.status === 'Pending').length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-6 text-center">No pending leave approvals in your block.</p>
                    ) : (
                      blockLeaves.filter(l => l.status === 'Pending').map((leave) => (
                        <div key={leave.id} className="py-4 space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                {leave.studentName} (Room {leave.roomNumber})
                              </h4>
                              <p className="text-[11px] text-slate-500">
                                Date: {leave.startDate} to {leave.endDate} | Reason: <strong>{leave.reason}</strong>
                              </p>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono">Applied: {new Date(leave.createdAt).toLocaleDateString()}</span>
                          </div>

                          {/* Approval Controls */}
                          <div className="flex items-center gap-3">
                            <input 
                              type="text" 
                              placeholder="Enter approval remarks/notes..."
                              value={leaveRemarks[leave.id] || ''}
                              onChange={e => setLeaveRemarks({ ...leaveRemarks, [leave.id]: e.target.value })}
                              className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <button 
                              onClick={() => handleLeaveDecision(leave.id, 'Approved')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => handleLeaveDecision(leave.id, 'Rejected')}
                              className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] px-3.5 py-1.5 rounded-xl transition-colors cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Visitor Entry Requests */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-indigo-500" />
                      Pending Visitor Gate Passes
                    </h3>
                    <button onClick={() => setActiveTab('visitors')} className="text-blue-600 hover:underline text-xs font-bold">View All</button>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800">
                    {blockVisitors.filter(v => v.status === 'Pending').length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-6 text-center">No pending visitor requests in Block {block}.</p>
                    ) : (
                      blockVisitors.filter(v => v.status === 'Pending').map((v) => (
                        <div key={v.id} className="py-4 flex flex-wrap items-center justify-between gap-4">
                          <div>
                            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{v.name} ({v.relation})</h4>
                            <p className="text-[11px] text-slate-500">Visiting student: <strong>{v.studentName}</strong> (Room {v.roomNumber})</p>
                            <p className="text-[10px] text-slate-400">Entry: {v.entryTime} | Exit: {v.exitTime} | {v.idProofType}: {v.idProofNumber}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => handleVisitorDecision(v.id, 'Approved')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-xl transition-colors">Approve</button>
                            <button onClick={() => handleVisitorDecision(v.id, 'Rejected')} className="bg-red-600 hover:bg-red-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-xl transition-colors">Reject</button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column: Warden Quick Broadcast Notice */}
              <div className="space-y-6">
                
                {/* Notice creation */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-500" />
                    Broadcast Notice / Outage
                  </h3>
                  <form onSubmit={handleBroadcastNotice} className="space-y-3 text-xs">
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 uppercase text-[9px]">Notice Title</label>
                      <input 
                        type="text" 
                        required
                        placeholder="E.g., Biometric system outage tonight"
                        value={noticeForm.title}
                        onChange={e => setNoticeForm({ ...noticeForm, title: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 uppercase text-[9px]">Content / Message</label>
                      <textarea 
                        required
                        rows={4}
                        placeholder="Type notices for students of block..."
                        value={noticeForm.content}
                        onChange={e => setNoticeForm({ ...noticeForm, content: e.target.value })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="font-bold text-slate-400 uppercase text-[9px]">Audience</label>
                      <select 
                        value={noticeForm.audience}
                        onChange={e => setNoticeForm({ ...noticeForm, audience: e.target.value as any })}
                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 font-bold"
                      >
                        <option value="All">All Residents</option>
                        <option value="Students">Students Only</option>
                      </select>
                    </div>
                    <button type="submit" className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all">Broadcast Announcement</button>
                  </form>
                </div>

                {/* Quick block reports */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4">Export Block Reports</h3>
                  <div className="space-y-2.5 text-xs">
                    <button onClick={() => handleExportData('excel', 'Student List')} className="w-full p-2.5 border border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-850 dark:border-slate-800 rounded-xl flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                      <span>Export Student Roster</span>
                      <Download className="w-4 h-4 text-slate-400" />
                    </button>
                    <button onClick={() => handleExportData('pdf', 'Daily Attendance')} className="w-full p-2.5 border border-slate-100 hover:bg-slate-50 dark:hover:bg-slate-850 dark:border-slate-800 rounded-xl flex items-center justify-between text-slate-700 dark:text-slate-300 font-semibold cursor-pointer">
                      <span>Generate Curfew Report</span>
                      <Download className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* COMPLAINTS TAB */}
        {activeTab === 'complaints' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Block Maintenance Ticket Resolver</h2>
              <p className="text-xs text-slate-500">Track electrical, internet, cleaning and plumbing complaints in Block {block}.</p>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Room</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Issue Description</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Warden Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {blockComplaints.map((ticket) => (
                    <tr key={ticket.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 text-xs text-slate-800 dark:text-slate-200">
                      <td className="p-4 font-bold font-mono">{ticket.roomNumber}</td>
                      <td className="p-4 font-semibold">{ticket.studentName}</td>
                      <td className="p-4"><span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[9px] uppercase font-bold">{ticket.category}</span></td>
                      <td className="p-4">{ticket.description}</td>
                      <td className="p-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                          ticket.status === 'Resolved' || ticket.status === 'Closed' ? 'bg-emerald-50 text-emerald-600' :
                          ticket.status === 'In Progress' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2.5">
                          <input 
                            type="text" 
                            placeholder="Add ticket remarks..."
                            value={complaintRemarks[ticket.id] || ''}
                            onChange={e => setComplaintRemarks({ ...complaintRemarks, [ticket.id]: e.target.value })}
                            className="bg-slate-50 border border-slate-200 dark:border-slate-800 p-1.5 rounded-lg text-[10px]"
                          />
                          {ticket.status === 'Submitted' && (
                            <button onClick={() => handleComplaintUpdate(ticket.id, 'In Progress')} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[9px] px-2.5 py-1 rounded">Assign</button>
                          )}
                          {ticket.status === 'In Progress' && (
                            <button onClick={() => handleComplaintUpdate(ticket.id, 'Resolved')} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] px-2.5 py-1 rounded">Mark Solved</button>
                          )}
                          {ticket.status === 'Resolved' && (
                            <button onClick={() => handleComplaintUpdate(ticket.id, 'Closed')} className="bg-slate-600 hover:bg-slate-700 text-white font-bold text-[9px] px-2.5 py-1 rounded">Close</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DAILY ATTENDANCE SHEET */}
        {activeTab === 'attendance' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Daily Night Curfew Biometric Attendance</h2>
                <p className="text-xs text-slate-500">Record physical roll call and late entries for all residents of Block {block}.</p>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="date" 
                  value={attendanceDate}
                  onChange={e => setAttendanceDate(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 rounded-xl text-xs font-semibold"
                />
                <button 
                  onClick={handleSaveAttendanceSheet}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Save Attendance Sheet
                </button>
              </div>
            </div>

            {/* Attendance Matrix Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Room</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Profile</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Reg Number</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Timing Check</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Late Remarks / Reasons</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                  {blockStudents.map((st) => {
                    const rowVal = tempAttendance[st.id] || { status: 'Present', entryTime: '08:30 PM', exitTime: '10:00 PM', lateRemarks: '' };
                    return (
                      <tr key={st.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/15">
                        <td className="p-4 font-bold font-mono text-slate-800 dark:text-slate-100">{st.roomNumber}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <img src={st.profilePhoto} alt="" className="w-7 h-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                            <span className="font-bold">{st.name}</span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-slate-500">{st.registerNumber}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            {['Present', 'Absent', 'Late'].map((stat) => (
                              <button
                                key={stat}
                                type="button"
                                onClick={() => setTempAttendance({
                                  ...tempAttendance,
                                  [st.id]: { ...rowVal, status: stat as any }
                                })}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                  rowVal.status === stat
                                    ? stat === 'Present' ? 'bg-emerald-600 text-white border-emerald-600' :
                                      stat === 'Absent' ? 'bg-red-600 text-white border-red-600' :
                                      'bg-amber-500 text-white border-amber-500'
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {stat}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="p-4">
                          {rowVal.status !== 'Absent' ? (
                            <div className="flex items-center gap-1.5 font-mono">
                              <input 
                                type="text" 
                                value={rowVal.entryTime} 
                                onChange={e => setTempAttendance({ ...tempAttendance, [st.id]: { ...rowVal, entryTime: e.target.value } })}
                                className="w-16 border rounded bg-slate-50 text-center text-[10px]"
                              />
                              <span className="text-slate-400">to</span>
                              <input 
                                type="text" 
                                value={rowVal.exitTime} 
                                onChange={e => setTempAttendance({ ...tempAttendance, [st.id]: { ...rowVal, exitTime: e.target.value } })}
                                className="w-16 border rounded bg-slate-50 text-center text-[10px]"
                              />
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Not applicable</span>
                          )}
                        </td>
                        <td className="p-4">
                          {rowVal.status === 'Late' ? (
                            <input 
                              type="text" 
                              placeholder="Reason for late entry..."
                              value={rowVal.lateRemarks || ''}
                              onChange={e => setTempAttendance({ ...tempAttendance, [st.id]: { ...rowVal, lateRemarks: e.target.value } })}
                              className="w-full bg-slate-50 border border-slate-200 rounded px-2 py-1 text-[10px]"
                            />
                          ) : (
                            <span className="text-slate-400 italic">No remarks</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MANAGE STUDENTS TAB */}
        {activeTab === 'students' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Enrollment & Student Roster - Block {block}</h2>
                <p className="text-xs text-slate-500">Create new student files, assign vacant beds, and track fee status.</p>
              </div>
              <button 
                onClick={() => setIsAddStudentOpen(true)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Enroll New Student
              </button>
            </div>

            {/* Filter controls */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 w-full sm:w-72">
                <Search className="w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search students by name, reg, room..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="bg-transparent focus:outline-none text-xs w-full"
                />
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                  <Filter className="w-3.5 h-3.5" />
                  <span>Filters:</span>
                </div>
                <select 
                  value={studentYearFilter} 
                  onChange={e => setStudentYearFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs font-semibold"
                >
                  <option value="All">All Years</option>
                  <option value="1">1st Year</option>
                  <option value="2">2nd Year</option>
                  <option value="3">3rd Year</option>
                  <option value="4">4th Year</option>
                </select>
                <select 
                  value={studentFeeFilter} 
                  onChange={e => setStudentFeeFilter(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs font-semibold"
                >
                  <option value="All">All Fee Status</option>
                  <option value="Paid">Paid Only</option>
                  <option value="Pending">Pending</option>
                  <option value="Overdue">Overdue</option>
                </select>
              </div>
            </div>

            {/* Students Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {blockStudents
                .filter(s => {
                  const matchSearch = s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                      s.registerNumber.toLowerCase().includes(studentSearch.toLowerCase()) ||
                                      s.roomNumber.includes(studentSearch);
                  const matchYear = studentYearFilter === 'All' || s.year === Number(studentYearFilter);
                  const matchFee = studentFeeFilter === 'All' || s.feeStatus === studentFeeFilter;
                  return matchSearch && matchYear && matchFee;
                })
                .map((st) => (
                  <div key={st.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                    <div className="flex items-start gap-3.5">
                      <img src={st.profilePhoto} alt={st.name} className="w-12 h-12 rounded-full object-cover border-2 border-slate-200" referrerPolicy="no-referrer" />
                      <div>
                        <h4 className="font-bold text-slate-800 dark:text-slate-100 text-xs">{st.name}</h4>
                        <p className="text-[11px] text-slate-400 font-mono">Reg: {st.registerNumber}</p>
                        <p className="text-[10px] text-slate-500 mt-1">{st.department} | Year {st.year}</p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-100 dark:border-slate-900 text-[10px]">
                      <div>
                        <span className="text-slate-400 block font-bold">Room Assigned</span>
                        <strong className="text-slate-700 dark:text-slate-200">Room #{st.roomNumber}</strong>
                      </div>
                      <div>
                        <span className="text-slate-400 block font-bold">Fee Status</span>
                        <strong className={`inline-block ${
                          st.feeStatus === 'Paid' ? 'text-emerald-600' :
                          st.feeStatus === 'Overdue' ? 'text-red-600' : 'text-amber-600'
                        }`}>{st.feeStatus}</strong>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                      <span>Phone: {st.phone}</span>
                      <button onClick={() => alert(`Details for ${st.name}:\nParents Contact: ${st.parentPhone}\nEmail: ${st.email}\nCheck-in Date: ${st.checkInDate}`)} className="text-blue-600 hover:underline cursor-pointer">More Details</button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ROOMS GRID TAB */}
        {activeTab === 'rooms' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Room Allocation & Vacancies Desk - Block {block}</h2>
              <p className="text-xs text-slate-500">Check room availability, capacities, and place rooms in maintenance mode.</p>
            </div>

            {/* Room Matrix Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-5">
              {blockRooms.map((room) => {
                const occupancyColor = room.occupancy >= room.capacity 
                  ? 'bg-rose-50 text-rose-600 border-rose-200' 
                  : room.status === 'Maintenance' 
                    ? 'bg-slate-50 text-slate-500 border-slate-200'
                    : 'bg-emerald-50 text-emerald-600 border-emerald-200';
                return (
                  <div key={room.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-black text-slate-800 dark:text-slate-100">{room.roomNumber}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${occupancyColor}`}>
                          {room.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500">Floor {room.floor} | Total Beds: {room.capacity}</p>
                    </div>

                    <div className="mt-4 space-y-1.5">
                      <div className="flex justify-between text-[10px] font-medium text-slate-500">
                        <span>Occupancy</span>
                        <span>{room.occupancy}/{room.capacity} Beds filled</span>
                      </div>
                      {/* Bed fill ratio bar */}
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${room.status === 'Maintenance' ? 'bg-slate-400' : 'bg-blue-600'}`} 
                          style={{ width: `${(room.occupancy / room.capacity) * 100}%` }}
                        />
                      </div>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-slate-50 dark:border-slate-850 flex justify-between">
                      <button 
                        onClick={() => {
                          const updatedRooms = dbState.rooms.map(r => {
                            if (r.id === room.id) {
                              const nextStatus = r.status === 'Maintenance' ? 'Available' : 'Maintenance';
                              return { ...r, status: nextStatus as any };
                            }
                            return r;
                          });
                          const nextState = { ...dbState, rooms: updatedRooms };
                          setDbState(nextState);
                          saveDatabase(nextState);
                        }}
                        className="text-[9px] font-bold text-slate-500 hover:text-blue-600"
                      >
                        {room.status === 'Maintenance' ? 'Put Active' : 'Maintenance'}
                      </button>
                      <span className="text-[9px] font-mono font-bold text-slate-400">{room.availableBeds} beds left</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* ENROLL STUDENT MODAL */}
      {isAddStudentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-850 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Enroll Resident & Allocate Room</h3>
              <button onClick={() => setIsAddStudentOpen(false)} className="p-1 hover:bg-slate-100 rounded-full"><XCircle className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleAddStudent} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[9px]">Full Student Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="E.g., Dev Kumar"
                    value={newStudent.name}
                    onChange={e => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[9px]">College Register Number</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="E.g., 2026CSE099"
                    value={newStudent.registerNumber}
                    onChange={e => setNewStudent({ ...newStudent, registerNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[9px]">Department</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="E.g., Computer Science"
                    value={newStudent.department}
                    onChange={e => setNewStudent({ ...newStudent, department: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[9px]">Year</label>
                  <select 
                    value={newStudent.year}
                    onChange={e => setNewStudent({ ...newStudent, year: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  >
                    {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[9px]">Student Mobile</label>
                  <input 
                    type="text" 
                    placeholder="+91"
                    value={newStudent.phone}
                    onChange={e => setNewStudent({ ...newStudent, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[9px]">Parent Mobile</label>
                  <input 
                    type="text" 
                    placeholder="+91"
                    value={newStudent.parentPhone}
                    onChange={e => setNewStudent({ ...newStudent, parentPhone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="font-bold text-slate-400 uppercase text-[9px]">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="student@college.edu"
                    value={newStudent.email}
                    onChange={e => setNewStudent({ ...newStudent, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[9px]">Assign Room Number</label>
                  <select 
                    value={newStudent.roomNumber}
                    onChange={e => setNewStudent({ ...newStudent, roomNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-mono font-bold text-blue-600"
                  >
                    <option value="">-- Choose Vacant Room --</option>
                    {blockRooms.filter(r => r.availableBeds > 0 && r.status !== 'Maintenance').map(r => (
                      <option key={r.id} value={r.roomNumber}>{r.roomNumber} ({r.availableBeds} beds vacant)</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-400 uppercase text-[9px]">Admission Fee Status</label>
                  <select 
                    value={newStudent.feeStatus}
                    onChange={e => setNewStudent({ ...newStudent, feeStatus: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 font-bold"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending Invoice</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button type="button" onClick={() => setIsAddStudentOpen(false)} className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all">Cancel</button>
                <button type="submit" className="w-1/2 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all">Enroll Student</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
