import { db } from '../firebaseConfig';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy,
  writeBatch,
  getDocs
} from 'firebase/firestore';
import { Room, Booking, BookingStatus } from '../types';
import { INITIAL_ROOMS, MOCK_BOOKINGS } from '../constants';

const ROOMS_COLLECTION = 'rooms';
const BOOKINGS_COLLECTION = 'bookings';

// --- Rooms Operations ---

export const subscribeToRooms = (
  onUpdate: (rooms: Room[]) => void,
  onError?: (error: any) => void  // Add error callback parameter
) => {
  if (!db) return () => {};
  
  const q = query(collection(db, ROOMS_COLLECTION));
  return onSnapshot(
    q, 
    (snapshot) => {
      const rooms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Room[];
      onUpdate(rooms);
    }, 
    (error) => {
      console.error("Error subscribing to rooms:", error.message);
      if (onError) onError(error);  // Call the error callback if provided
    }
  );
};

export const addRoomToFirebase = async (room: Omit<Room, 'id'>) => {
  if (!db) throw new Error("Firebase not initialized");
  await addDoc(collection(db, ROOMS_COLLECTION), room);
};

export const updateRoomInFirebase = async (id: string, updates: Partial<Room>) => {
  if (!db) throw new Error("Firebase not initialized");
  const roomRef = doc(db, ROOMS_COLLECTION, id);
  await updateDoc(roomRef, updates);
};

export const deleteRoomFromFirebase = async (id: string) => {
  if (!db) throw new Error("Firebase not initialized");
  await deleteDoc(doc(db, ROOMS_COLLECTION, id));
};

// --- Bookings Operations ---

export const subscribeToBookings = (
  onUpdate: (bookings: Booking[]) => void,
  onError?: (error: any) => void  // Add error callback parameter
) => {
  if (!db) return () => {};

  const q = query(collection(db, BOOKINGS_COLLECTION), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q, 
    (snapshot) => {
      const bookings = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Booking[];
      onUpdate(bookings);
    }, 
    (error) => {
      console.error("Error subscribing to bookings:", error.message);
      if (onError) onError(error);  // Call the error callback if provided
    }
  );
};

export const addBookingToFirebase = async (booking: Omit<Booking, 'id'>) => {
  if (!db) throw new Error("Firebase not initialized");
  await addDoc(collection(db, BOOKINGS_COLLECTION), booking);
};

export const updateBookingStatusInFirebase = async (id: string, status: BookingStatus) => {
  if (!db) throw new Error("Firebase not initialized");
  const bookingRef = doc(db, BOOKINGS_COLLECTION, id);
  await updateDoc(bookingRef, { status });
};

// --- Utility: Seed Data ---

export const seedDatabase = async () => {
  if (!db) throw new Error("Firebase not initialized");
  
  const batch = writeBatch(db);
  
  // Check if we already have rooms
  const roomsSnapshot = await getDocs(collection(db, ROOMS_COLLECTION));
  if (!roomsSnapshot.empty) {
    console.log("Database already has data. Skipping seed.");
    return;
  }

  console.log("Seeding database...");

  // Add Rooms
  INITIAL_ROOMS.forEach(room => {
    const { id, ...roomData } = room; 
    const newRoomRef = doc(collection(db, ROOMS_COLLECTION));
    batch.set(newRoomRef, roomData);
  });

  await batch.commit();
  console.log("Database seeded successfully!");
};