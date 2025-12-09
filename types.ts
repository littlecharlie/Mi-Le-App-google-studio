export enum UserRole {
  CUSTOMER = 'CUSTOMER',
  STAFF = 'STAFF',
  ADMIN = 'ADMIN'
}

export enum RoomType {
  ROOM = 'Room',
  SUITE = 'Suite',
  CHALET = 'Chalet',
  RESORT = 'Resort'
}

export enum BookingStatus {
  PENDING = 'Pending',
  CONFIRMED = 'Confirmed',
  CHECKED_IN = 'Checked In',
  CHECKED_OUT = 'Checked Out',
  CANCELLED = 'Cancelled'
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  price: number; // Weekday Price
  weekendPrice?: number; // Weekend Price
  description: string;
  imageUrl: string;
  images?: string[]; 
  amenities: string[];
  capacity: number;
  manualPricing?: boolean; // New field for manual pricing flag
}

export interface Booking {
  id: string;
  roomId: string;
  customerName: string;
  customerEmail: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: BookingStatus;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}