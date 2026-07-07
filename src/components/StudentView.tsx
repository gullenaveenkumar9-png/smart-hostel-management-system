import React, { useState } from 'react';
import { 
  User, Shield, Calendar, AlertTriangle, CreditCard, 
  Clock, Coffee, Shirt, Bell, PhoneCall, Download, CheckCircle, 
  X, AlertCircle, Plus, FileText, Check, HelpCircle, Eye, ArrowRight, Compass, LogIn
} from 'lucide-react';
import { HostelDatabaseState, Student, LeaveApplication, Complaint, Visitor, Payment, LaundryBooking, NotificationItem } from '../types';
import { saveDatabase } from '../utils/api';

interface StudentViewProps {
  dbState: HostelDatabaseState;
  setDbState: React.Dispatch<React.SetStateAction<HostelDatabaseState>>;
  currentStudentId: string;
  onLogout: () => void;
}

export default function StudentView({ dbState, setDbState, currentStudentId, onLogout }: StudentViewProps) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'leave' | 'complaints' | 'visitors' | 'finance' | 'amenities' | 'info'>('dashboard');
  
  // Modals / Form States
  const [leaveModal, setLeaveModal] = useState(false);
  const [newLeave, setNewLeave] = useState({ startDate: '', endDate: '', reason: '' });
  
  const [complaintModal, setComplaintModal] = useState(false);
  const [newComplaint, setNewComplaint] = useState({ category: 'Electrical' as any, description: '' });
  
  const [visitorModal, setVisitorModal] = useState(false);
  const [newVisitor, setNewVisitor] = useState({ name: '', phone: '', relation: '', idProofType: 'Aadhaar Card', idProofNumber: '', entryTime: '10:00 AM', exitTime: '05:00 PM' });
  
  const [paymentModal, setPaymentModal] = useState<Payment | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'UPI' | 'Card' | 'Net Banking'>('UPI');
  const [paymentSuccessData, setPaymentSuccessData] = useState<{ txnId: string; receipt: Payment } | null>(null);

  const [laundryModal, setLaundryModal] = useState(false);
  const [newLaundry, setNewLaundry] = useState({ slotDate: '', slotTime: '09:00 AM - 11:00 AM', machineId: 'M-01' });

  const [emergencyModal, setEmergencyModal] = useState(false);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ phone: '', parentPhone: '', email: '' });

  // Get current student object
  const student = dbState.students.find(s => s.id === currentStudentId) || dbState.students[0];

  // Initialize edit profile form
  React.useEffect(() => {
    if (student) {
      setProfileForm({
        phone: student.phone,
        parentPhone: student.parentPhone,
        email: student.email
      });
    }
  }, [student]);

  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-2xl shadow">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Student Profile Not Found</h3>
        <p className="text-sm text-slate-500 mt-2">Please log in again or contact the administrator.</p>
        <button onClick={onLogout} className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg">Logout</button>
      </div>
    );
  }

  // Filter student-specific records
  const studentRoommates = dbState.students.filter(s => s.roomNumber === student.roomNumber && s.id !== student.id);
  const studentLeaves = dbState.leaves.filter(l => l.studentId === student.id);
  const studentComplaints = dbState.complaints.filter(c => c.studentId === student.id);
  const studentVisitors = dbState.visitors.filter(v => v.studentId === student.id);
  const studentPayments = dbState.payments.filter(p => p.studentId === student.id);
  const studentLaundry = dbState.laundryBookings.filter(lb => lb.studentId === student.id);
  const studentNotifications = dbState.notifications.filter(n => n.userId === student.id || n.userId === 'all');
  
  // Find current warden for student
  const warden = dbState.wardens.find(w => w.blockResponsible === student.hostelBlock) || dbState.wardens[0];

  // Handlers
  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeave.startDate || !newLeave.endDate || !newLeave.reason) return;

    const leave: LeaveApplication = {
      id: 'l_' + Date.now(),
      studentId: student.id,
      studentName: student.name,
      roomNumber: student.roomNumber,
      startDate: newLeave.startDate,
      endDate: newLeave.endDate,
      reason: newLeave.reason,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    const updatedLeaves = [leave, ...dbState.leaves];
    const updatedNotifications: NotificationItem[] = [
      {
        id: 'not_' + Date.now(),
        userId: student.id,
        title: 'Leave Submitted',
        message: `Your leave request for ${newLeave.startDate} to ${newLeave.endDate} has been submitted for approval.`,
        type: 'info',
        read: false,
        createdAt: new Date().toISOString()
      },
      ...dbState.notifications
    ];

    const nextState = { ...dbState, leaves: updatedLeaves, notifications: updatedNotifications };
    setDbState(nextState);
    await saveDatabase(nextState);

    setNewLeave({ startDate: '', endDate: '', reason: '' });
    setLeaveModal(false);
  };

  const handleRegisterComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComplaint.description) return;

    const complaint: Complaint = {
      id: 'c_' + Date.now(),
      studentId: student.id,
      studentName: student.name,
      roomNumber: student.roomNumber,
      category: newComplaint.category,
      description: newComplaint.description,
      status: 'Submitted',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedComplaints = [complaint, ...dbState.complaints];
    const updatedNotifications: NotificationItem[] = [
      {
        id: 'not_' + Date.now(),
        userId: student.id,
        title: 'Complaint Registered',
        message: `Your ${newComplaint.category} complaint has been registered. ID: ${complaint.id}`,
        type: 'info',
        read: false,
        createdAt: new Date().toISOString()
      },
      ...dbState.notifications
    ];

    const nextState = { ...dbState, complaints: updatedComplaints, notifications: updatedNotifications };
    setDbState(nextState);
    await saveDatabase(nextState);

    setNewComplaint({ category: 'Electrical', description: '' });
    setComplaintModal(false);
  };

  const handleRequestVisitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVisitor.name || !newVisitor.phone || !newVisitor.relation) return;

    const visitor: Visitor = {
      id: 'v_' + Date.now(),
      studentId: student.id,
      studentName: student.name,
      roomNumber: student.roomNumber,
      name: newVisitor.name,
      phone: newVisitor.phone,
      relation: newVisitor.relation,
      entryTime: newVisitor.entryTime,
      exitTime: newVisitor.exitTime,
      idProofType: newVisitor.idProofType,
      idProofNumber: newVisitor.idProofNumber,
      status: 'Pending',
      createdAt: new Date().toISOString()
    };

    const updatedVisitors = [visitor, ...dbState.visitors];
    const nextState = { ...dbState, visitors: updatedVisitors };
    setDbState(nextState);
    await saveDatabase(nextState);

    setNewVisitor({ name: '', phone: '', relation: '', idProofType: 'Aadhaar Card', idProofNumber: '', entryTime: '10:00 AM', exitTime: '05:00 PM' });
    setVisitorModal(false);
  };

  const handleSimulatePayment = async () => {
    if (!paymentModal) return;
    
    const txnId = 'TXN_' + Math.floor(Math.random() * 10000000000);
    const updatedPayments = dbState.payments.map(p => {
      if (p.id === paymentModal.id) {
        return {
          ...p,
          status: 'Paid' as const,
          method: paymentMethod,
          paymentDate: new Date().toISOString().split('T')[0],
          transactionId: txnId
        };
      }
      return p;
    });

    // Update student fee status if all paid
    const studentPaymentsAfterPay = updatedPayments.filter(p => p.studentId === student.id);
    const allPaid = studentPaymentsAfterPay.every(p => p.status === 'Paid');
    const updatedStudents = dbState.students.map(s => {
      if (s.id === student.id) {
        return { ...s, feeStatus: (allPaid ? 'Paid' : 'Pending') as any };
      }
      return s;
    });

    const receipt = {
      ...paymentModal,
      status: 'Paid' as const,
      method: paymentMethod,
      paymentDate: new Date().toISOString().split('T')[0],
      transactionId: txnId
    };

    const updatedNotifications: NotificationItem[] = [
      {
        id: 'not_' + Date.now(),
        userId: student.id,
        title: 'Payment Successful',
        message: `Your payment of ₹${paymentModal.amount} for ${paymentModal.type} was successful. Transaction ID: ${txnId}`,
        type: 'success',
        read: false,
        createdAt: new Date().toISOString()
      },
      ...dbState.notifications
    ];

    const nextState = { 
      ...dbState, 
      payments: updatedPayments, 
      students: updatedStudents,
      notifications: updatedNotifications 
    };

    setDbState(nextState);
    await saveDatabase(nextState);

    setPaymentSuccessData({ txnId, receipt });
    setPaymentModal(null);
  };

  const handleBookLaundry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLaundry.slotDate) return;

    const booking: LaundryBooking = {
      id: 'lb_' + Date.now(),
      studentId: student.id,
      studentName: student.name,
      roomNumber: student.roomNumber,
      slotDate: newLaundry.slotDate,
      slotTime: newLaundry.slotTime,
      machineId: newLaundry.machineId,
      status: 'Booked',
      createdAt: new Date().toISOString()
    };

    const updatedLaundry = [booking, ...dbState.laundryBookings];
    const nextState = { ...dbState, laundryBookings: updatedLaundry };
    setDbState(nextState);
    await saveDatabase(nextState);

    setNewLaundry({ slotDate: '', slotTime: '09:00 AM - 11:00 AM', machineId: 'M-01' });
    setLaundryModal(false);
  };

  const handleSaveProfile = async () => {
    const updatedStudents = dbState.students.map(s => {
      if (s.id === student.id) {
        return {
          ...s,
          phone: profileForm.phone,
          parentPhone: profileForm.parentPhone,
          email: profileForm.email
        };
      }
      return s;
    });

    const nextState = { ...dbState, students: updatedStudents };
    setDbState(nextState);
    await saveDatabase(nextState);
    setIsEditingProfile(false);
  };

  return (
    <div className="w-full min-h-screen bg-transparent text-slate-100">
      {/* Header and Student details */}
      <div className="glass-panel sticky top-0 z-10 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src={student.profilePhoto} 
              alt={student.name} 
              className="w-12 h-12 rounded-full object-cover border-2 border-blue-500/55 shadow-md shadow-blue-500/20"
              referrerPolicy="no-referrer"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">{student.name}</h1>
                <span className="bg-blue-500/20 text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-400/20">STUDENT</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Reg: {student.registerNumber} | Room {student.hostelBlock}-{student.roomNumber} | Dept: {student.department}
              </p>
            </div>
          </div>

          {/* Tab Navigation and Logout */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: Compass },
                { id: 'leave', label: 'Leave', icon: Calendar },
                { id: 'complaints', label: 'Complaints', icon: AlertTriangle },
                { id: 'visitors', label: 'Visitors', icon: Clock },
                { id: 'finance', label: 'Fees & Finance', icon: CreditCard },
                { id: 'amenities', label: 'Laundry & Mess', icon: Coffee },
                { id: 'info', label: 'Settings', icon: User },
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
        {/* TAB CONTENTS */}

        {/* 1. DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="glass-card p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Attendance</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-white">{student.attendance}%</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${student.attendance >= 85 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                    {student.attendance >= 85 ? 'Safe' : 'Low'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Required 85% for exams</p>
              </div>

              <div className="glass-card p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fee Balance</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-white">
                    ₹{studentPayments.filter(p => p.status !== 'Paid').reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${student.feeStatus === 'Paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                    {student.feeStatus}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Due Date: July 15, 2026</p>
              </div>

              <div className="glass-card p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Complaints</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-white">
                    {studentComplaints.filter(c => c.status !== 'Resolved' && c.status !== 'Closed').length}
                  </span>
                  <span className="text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
                    Tracked
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Last submitted today</p>
              </div>

              <div className="glass-card p-5">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Leaves</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-black text-white">
                    {studentLeaves.filter(l => l.status === 'Approved' && new Date(l.endDate) >= new Date()).length}
                  </span>
                  <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                    Approved
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Next starts 10th July</p>
              </div>
            </div>

            {/* Dashboard bento layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Left Column: Room & Roommate Details */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Room card */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Compass className="w-4 h-4 text-blue-500" />
                    My Accommodation Details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl mb-4 border border-slate-100 dark:border-slate-900">
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase font-bold">Room Assigned</p>
                      <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">{student.hostelBlock} Block, Room {student.roomNumber}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase font-bold">Block Warden</p>
                      <p className="text-sm font-black text-slate-700 dark:text-slate-200 mt-0.5">{warden?.name || 'Dr. K. Raghavan'}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase font-bold">Check-In Date</p>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-0.5">{student.checkInDate}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-slate-400 uppercase font-bold">Warden Contact</p>
                      <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-0.5">{warden?.phone || '+91 94440 12345'}</p>
                    </div>
                  </div>

                  {/* Roommates list */}
                  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wider">Roommate Info</h4>
                  <div className="space-y-3">
                    {studentRoommates.length === 0 ? (
                      <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-950 p-3 rounded-lg">You are currently the sole resident in this room.</p>
                    ) : (
                      studentRoommates.map((rm) => (
                        <div key={rm.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                          <div className="flex items-center gap-3">
                            <img src={rm.profilePhoto} alt={rm.name} className="w-9 h-9 rounded-full object-cover border border-slate-200" referrerPolicy="no-referrer" />
                            <div>
                              <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">{rm.name}</h5>
                              <p className="text-[10px] text-slate-500">{rm.department} | Year {rm.year}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">{rm.phone}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Broadcast Notices */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                    <Bell className="w-4 h-4 text-amber-500" />
                    Notice Board & Announcements
                  </h3>
                  <div className="space-y-4">
                    {dbState.notices.filter(n => n.audience === 'All' || n.audience === 'Students').map((notice) => (
                      <div key={notice.id} className="p-4 bg-slate-50 dark:bg-slate-950 border-l-4 border-blue-600 rounded-r-xl">
                        <div className="flex items-center justify-between mb-1.5">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">{notice.title}</h4>
                          <span className="text-[9px] text-slate-400 font-medium">{notice.date}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">{notice.content}</p>
                        <div className="mt-2 text-[9px] text-slate-400 text-right">By: {notice.author}</div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column: Active Notifications & Quick Actions */}
              <div className="space-y-6">
                
                {/* Quick actions panel */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-4">Quick Shortcuts</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { setActiveTab('leave'); setLeaveModal(true); }} className="p-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer">
                      <Calendar className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Apply Leave</span>
                    </button>
                    <button onClick={() => { setActiveTab('complaints'); setComplaintModal(true); }} className="p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer">
                      <AlertTriangle className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Log Complaint</span>
                    </button>
                    <button onClick={() => { setActiveTab('visitors'); setVisitorModal(true); }} className="p-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer">
                      <Clock className="w-5 h-5" />
                      <span className="text-[10px] font-bold">Visitor Pass</span>
                    </button>
                    <button onClick={() => setEmergencyModal(true)} className="p-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer">
                      <PhoneCall className="w-5 h-5" />
                      <span className="text-[10px] font-bold text-rose-600">Emergency Contact</span>
                    </button>
                  </div>
                </div>

                {/* Notifications Panel */}
                <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Live Notifications</h3>
                    <span className="bg-blue-50 text-blue-600 text-[9px] font-bold px-1.5 py-0.5 rounded">Real-time</span>
                  </div>
                  <div className="space-y-3.5 max-h-[280px] overflow-y-auto">
                    {studentNotifications.map((n) => (
                      <div key={n.id} className="flex gap-2.5 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <div className={`p-1.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
                          n.type === 'warning' ? 'bg-amber-50 text-amber-600' :
                          n.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                          n.type === 'alert' ? 'bg-rose-50 text-rose-600' : 'bg-blue-50 text-blue-600'
                        }`}>
                          <Bell className="w-3.5 h-3.5" />
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-[11px] font-bold text-slate-800 dark:text-slate-100">{n.title}</h4>
                          <p className="text-[10px] text-slate-500 leading-normal">{n.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* 2. LEAVE APPLICATION */}
        {activeTab === 'leave' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Apply & Track Outing Leaves</h2>
                <p className="text-xs text-slate-500">Every leave application is instantly forwarded to Warden {warden?.name}.</p>
              </div>
              <button 
                onClick={() => setLeaveModal(true)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Apply Outing / Leave
              </button>
            </div>

            {/* Leave History List */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Leave Applications Log</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {studentLeaves.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">No leave applications found. Click "Apply Outing / Leave" above to create one.</div>
                ) : (
                  studentLeaves.map((leave) => (
                    <div key={leave.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Reason: {leave.reason}</h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            leave.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                            leave.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {leave.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          Period: <strong>{leave.startDate}</strong> to <strong>{leave.endDate}</strong>
                        </p>
                        {leave.remarks && (
                          <p className="text-[11px] bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 mt-1.5 italic">
                            Warden remarks: {leave.remarks}
                          </p>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Applied on: {new Date(leave.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. COMPLAINTS */}
        {activeTab === 'complaints' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Lodge & Track Maintenance Complaints</h2>
                <p className="text-xs text-slate-500">Log tickets for room amenities directly to college electricians, plumbers, and technicians.</p>
              </div>
              <button 
                onClick={() => setComplaintModal(true)}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                New Complaint
              </button>
            </div>

            {/* Complaints list */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                <h3 className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Your Complaint Tickets</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {studentComplaints.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 text-xs">No complaint tickets recorded.</div>
                ) : (
                  studentComplaints.map((ticket) => (
                    <div key={ticket.id} className="p-5 flex flex-wrap items-center justify-between gap-4">
                      <div className="space-y-1.5 max-w-xl">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-extrabold px-2 py-0.5 rounded uppercase">
                            {ticket.category}
                          </span>
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{ticket.description}</h4>
                        </div>
                        {ticket.remarks && (
                          <p className="text-[11px] bg-slate-50 dark:bg-slate-950 px-3 py-1.5 rounded-lg text-slate-600 dark:text-slate-400 italic">
                            Staff remarks: {ticket.remarks}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-[10px] text-slate-400">
                          <span>Logged: {new Date(ticket.createdAt).toLocaleDateString()}</span>
                          <span>Ticket ID: #{ticket.id.slice(-6)}</span>
                        </div>
                      </div>
                      <div>
                        {/* Status timeline badges */}
                        <div className="flex flex-col items-end gap-1.5">
                          <span className={`text-[10px] font-bold px-3 py-1 rounded-full ${
                            ticket.status === 'Closed' || ticket.status === 'Resolved' ? 'bg-emerald-50 text-emerald-600' :
                            ticket.status === 'In Progress' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            Status: {ticket.status}
                          </span>
                          <div className="flex items-center gap-1">
                            {['Submitted', 'Assigned', 'In Progress', 'Resolved'].map((st, i) => (
                              <div 
                                key={i} 
                                className={`h-1.5 w-6 rounded-full ${
                                  (ticket.status === 'Submitted' && i === 0) ||
                                  (ticket.status === 'Assigned' && i <= 1) ||
                                  (ticket.status === 'In Progress' && i <= 2) ||
                                  (ticket.status === 'Resolved' && i <= 3) ||
                                  (ticket.status === 'Closed' && i <= 3)
                                    ? 'bg-blue-600' : 'bg-slate-200'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 4. VISITOR MANAGEMENT */}
        {activeTab === 'visitors' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Visitor Passes & QR Gate Passes</h2>
                <p className="text-xs text-slate-500">Request entry approval for parents, relatives, or local guardians. Approved passes generate a secure QR Gate Pass.</p>
              </div>
              <button 
                onClick={() => setVisitorModal(true)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Add Visitor Request
              </button>
            </div>

            {/* List of visitor requests */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {studentVisitors.length === 0 ? (
                <div className="md:col-span-2 p-8 bg-white dark:bg-slate-900 border border-slate-100 rounded-2xl text-center text-slate-500 text-xs">No visitor passes registered.</div>
              ) : (
                studentVisitors.map((v) => (
                  <div key={v.id} className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-5 shadow-sm flex gap-4 items-start justify-between">
                    <div className="space-y-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">{v.name} ({v.relation})</h4>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            v.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' :
                            v.status === 'Rejected' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                          }`}>
                            {v.status}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">Phone: {v.phone}</p>
                      </div>

                      <div className="space-y-0.5 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-900">
                        <p className="text-[10px] text-slate-500">Entry: <strong>{v.entryTime}</strong> | Exit: <strong>{v.exitTime}</strong></p>
                        <p className="text-[10px] text-slate-500">{v.idProofType}: {v.idProofNumber}</p>
                      </div>
                    </div>

                    {/* QR Code Gate Pass Section */}
                    <div className="text-center shrink-0">
                      {v.status === 'Approved' ? (
                        <div className="flex flex-col items-center gap-1 bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200">
                          {/* Simulated SVG QR Code */}
                          <div className="p-1 bg-white rounded border border-slate-200">
                            <svg className="w-16 h-16 text-slate-900" viewBox="0 0 100 100" fill="currentColor">
                              <rect width="100" height="100" fill="white"/>
                              {/* QR Code pattern */}
                              <rect x="10" y="10" width="20" height="20" />
                              <rect x="15" y="15" width="10" height="10" fill="white" />
                              <rect x="70" y="10" width="20" height="20" />
                              <rect x="75" y="15" width="10" height="10" fill="white" />
                              <rect x="10" y="70" width="20" height="20" />
                              <rect x="15" y="75" width="10" height="10" fill="white" />
                              <rect x="40" y="40" width="20" height="20" />
                              {/* Scattered random dots */}
                              <rect x="40" y="10" width="5" height="5" />
                              <rect x="50" y="15" width="5" height="5" />
                              <rect x="55" y="25" width="5" height="5" />
                              <rect x="10" y="40" width="5" height="5" />
                              <rect x="25" y="45" width="5" height="5" />
                              <rect x="70" y="40" width="5" height="5" />
                              <rect x="85" y="45" width="5" height="5" />
                              <rect x="40" y="70" width="5" height="5" />
                              <rect x="55" y="75" width="5" height="5" />
                              <rect x="70" y="70" width="5" height="5" />
                              <rect x="80" y="85" width="5" height="5" />
                            </svg>
                          </div>
                          <span className="text-[8px] font-mono font-bold text-slate-500 mt-1 uppercase">Pass: {v.id.slice(-4)}</span>
                        </div>
                      ) : (
                        <div className="h-20 w-20 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50">
                          <Clock className="w-5 h-5 text-slate-300" />
                          <span className="text-[9px] text-slate-400 mt-1">Pending approval</span>
                        </div>
                      )}
                    </div>
                  </div>
                )))}
            </div>
          </div>
        )}

        {/* 5. FEE MANAGEMENT */}
        {activeTab === 'finance' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Fee Ledger & Payment Center</h2>
              <p className="text-xs text-slate-500">View and pay bills for college hostel, mess, fines, and laundry.</p>
            </div>

            {/* Invoices list */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fee Category</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Amount</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Payment / Due Date</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Receipt / Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {studentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                      <td className="p-4 text-xs font-bold text-slate-800 dark:text-slate-200">{p.type}</td>
                      <td className="p-4 text-xs font-black text-slate-700 dark:text-slate-200">₹{p.amount.toLocaleString()}</td>
                      <td className="p-4 text-xs">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                          p.status === 'Paid' ? 'bg-emerald-50 text-emerald-600' :
                          p.status === 'Overdue' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-slate-500">
                        {p.status === 'Paid' ? `Paid on ${p.paymentDate}` : `Due by ${p.dueDate}`}
                      </td>
                      <td className="p-4 text-right">
                        {p.status === 'Paid' ? (
                          <button 
                            onClick={() => setPaymentSuccessData({ txnId: p.transactionId || 'TXN_0000', receipt: p })}
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download Receipt
                          </button>
                        ) : (
                          <button 
                            onClick={() => setPaymentModal(p)}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer"
                          >
                            Pay Online
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Receipt Modal (Receipt Preview Printable Panel) */}
            {paymentSuccessData && (
              <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-6 space-y-4 max-w-xl">
                <div className="flex items-center justify-between border-b border-emerald-100 dark:border-emerald-900/20 pb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-emerald-600" />
                    <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400">Payment Receipt Generated Successfully!</h4>
                  </div>
                  <button onClick={() => setPaymentSuccessData(null)} className="p-1 hover:bg-emerald-100 rounded-full"><X className="w-4 h-4 text-emerald-800" /></button>
                </div>
                
                {/* Simulated Paper Invoice Receipt */}
                <div id="receipt-paper" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-5 rounded-xl shadow-inner text-slate-800 dark:text-slate-100 font-sans space-y-4">
                  <div className="text-center">
                    <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-400">Hostel Administration</h3>
                    <h2 className="text-sm font-bold text-slate-700 dark:text-white mt-0.5">E-Receipt for Academic Fees</h2>
                  </div>

                  <div className="grid grid-cols-2 gap-y-2 text-[10px] border-t border-b border-slate-100 dark:border-slate-800 py-3 font-mono">
                    <div>Student Name: <strong className="text-slate-700 dark:text-slate-200">{student.name}</strong></div>
                    <div>Register No: <strong>{student.registerNumber}</strong></div>
                    <div>Fee Type: <strong>{paymentSuccessData.receipt.type}</strong></div>
                    <div>Paid Amount: <strong className="text-slate-900 dark:text-emerald-400">₹{paymentSuccessData.receipt.amount.toLocaleString()}</strong></div>
                    <div>Payment Method: <strong>{paymentSuccessData.receipt.method}</strong></div>
                    <div>Transaction ID: <strong className="text-blue-600">{paymentSuccessData.txnId}</strong></div>
                    <div className="col-span-2 text-slate-400 text-[9px] mt-1">Authorized Digital Signature - Valid for College Records</div>
                  </div>

                  <button 
                    onClick={() => window.print()}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Print Receipt
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. AMENITIES (LAUNDRY & MESS) */}
        {activeTab === 'amenities' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Laundry Booking Section */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                    <Shirt className="w-4.5 h-4.5 text-blue-500" />
                    Smart Laundry Slot Booking
                  </h3>
                  <button 
                    onClick={() => setLaundryModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-xl cursor-pointer"
                  >
                    Book Machine Slot
                  </button>
                </div>
                
                <p className="text-xs text-slate-500 leading-relaxed">Book a 2-hour laundry machine slot. Max 2 active bookings per week.</p>

                {/* List of active laundry bookings */}
                <div className="space-y-2.5">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Your Booked Laundry Slots</h4>
                  {studentLaundry.length === 0 ? (
                    <p className="text-xs text-slate-500 italic bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900">No active laundry slot bookings found.</p>
                  ) : (
                    studentLaundry.map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-3.5 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/20">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{b.slotTime}</p>
                          <p className="text-[10px] text-slate-500">Date: {b.slotDate} | Machine: {b.machineId}</p>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${b.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                          {b.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Mess Menu View */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Coffee className="w-4.5 h-4.5 text-emerald-500" />
                  Today's Weekly Mess Menu
                </h3>
                <p className="text-xs text-slate-500">Weekly rotating vegetarian thali menu (with optional non-veg additions on Sunday lunch).</p>

                <div className="space-y-3 max-h-[300px] overflow-y-auto scrollbar-thin">
                  {dbState.messMenu.map((dayMenu) => (
                    <details key={dayMenu.id} className="group border border-slate-100 dark:border-slate-800 rounded-xl p-3 bg-slate-50/50 dark:bg-slate-950/20 [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex items-center justify-between font-bold text-xs text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                        <span>{dayMenu.day}</span>
                        <span className="text-[10px] text-indigo-600 dark:text-indigo-400 group-open:hidden">View Details</span>
                        <span className="text-[10px] text-slate-400 hidden group-open:inline">Collapse</span>
                      </summary>
                      <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800 pt-3 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200 font-bold block mb-0.5">Breakfast (07:30-09:00):</strong>
                          {dayMenu.breakfast}
                        </div>
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200 font-bold block mb-0.5">Lunch (12:30-02:00):</strong>
                          {dayMenu.lunch}
                        </div>
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200 font-bold block mb-0.5">Evening Snacks (17:00-18:00):</strong>
                          {dayMenu.snack}
                        </div>
                        <div>
                          <strong className="text-slate-800 dark:text-slate-200 font-bold block mb-0.5">Dinner (19:30-21:00):</strong>
                          {dayMenu.dinner}
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 7. PROFILE SETTINGS */}
        {activeTab === 'info' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm max-w-3xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Hostel Profile & Personal Info</h3>
              {!isEditingProfile ? (
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className="bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-[11px] px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setIsEditingProfile(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSaveProfile}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs text-slate-700 dark:text-slate-300">
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Registered Name</span>
                <span className="font-semibold">{student.name}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Register Number</span>
                <span className="font-semibold font-mono">{student.registerNumber}</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Department & Course</span>
                <span className="font-semibold">{student.department} ({student.year} Year)</span>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Current Accommodation</span>
                <span className="font-semibold">{student.hostelBlock} Block, Room #{student.roomNumber}</span>
              </div>
              
              <div className="space-y-1.5 col-span-2 border-t border-slate-50 dark:border-slate-800 pt-4">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Warden Admin Assigned</span>
                <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl flex items-center justify-between border border-slate-100 dark:border-slate-900">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-800 dark:text-slate-200">{warden?.name}</p>
                    <p className="text-[10px] text-slate-500">Block Warden, Block {student.hostelBlock}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold font-mono text-[11px] text-indigo-600 dark:text-indigo-400">{warden?.phone}</p>
                    <p className="text-[10px] text-slate-500">{warden?.email}</p>
                  </div>
                </div>
              </div>

              {/* Editable Profile Inputs */}
              <div className="space-y-1.5 border-t border-slate-50 dark:border-slate-800 pt-4">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Student Mobile Number</span>
                {isEditingProfile ? (
                  <input 
                    type="text" 
                    value={profileForm.phone} 
                    onChange={e => setProfileForm({ ...profileForm, phone: e.target.value })} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                  />
                ) : (
                  <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{student.phone}</span>
                )}
              </div>
              <div className="space-y-1.5 border-t border-slate-50 dark:border-slate-800 pt-4">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Parent/Guardian Mobile Number</span>
                {isEditingProfile ? (
                  <input 
                    type="text" 
                    value={profileForm.parentPhone} 
                    onChange={e => setProfileForm({ ...profileForm, parentPhone: e.target.value })} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 font-mono"
                  />
                ) : (
                  <span className="font-mono font-bold text-slate-600 dark:text-slate-300">{student.parentPhone}</span>
                )}
              </div>
              <div className="space-y-1.5 col-span-2 border-t border-slate-50 dark:border-slate-800 pt-4">
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Email Address</span>
                {isEditingProfile ? (
                  <input 
                    type="email" 
                    value={profileForm.email} 
                    onChange={e => setProfileForm({ ...profileForm, email: e.target.value })} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2"
                  />
                ) : (
                  <span className="font-semibold">{student.email}</span>
                )}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* FORM MODALS */}

      {/* A. Apply Leave Modal */}
      {leaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Apply for Leave / Outing</h3>
              <button onClick={() => setLeaveModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleApplyLeave} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Start Date</label>
                  <input 
                    type="date" 
                    required 
                    value={newLeave.startDate} 
                    onChange={e => setNewLeave({ ...newLeave, startDate: e.target.value })} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">End Date</label>
                  <input 
                    type="date" 
                    required 
                    value={newLeave.endDate} 
                    onChange={e => setNewLeave({ ...newLeave, endDate: e.target.value })} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Reason for Outing</label>
                <textarea 
                  required 
                  rows={3}
                  value={newLeave.reason} 
                  onChange={e => setNewLeave({ ...newLeave, reason: e.target.value })} 
                  placeholder="Explain why you are leaving (e.g., medical reasons, family wedding)"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block mb-1">Parent Consent Document Upload</span>
                <input type="file" className="text-[10px]" />
                <p className="text-[9px] text-slate-400 mt-1">Upload scan of Parent sign or official university call letter (Optional)</p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button 
                  type="button" 
                  onClick={() => setLeaveModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all cursor-pointer"
                >
                  Apply Outing
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* B. Log Complaint Modal */}
      {complaintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Log Maintenance Complaint</h3>
              <button onClick={() => setComplaintModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleRegisterComplaint} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Problem Category</label>
                <select 
                  value={newComplaint.category} 
                  onChange={e => setNewComplaint({ ...newComplaint, category: e.target.value as any })} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-100 font-semibold"
                >
                  {['Electrical', 'Plumbing', 'Internet', 'Cleaning', 'Furniture', 'Water Supply', 'Others'].map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Describe Issue</label>
                <textarea 
                  required 
                  rows={4}
                  value={newComplaint.description} 
                  onChange={e => setNewComplaint({ ...newComplaint, description: e.target.value })} 
                  placeholder="Detail the issue, include floor/wing if necessary (e.g., fan speed regulator broken, water tap leaking)"
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block mb-1">Upload Photo (Optional)</span>
                <input type="file" accept="image/*" className="text-[10px]" />
                <p className="text-[9px] text-slate-400 mt-1">Providing a photo helps maintenance staff resolve it faster.</p>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button 
                  type="button" 
                  onClick={() => setComplaintModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl transition-all"
                >
                  Log Ticket
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C. Add Visitor Request Modal */}
      {visitorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Visitor Approval & Gate Pass</h3>
              <button onClick={() => setVisitorModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleRequestVisitor} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Visitor Name</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="E.g., John Doe"
                    value={newVisitor.name} 
                    onChange={e => setNewVisitor({ ...newVisitor, name: e.target.value })} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Relationship</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="E.g., Father, Mother, Brother"
                    value={newVisitor.relation} 
                    onChange={e => setNewVisitor({ ...newVisitor, relation: e.target.value })} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Contact Mobile Number</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="E.g., +91 90000 00000"
                    value={newVisitor.phone} 
                    onChange={e => setNewVisitor({ ...newVisitor, phone: e.target.value })} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Entry Time</label>
                  <input 
                    type="text" 
                    placeholder="E.g., 10:00 AM"
                    value={newVisitor.entryTime} 
                    onChange={e => setNewVisitor({ ...newVisitor, entryTime: e.target.value })} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Exit Time</label>
                  <input 
                    type="text" 
                    placeholder="E.g., 05:00 PM"
                    value={newVisitor.exitTime} 
                    onChange={e => setNewVisitor({ ...newVisitor, exitTime: e.target.value })} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">ID Proof Document Type</label>
                  <select 
                    value={newVisitor.idProofType} 
                    onChange={e => setNewVisitor({ ...newVisitor, idProofType: e.target.value })} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-100 font-semibold"
                  >
                    {['Aadhaar Card', 'PAN Card', 'Voter ID', 'College ID'].map((idDoc) => (
                      <option key={idDoc} value={idDoc}>{idDoc}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">ID Proof Number</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Enter document ID number"
                    value={newVisitor.idProofNumber} 
                    onChange={e => setNewVisitor({ ...newVisitor, idProofNumber: e.target.value })} 
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button 
                  type="button" 
                  onClick={() => setVisitorModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="w-1/2 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all"
                >
                  Add Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* D. Pay Online Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Secured College Bill Desk</h3>
              <button onClick={() => setPaymentModal(null)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="text-xs space-y-3">
              <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-900 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold">Category: {paymentModal.type}</p>
                <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">₹{paymentModal.amount.toLocaleString()}</p>
              </div>
              
              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Choose Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {['UPI', 'Card', 'Net Banking'].map((m) => (
                    <button 
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m as any)}
                      className={`py-2 px-1 text-[10px] font-bold border rounded-xl text-center cursor-pointer transition-all ${
                        paymentMethod === m 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-500/10' 
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'UPI' && (
                <div className="space-y-1.5 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900">
                  <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Enter Virtual Payment Address (VPA)</label>
                  <input type="text" placeholder="student@okaxis" className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 font-mono text-[11px]" />
                  <p className="text-[9px] text-slate-400">Payment request will be sent to your UPI app.</p>
                </div>
              )}

              {paymentMethod === 'Card' && (
                <div className="space-y-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900 font-mono">
                  <div>
                    <label className="font-bold text-slate-400 uppercase text-[8px] block">Card Number</label>
                    <input type="text" placeholder="4321 0987 6543 2109" className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[10px]" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="font-bold text-slate-400 uppercase text-[8px] block">Expiry</label>
                      <input type="text" placeholder="12/29" className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[10px]" />
                    </div>
                    <div>
                      <label className="font-bold text-slate-400 uppercase text-[8px] block">CVV</label>
                      <input type="password" placeholder="***" className="w-full bg-white border border-slate-200 rounded-lg p-1.5 text-[10px]" />
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'Net Banking' && (
                <div className="space-y-1 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-900">
                  <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Select Your Bank</label>
                  <select className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-[10px]">
                    <option>State Bank of India</option>
                    <option>HDFC Bank</option>
                    <option>ICICI Bank</option>
                    <option>Axis Bank</option>
                  </select>
                </div>
              )}

              <div className="flex gap-2 pt-2.5">
                <button onClick={() => setPaymentModal(null)} className="w-1/3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all">Cancel</button>
                <button onClick={handleSimulatePayment} className="w-2/3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all">Pay Securely</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* E. Book Laundry Slot Modal */}
      {laundryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-xs w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Book Laundry Slot</h3>
              <button onClick={() => setLaundryModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <form onSubmit={handleBookLaundry} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Choose Date</label>
                <input 
                  type="date" 
                  required 
                  value={newLaundry.slotDate} 
                  onChange={e => setNewLaundry({ ...newLaundry, slotDate: e.target.value })} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-100"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Available Shift</label>
                <select 
                  value={newLaundry.slotTime} 
                  onChange={e => setNewLaundry({ ...newLaundry, slotTime: e.target.value })} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-100 font-semibold"
                >
                  <option>09:00 AM - 11:00 AM</option>
                  <option>11:00 AM - 01:00 PM</option>
                  <option>02:00 PM - 04:00 PM</option>
                  <option>04:00 PM - 06:00 PM</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="font-bold text-slate-500 uppercase tracking-wider text-[9px] block">Select Machine ID</label>
                <select 
                  value={newLaundry.machineId} 
                  onChange={e => setNewLaundry({ ...newLaundry, machineId: e.target.value })} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-2.5 rounded-xl text-slate-800 dark:text-slate-100 font-semibold"
                >
                  <option value="M-01">Machine 1 (Front Load 8Kg)</option>
                  <option value="M-02">Machine 2 (Front Load 8Kg)</option>
                  <option value="M-03">Machine 3 (Top Load 10Kg)</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setLaundryModal(false)} className="w-1/2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all">Cancel</button>
                <button type="submit" className="w-1/2 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all">Book Machine</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* F. Emergency Contacts Modal */}
      {emergencyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-sm w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-rose-600 flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4" />
                Emergency Contact Directory
              </h3>
              <button onClick={() => setEmergencyModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-4 h-4 text-slate-400" /></button>
            </div>
            <div className="text-xs space-y-3.5">
              <p className="text-slate-500 leading-normal">In case of electrical short circuits, medical emergencies, or security crises, call directly:</p>
              
              <div className="space-y-2 divide-y divide-slate-100 dark:divide-slate-800">
                <div className="pt-2 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Hostel Warden Office (A-Block)</h4>
                    <p className="text-[10px] text-slate-400">Dr. K. Raghavan</p>
                  </div>
                  <span className="font-bold font-mono text-blue-600 dark:text-blue-400">+91 94440 12345</span>
                </div>
                <div className="pt-2 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Hostel Warden Office (G-Block)</h4>
                    <p className="text-[10px] text-slate-400">Dr. Meera Sen</p>
                  </div>
                  <span className="font-bold font-mono text-blue-600 dark:text-blue-400">+91 94440 54321</span>
                </div>
                <div className="pt-2 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Campus 24x7 Ambulance Clinic</h4>
                    <p className="text-[10px] text-slate-400">College Medical Wing</p>
                  </div>
                  <span className="font-bold font-mono text-rose-600 dark:text-rose-400">+91 99999 00108</span>
                </div>
                <div className="pt-2 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-slate-200">Main Campus Security Gate</h4>
                    <p className="text-[10px] text-slate-400">Patrol Guards</p>
                  </div>
                  <span className="font-bold font-mono text-slate-700 dark:text-slate-300">+91 98888 12345</span>
                </div>
              </div>
              
              <button onClick={() => setEmergencyModal(false)} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-all">Close Directory</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
