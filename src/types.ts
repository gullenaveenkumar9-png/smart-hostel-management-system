export enum UserRole {
  STUDENT = 'student',
  WARDEN = 'warden',
  ADMIN = 'admin'
}

export interface Hostel {
  id: string;
  name: string;
  code: string;
  block: string;
  totalFloors: number;
  totalRooms: number;
  type: 'Boys' | 'Girls';
  wardenName: string;
}

export interface Room {
  id: string;
  roomNumber: string;
  block: string;
  floor: number;
  capacity: number;
  occupancy: number; // current number of students
  availableBeds: number;
  status: 'Available' | 'Full' | 'Maintenance';
  hostelId: string;
}

export interface Student {
  id: string;
  name: string;
  registerNumber: string;
  department: string;
  year: number; // 1, 2, 3, 4
  phone: string;
  parentPhone: string;
  email: string;
  hostelBlock: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  feeStatus: 'Paid' | 'Pending' | 'Overdue';
  attendance: number; // Attendance percentage (e.g., 85)
  profilePhoto: string;
}

export interface Warden {
  id: string;
  name: string;
  email: string;
  phone: string;
  blockResponsible: string;
  hostelId: string;
}

export interface LeaveApplication {
  id: string;
  studentId: string;
  studentName: string;
  roomNumber: string;
  startDate: string;
  endDate: string;
  reason: string;
  documentUrl?: string; // Uploaded file simulated url
  status: 'Pending' | 'Approved' | 'Rejected';
  remarks?: string;
  createdAt: string;
}

export interface Complaint {
  id: string;
  studentId: string;
  studentName: string;
  roomNumber: string;
  category: 'Electrical' | 'Plumbing' | 'Internet' | 'Cleaning' | 'Furniture' | 'Water Supply' | 'Others';
  description: string;
  status: 'Submitted' | 'Assigned' | 'In Progress' | 'Resolved' | 'Closed';
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  remarks?: string;
}

export interface Visitor {
  id: string;
  studentId: string;
  studentName: string;
  roomNumber: string;
  name: string;
  phone: string;
  relation: string;
  entryTime: string; // HH:MM or ISO timestamp
  exitTime: string;
  idProofType: string; // Adhaar, PAN, College ID
  idProofNumber: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  gatePassCode?: string; // QR code representation string
  createdAt: string;
}

export interface Payment {
  id: string;
  studentId: string;
  studentName: string;
  registerNumber: string;
  amount: number;
  type: 'Hostel Fee' | 'Mess Fee' | 'Laundry Fee' | 'Fine';
  method: 'UPI' | 'Card' | 'Net Banking';
  status: 'Paid' | 'Pending' | 'Overdue';
  paymentDate?: string;
  dueDate: string;
  transactionId?: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  roomNumber: string;
  date: string; // YYYY-MM-DD
  status: 'Present' | 'Absent' | 'Late';
  entryTime?: string; // HH:MM
  exitTime?: string; // HH:MM
  lateRemarks?: string;
}

export interface NotificationItem {
  id: string;
  userId: string; // studentId or 'all' or 'wardens'
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'alert';
  read: boolean;
  createdAt: string;
}

export interface MessMenuItem {
  id: string;
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  breakfast: string;
  lunch: string;
  snack: string;
  dinner: string;
}

export interface LaundryBooking {
  id: string;
  studentId: string;
  studentName: string;
  roomNumber: string;
  slotDate: string; // YYYY-MM-DD
  slotTime: string; // e.g., "09:00 AM - 11:00 AM"
  machineId: string; // Machine 1, Machine 2
  status: 'Booked' | 'In Use' | 'Completed' | 'Cancelled';
  createdAt: string;
}

export interface BroadcastNotice {
  id: string;
  title: string;
  content: string;
  audience: 'All' | 'Students' | 'Wardens';
  date: string;
  author: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

// Full State representation
export interface HostelDatabaseState {
  hostels: Hostel[];
  rooms: Room[];
  students: Student[];
  wardens: Warden[];
  leaves: LeaveApplication[];
  complaints: Complaint[];
  visitors: Visitor[];
  payments: Payment[];
  attendance: AttendanceRecord[];
  messMenu: MessMenuItem[];
  laundryBookings: LaundryBooking[];
  notices: BroadcastNotice[];
  notifications: NotificationItem[];
  auditLogs: AuditLog[];
}
