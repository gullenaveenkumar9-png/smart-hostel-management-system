import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { HostelDatabaseState, UserRole } from './src/types';

// Load env variables
dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Paths
const DB_FILE = path.join(process.cwd(), 'hostel_db.json');

// Initialize Gemini client (server-side only)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper: Initial Rich Database State
const getInitialState = (): HostelDatabaseState => {
  return {
    hostels: [
      { id: 'h1', name: 'Aryabhata Block (A-Block)', code: 'ARYA-A', block: 'A', totalFloors: 4, totalRooms: 40, type: 'Boys', wardenName: 'Dr. K. Raghavan' },
      { id: 'h2', name: 'Gargi Block (G-Block)', code: 'GARG-G', block: 'G', totalFloors: 3, totalRooms: 30, type: 'Girls', wardenName: 'Dr. Meera Sen' },
    ],
    rooms: [
      { id: 'r1', roomNumber: 'A101', block: 'A', floor: 1, capacity: 3, occupancy: 2, availableBeds: 1, status: 'Available', hostelId: 'h1' },
      { id: 'r2', roomNumber: 'A102', block: 'A', floor: 1, capacity: 2, occupancy: 2, availableBeds: 0, status: 'Full', hostelId: 'h1' },
      { id: 'r3', roomNumber: 'A201', block: 'A', floor: 2, capacity: 3, occupancy: 2, availableBeds: 1, status: 'Available', hostelId: 'h1' },
      { id: 'r4', roomNumber: 'A202', block: 'A', floor: 2, capacity: 2, occupancy: 1, availableBeds: 1, status: 'Available', hostelId: 'h1' },
      { id: 'r5', roomNumber: 'A301', block: 'A', floor: 3, capacity: 4, occupancy: 0, availableBeds: 4, status: 'Available', hostelId: 'h1' },
      { id: 'r6', roomNumber: 'A302', block: 'A', floor: 3, capacity: 2, occupancy: 0, availableBeds: 2, status: 'Maintenance', hostelId: 'h1' },
      
      { id: 'r7', roomNumber: 'G101', block: 'G', floor: 1, capacity: 2, occupancy: 2, availableBeds: 0, status: 'Full', hostelId: 'h2' },
      { id: 'r8', roomNumber: 'G102', block: 'G', floor: 1, capacity: 2, occupancy: 1, availableBeds: 1, status: 'Available', hostelId: 'h2' },
      { id: 'r9', roomNumber: 'G201', block: 'G', floor: 2, capacity: 3, occupancy: 2, availableBeds: 1, status: 'Available', hostelId: 'h2' },
      { id: 'r10', roomNumber: 'G202', block: 'G', floor: 2, capacity: 2, occupancy: 0, availableBeds: 2, status: 'Available', hostelId: 'h2' },
    ],
    students: [
      { id: 's1', name: 'Aarav Sharma', registerNumber: '2023CSE012', department: 'Computer Science', year: 3, phone: '+91 98765 43210', parentPhone: '+91 98765 43211', email: 'aarav.sharma@college.edu', hostelBlock: 'A', roomNumber: 'A101', checkInDate: '2025-07-15', checkOutDate: '2026-05-30', feeStatus: 'Paid', attendance: 92, profilePhoto: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120' },
      { id: 's2', name: 'Rohan Verma', registerNumber: '2024ECE045', department: 'Electronics & Communication', year: 2, phone: '+91 87654 32109', parentPhone: '+91 87654 32100', email: 'rohan.verma@college.edu', hostelBlock: 'A', roomNumber: 'A102', checkInDate: '2025-07-16', checkOutDate: '2026-05-30', feeStatus: 'Pending', attendance: 84, profilePhoto: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120' },
      { id: 's3', name: 'Sameer Khan', registerNumber: '2023IT089', department: 'Information Technology', year: 3, phone: '+91 76543 21098', parentPhone: '+91 76543 21099', email: 'sameer.khan@college.edu', hostelBlock: 'A', roomNumber: 'A101', checkInDate: '2025-07-15', checkOutDate: '2026-05-30', feeStatus: 'Paid', attendance: 95, profilePhoto: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120' },
      { id: 's4', name: 'Vikram Singh', registerNumber: '2024ME034', department: 'Mechanical Engineering', year: 2, phone: '+91 65432 10987', parentPhone: '+91 65432 10988', email: 'vikram.singh@college.edu', hostelBlock: 'A', roomNumber: 'A102', checkInDate: '2025-07-17', checkOutDate: '2026-05-30', feeStatus: 'Paid', attendance: 78, profilePhoto: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=120' },
      { id: 's5', name: 'Arjun Mehta', registerNumber: '2023CSE055', department: 'Computer Science', year: 3, phone: '+91 99887 76655', parentPhone: '+91 99887 76644', email: 'arjun.mehta@college.edu', hostelBlock: 'A', roomNumber: 'A201', checkInDate: '2025-07-15', checkOutDate: '2026-05-30', feeStatus: 'Overdue', attendance: 88, profilePhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120' },
      { id: 's6', name: 'Devendra Joshi', registerNumber: '2023EEE021', department: 'Electrical Engineering', year: 3, phone: '+91 88776 65544', parentPhone: '+91 88776 65533', email: 'devendra.joshi@college.edu', hostelBlock: 'A', roomNumber: 'A201', checkInDate: '2025-07-15', checkOutDate: '2026-05-30', feeStatus: 'Paid', attendance: 91, profilePhoto: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&q=80&w=120' },
      { id: 's7', name: 'Kabir Thapar', registerNumber: '2025CSE003', department: 'Computer Science', year: 1, phone: '+91 77665 54433', parentPhone: '+91 77665 54422', email: 'kabir.thapar@college.edu', hostelBlock: 'A', roomNumber: 'A202', checkInDate: '2025-07-20', checkOutDate: '2026-05-30', feeStatus: 'Pending', attendance: 85, profilePhoto: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120' },

      { id: 's8', name: 'Aditi Iyer', registerNumber: '2022ECE018', department: 'Electronics & Communication', year: 4, phone: '+91 91234 56789', parentPhone: '+91 91234 56780', email: 'aditi.iyer@college.edu', hostelBlock: 'G', roomNumber: 'G101', checkInDate: '2025-07-15', checkOutDate: '2026-05-30', feeStatus: 'Paid', attendance: 96, profilePhoto: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120' },
      { id: 's9', name: 'Priya Patel', registerNumber: '2025CSE102', department: 'Computer Science', year: 1, phone: '+91 82345 67890', parentPhone: '+91 82345 67891', email: 'priya.patel@college.edu', hostelBlock: 'G', roomNumber: 'G102', checkInDate: '2025-07-19', checkOutDate: '2026-05-30', feeStatus: 'Pending', attendance: 90, profilePhoto: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120' },
      { id: 's10', name: 'Neha Reddy', registerNumber: '2022CSE090', department: 'Computer Science', year: 4, phone: '+91 72345 67891', parentPhone: '+91 72345 67892', email: 'neha.reddy@college.edu', hostelBlock: 'G', roomNumber: 'G101', checkInDate: '2025-07-15', checkOutDate: '2026-05-30', feeStatus: 'Paid', attendance: 94, profilePhoto: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120' },
      { id: 's11', name: 'Ananya Sen', registerNumber: '2024IT022', department: 'Information Technology', year: 2, phone: '+91 62345 67892', parentPhone: '+91 62345 67893', email: 'ananya.sen@college.edu', hostelBlock: 'G', roomNumber: 'G201', checkInDate: '2025-07-16', checkOutDate: '2026-05-30', feeStatus: 'Overdue', attendance: 81, profilePhoto: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=120' },
      { id: 's12', name: 'Riya Das', registerNumber: '2024ECE061', department: 'Electronics & Communication', year: 2, phone: '+91 52345 67893', parentPhone: '+91 52345 67894', email: 'riya.das@college.edu', hostelBlock: 'G', roomNumber: 'G201', checkInDate: '2025-07-16', checkOutDate: '2026-05-30', feeStatus: 'Paid', attendance: 89, profilePhoto: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120' },
    ],
    wardens: [
      { id: 'w1', name: 'Dr. K. Raghavan', email: 'k.raghavan@college.edu', phone: '+91 94440 12345', blockResponsible: 'A', hostelId: 'h1' },
      { id: 'w2', name: 'Dr. Meera Sen', email: 'meera.sen@college.edu', phone: '+91 94440 54321', blockResponsible: 'G', hostelId: 'h2' },
    ],
    leaves: [
      { id: 'l1', studentId: 's3', studentName: 'Sameer Khan', roomNumber: 'A101', startDate: '2026-07-10', endDate: '2026-07-13', reason: "Sister's wedding ceremony in hometown", status: 'Approved', remarks: 'Approved. Parents confirmed via call.', createdAt: '2026-07-05T14:30:00Z' },
      { id: 'l2', studentId: 's10', studentName: 'Neha Reddy', roomNumber: 'G101', startDate: '2026-07-12', endDate: '2026-07-15', reason: 'Fever and viral checkup with family doctor', status: 'Pending', createdAt: '2026-07-06T09:15:00Z' },
      { id: 'l3', studentId: 's2', studentName: 'Rohan Verma', roomNumber: 'A102', startDate: '2026-07-01', endDate: '2026-07-04', reason: 'Emergency family emergency', status: 'Approved', remarks: 'Emergency leave approved.', createdAt: '2026-06-29T10:00:00Z' },
      { id: 'l4', studentId: 's11', studentName: 'Ananya Sen', roomNumber: 'G201', startDate: '2026-07-20', endDate: '2026-07-24', reason: 'Participating in National Hackathon', status: 'Pending', createdAt: '2026-07-07T08:00:00Z' },
    ],
    complaints: [
      { id: 'c1', studentId: 's1', studentName: 'Aarav Sharma', roomNumber: 'A101', category: 'Electrical', description: 'Ceiling fan regulator is broken, running at max speed continuously.', status: 'In Progress', createdAt: '2026-07-05T11:20:00Z', updatedAt: '2026-07-06T15:00:00Z', remarks: 'Electrician assigned.' },
      { id: 'c2', studentId: 's8', studentName: 'Aditi Iyer', roomNumber: 'G101', category: 'Internet', description: 'Wi-Fi disconnects every 5 minutes on the first floor and speed is below 1Mbps.', status: 'Submitted', createdAt: '2026-07-07T09:30:00Z', updatedAt: '2026-07-07T09:30:00Z' },
      { id: 'c3', studentId: 's4', studentName: 'Vikram Singh', roomNumber: 'A102', category: 'Plumbing', description: 'Bathroom shower faucet has a persistent, loud dripping leak.', status: 'Resolved', createdAt: '2026-07-04T08:45:00Z', updatedAt: '2026-07-05T16:20:00Z', remarks: 'Tap washer replaced, leak arrested.' },
      { id: 'c4', studentId: 's9', studentName: 'Priya Patel', roomNumber: 'G102', category: 'Cleaning', description: 'Dustbin on 1st floor corridor is overflowing and not cleaned today.', status: 'Submitted', createdAt: '2026-07-07T10:10:00Z', updatedAt: '2026-07-07T10:10:00Z' },
    ],
    visitors: [
      { id: 'v1', studentId: 's8', studentName: 'Aditi Iyer', roomNumber: 'G101', name: 'Suresh Iyer', phone: '+91 98840 98840', relation: 'Father', entryTime: '10:00 AM', exitTime: '04:00 PM', idProofType: 'Aadhaar Card', idProofNumber: '1234-5678-9012', status: 'Approved', gatePassCode: 'PASS_V1_7281', createdAt: '2026-07-06T11:00:00Z' },
      { id: 'v2', studentId: 's1', studentName: 'Aarav Sharma', roomNumber: 'A101', name: 'Sunita Sharma', phone: '+91 97730 97730', relation: 'Mother', entryTime: '02:00 PM', exitTime: '06:00 PM', idProofType: 'PAN Card', idProofNumber: 'ABCDE1234F', status: 'Pending', createdAt: '2026-07-07T09:00:00Z' },
    ],
    payments: [
      { id: 'p1', studentId: 's1', studentName: 'Aarav Sharma', registerNumber: '2023CSE012', amount: 85000, type: 'Hostel Fee', method: 'UPI', status: 'Paid', paymentDate: '2025-07-10', dueDate: '2025-07-31', transactionId: 'TXN891238910' },
      { id: 'p2', studentId: 's1', studentName: 'Aarav Sharma', registerNumber: '2023CSE012', amount: 35000, type: 'Mess Fee', method: 'UPI', status: 'Paid', paymentDate: '2025-07-10', dueDate: '2025-07-31', transactionId: 'TXN891238911' },
      { id: 'p3', studentId: 's2', studentName: 'Rohan Verma', registerNumber: '2024ECE045', amount: 85000, type: 'Hostel Fee', method: 'Card', status: 'Pending', dueDate: '2026-07-15' },
      { id: 'p4', studentId: 's2', studentName: 'Rohan Verma', registerNumber: '2024ECE045', amount: 35000, type: 'Mess Fee', method: 'Card', status: 'Paid', paymentDate: '2025-07-12', dueDate: '2025-07-31', transactionId: 'TXN891238942' },
      { id: 'p5', studentId: 's5', studentName: 'Arjun Mehta', registerNumber: '2023CSE055', amount: 85000, type: 'Hostel Fee', method: 'Net Banking', status: 'Overdue', dueDate: '2026-06-30' },
      { id: 'p6', studentId: 's11', studentName: 'Ananya Sen', registerNumber: '2024IT022', amount: 35000, type: 'Mess Fee', method: 'UPI', status: 'Overdue', dueDate: '2026-06-30' },
      { id: 'p7', studentId: 's8', studentName: 'Aditi Iyer', registerNumber: '2022ECE018', amount: 85000, type: 'Hostel Fee', method: 'UPI', status: 'Paid', paymentDate: '2025-07-08', dueDate: '2025-07-31', transactionId: 'TXN891238977' },
      { id: 'p8', studentId: 's8', studentName: 'Aditi Iyer', registerNumber: '2022ECE018', amount: 35000, type: 'Mess Fee', method: 'UPI', status: 'Paid', paymentDate: '2025-07-08', dueDate: '2025-07-31', transactionId: 'TXN891238978' },
      { id: 'p9', studentId: 's8', studentName: 'Aditi Iyer', registerNumber: '2022ECE018', amount: 1200, type: 'Laundry Fee', method: 'UPI', status: 'Paid', paymentDate: '2026-07-02', dueDate: '2026-07-10', transactionId: 'TXN891238995' },
    ],
    attendance: [
      { id: 'att1', studentId: 's1', studentName: 'Aarav Sharma', roomNumber: 'A101', date: '2026-07-07', status: 'Present', entryTime: '08:15 PM', exitTime: '10:00 PM' },
      { id: 'att2', studentId: 's2', studentName: 'Rohan Verma', roomNumber: 'A102', date: '2026-07-07', status: 'Late', entryTime: '10:15 PM', exitTime: '10:30 PM', lateRemarks: 'Late entry after 10:00 PM curfew without gatepass.' },
      { id: 'att3', studentId: 's3', studentName: 'Sameer Khan', roomNumber: 'A101', date: '2026-07-07', status: 'Present', entryTime: '07:30 PM', exitTime: '10:00 PM' },
      { id: 'att4', studentId: 's4', studentName: 'Vikram Singh', roomNumber: 'A102', date: '2026-07-07', status: 'Absent' },
      { id: 'att5', studentId: 's8', studentName: 'Aditi Iyer', roomNumber: 'G101', date: '2026-07-07', status: 'Present', entryTime: '08:30 PM', exitTime: '09:45 PM' },
      { id: 'att6', studentId: 's9', studentName: 'Priya Patel', roomNumber: 'G102', date: '2026-07-07', status: 'Present', entryTime: '08:00 PM', exitTime: '09:30 PM' },
      { id: 'att7', studentId: 's10', studentName: 'Neha Reddy', roomNumber: 'G101', date: '2026-07-07', status: 'Present', entryTime: '08:45 PM', exitTime: '09:50 PM' },
    ],
    messMenu: [
      { id: 'm1', day: 'Monday', breakfast: 'Idli, Sambar, Coconut Chutney, Tea/Coffee', lunch: 'Rice, Dal Fry, Bhindi Masala, Roti, Curd', snack: 'Samosa, Mint Chutney, Tea', dinner: 'Jeera Rice, Paneer Butter Masala, Roti, Salad' },
      { id: 'm2', day: 'Tuesday', breakfast: 'Aloo Paratha, Butter, Pickle, Curd, Tea/Coffee', lunch: 'Veg Pulav, Kadhi, Aloo Gobhi, Papad', snack: 'Veg Cutlet, Tomato Ketchup, Tea', dinner: 'Rice, Mixed Veg Curry, Dal Tadka, Chapati' },
      { id: 'm3', day: 'Wednesday', breakfast: 'Poha, Sev, Lemon, Jalebi, Tea/Coffee', lunch: 'Rice, Rajma Masala, Roti, Baingan Bharta', snack: 'Dhokla, Green Chutney, Tea', dinner: 'Veg Biryani, Raita, Roti, Egg Curry (Optional), Paneer' },
      { id: 'm4', day: 'Thursday', breakfast: 'Puri, Aloo Masala, Halwa, Tea/Coffee', lunch: 'Rice, Chole, Bhature, Cucumber Salad', snack: 'Bread Pakora, Tea', dinner: 'Rice, Dal Makhani, Gobhi Matar, Chapati' },
      { id: 'm5', day: 'Friday', breakfast: 'Bread Butter Toast, Jam, Omelette/Sprouts, Banana, Milk', lunch: 'Veg Fried Rice, Manchurian, Sweet Corn Soup', snack: 'Bhel Puri, Lemonade, Tea', dinner: 'Kashmiri Pulav, Malai Kofta, Naan, Gulab Jamun' },
      { id: 'm6', day: 'Saturday', breakfast: 'Uttapam, Tomato Chutney, Sambhar, Tea/Coffee', lunch: 'Rice, Sambhar, Potato Fry, Rasam, Appalam', snack: 'Onion Pakoda, Tea', dinner: 'Khichdi, Kadhi, Aloo Baingan, Chapati' },
      { id: 'm7', day: 'Sunday', breakfast: 'Chole Bhature, Sweet Lassi, Tea/Coffee', lunch: 'Special Veg Paneer Thali / Chicken Biryani (Non-Veg), Raita, Ice Cream', snack: 'Pani Puri / Chaat, Tea', dinner: 'Rice, Dal Tadka, Veg Jalfrezi, Roti, Custard' },
    ],
    laundryBookings: [
      { id: 'lb1', studentId: 's1', studentName: 'Aarav Sharma', roomNumber: 'A101', slotDate: '2026-07-07', slotTime: '09:00 AM - 11:00 AM', machineId: 'M-01', status: 'Completed', createdAt: '2026-07-06T15:00:00Z' },
      { id: 'lb2', studentId: 's8', studentName: 'Aditi Iyer', roomNumber: 'G101', slotDate: '2026-07-08', slotTime: '11:00 AM - 01:00 PM', machineId: 'M-02', status: 'Booked', createdAt: '2026-07-07T08:30:00Z' },
    ],
    notices: [
      { id: 'n1', title: 'Hostel Fee Payment Deadline Extension', content: 'The last date for payment of hostel and mess fees has been extended to July 15, 2026. Please make sure to pay in full to avoid overdue penalties of 10% fine.', audience: 'All', date: '2026-07-05', author: 'Chief Administrator' },
      { id: 'n2', title: 'Biometric Attendance Mandatory Registration', content: 'All residents of Aryabhata and Gargi blocks must register their fingerprints at the warden office for the new smart biometric lock system by July 10, 2026.', audience: 'All', date: '2026-07-04', author: 'Hostel Committee' },
      { id: 'n3', title: 'Annual Inter-Hostel Sports Meet 2026', content: 'Registrations are open for the annual sports tournament starting next month. Sports include Football, Basketball, Table Tennis, Chess, and Badminton. Register with your block sports coordinator.', audience: 'Students', date: '2026-07-01', author: 'Warden Office' },
    ],
    notifications: [
      { id: 'no1', userId: 's2', title: 'Fee Payment Pending', message: 'Your Hostel Fee for academic year 2026 is pending. Please complete payment before July 15.', type: 'warning', read: false, createdAt: '2026-07-05T08:00:00Z' },
      { id: 'no2', userId: 's3', title: 'Leave Approved', message: 'Your leave application starting 2026-07-10 has been approved by Warden Dr. K. Raghavan.', type: 'success', read: false, createdAt: '2026-07-05T14:35:00Z' },
      { id: 'no3', userId: 's8', title: 'Visitor Approved', message: 'Your visitor request for Suresh Iyer on 2026-07-06 has been approved. Gatepass PASS_V1_7281 is generated.', type: 'success', read: true, createdAt: '2026-07-06T11:05:00Z' },
      { id: 'no4', userId: 'all', title: 'New Notice Broadcasted', message: 'Chief Administrator has broadcasted a notice: "Hostel Fee Payment Deadline Extension". Check Notices tab.', type: 'info', read: false, createdAt: '2026-07-05T10:00:00Z' },
    ],
    auditLogs: [
      { id: 'log1', timestamp: '2026-07-05T10:00:00Z', user: 'Admin', action: 'CREATE_NOTICE', details: 'Broadcasted Hostel Fee Payment Deadline Extension notice.' },
      { id: 'log2', timestamp: '2026-07-05T14:30:00Z', user: 'Dr. K. Raghavan', action: 'APPROVE_LEAVE', details: 'Approved leave request for Sameer Khan (Room A101).' },
      { id: 'log3', timestamp: '2026-07-06T11:00:00Z', user: 'Dr. Meera Sen', action: 'APPROVE_VISITOR', details: 'Approved visitor Suresh Iyer for Aditi Iyer (G101).' },
      { id: 'log4', timestamp: '2026-07-07T08:30:00Z', user: 'Admin', action: 'ADD_STUDENT', details: 'Enrolled Kabir Thapar into block A room A202.' },
    ]
  };
};

// Database Loading / Saving
let dbState: HostelDatabaseState;

try {
  if (fs.existsSync(DB_FILE)) {
    dbState = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } else {
    dbState = getInitialState();
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
  }
} catch (e) {
  console.error("Failed to read database file, initializing empty or default state.", e);
  dbState = getInitialState();
}

function saveDatabase() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dbState, null, 2), 'utf-8');
  } catch (err) {
    console.error("Error writing database state to disk", err);
  }
}

// REST API Endpoints
app.get('/api/db', (req, res) => {
  res.json(dbState);
});

app.post('/api/db', (req, res) => {
  try {
    dbState = req.body;
    saveDatabase();
    res.json({ success: true, message: 'Database state updated successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

app.post('/api/db/update', (req, res) => {
  try {
    const { key, value } = req.body;
    if (key in dbState) {
      (dbState as any)[key] = value;
      saveDatabase();
      res.json({ success: true, message: `Field ${key} updated successfully` });
    } else {
      res.status(400).json({ success: false, error: 'Invalid field key' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
  }
});

// Gemini Assistant endpoint
app.post('/api/gemini/assistant', async (req, res) => {
  try {
    const { message, userRole, userId, userName } = req.body;

    if (!message) {
      return res.status(400).json({ reply: 'Prompt cannot be empty.' });
    }

    // Prepare dense current snapshot context to inject into Gemini prompt
    // This allows Gemini to answer queries about actual rooms, leaves, complaints, etc.
    const userRoleStr = userRole || 'student';
    
    // Select relevant slice of database to keep tokens bounded and relevant
    const contextSummary = {
      hostels: dbState.hostels,
      roomsCount: dbState.rooms.length,
      availableRooms: dbState.rooms.filter(r => r.status === 'Available').map(r => r.roomNumber),
      maintenanceRooms: dbState.rooms.filter(r => r.status === 'Maintenance').map(r => r.roomNumber),
      students: dbState.students.map(s => ({
        id: s.id,
        name: s.name,
        registerNumber: s.registerNumber,
        room: s.roomNumber,
        block: s.hostelBlock,
        feeStatus: s.feeStatus,
        attendance: s.attendance
      })),
      leaves: dbState.leaves.map(l => ({
        id: l.id,
        studentName: l.studentName,
        room: l.roomNumber,
        startDate: l.startDate,
        endDate: l.endDate,
        reason: l.reason,
        status: l.status
      })),
      complaints: dbState.complaints.map(c => ({
        id: c.id,
        studentName: c.studentName,
        category: c.category,
        description: c.description,
        status: c.status
      })),
      visitors: dbState.visitors.map(v => ({
        studentName: v.studentName,
        visitorName: v.name,
        relation: v.relation,
        status: v.status
      })),
      paymentsPendingCount: dbState.payments.filter(p => p.status !== 'Paid').length,
      attendanceSummary: `Average attendance of residents is ~89%. Today registered ${dbState.attendance.filter(a => a.status === 'Present').length} present and ${dbState.attendance.filter(a => a.status === 'Absent').length} absent.`,
      messTimings: "Breakfast: 07:30 AM - 09:00 AM, Lunch: 12:30 PM - 02:00 PM, Snack: 05:00 PM - 06:00 PM, Dinner: 07:30 PM - 09:00 PM.",
      messMenu: dbState.messMenu
    };

    const systemInstruction = `You are the Intelligent AI Assistant for the Smart Hostel Management System. 
You provide clear, accurate, natural language responses to help residents (Students), Wardens, and Admins operate the hostel.

Current App Date & Context: 2026-07-07.
You are talking to: ${userName || 'User'} who holds the user role: ${userRoleStr.toUpperCase()} (ID: ${userId || 'unknown'}).

Here is the entire current live database snapshot of the hostel system:
${JSON.stringify(contextSummary, null, 2)}

Instructions:
1. If the user is a STUDENT, answer their personal questions using their data (e.g. "my fee balance" or "my leave status").
2. If they ask about empty rooms, list the available ones: ${contextSummary.availableRooms.join(', ') || 'None available'}.
3. If they ask about complaints, summarize them.
4. If they ask about mess menus, look up the appropriate day or provide a summarized answer.
5. If the user is a WARDEN, they can ask about "students with pending fees", "empty rooms", "attendance summary", or "complaint summary". Provide summaries directly.
6. Provide polite, authoritative, friendly and concise answers. Always stick to the actual facts in the database snapshot, do not hallucinate details.
7. Keep answers formatted nicely in markdown (with bolding, bullets, or short tables if helpful). Keep it highly professional and direct.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: message,
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      }
    });

    const reply = response.text || "I'm sorry, I encountered an issue processing that request. Please try again.";
    res.json({ reply });
  } catch (err) {
    console.error("Gemini assistant error:", err);
    res.status(500).json({ error: 'Failed to generate response from Gemini AI. ' + (err instanceof Error ? err.message : String(err)) });
  }
});

// Vite Middleware & Static Serving Setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log("Vite development server middleware loaded.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log("Serving static production assets from /dist.");
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Smart Hostel Management System full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
