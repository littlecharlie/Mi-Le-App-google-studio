import React, { useState, useEffect } from 'react';
import { Room, Booking, BookingStatus } from '../types';
import { X, Calendar, User, Mail, CheckCircle, AlertCircle } from 'lucide-react';

interface BookingModalProps {
  room: Room;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingDetails: any) => void;
  existingBookings: Booking[];
}

export const BookingModal: React.FC<BookingModalProps> = ({ room, isOpen, onClose, onConfirm, existingBookings }) => {
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
  const [guests, setGuests] = useState(1);
  const [details, setDetails] = useState({ name: '', email: '' });
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Reset state when room changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setDates({ checkIn: '', checkOut: '' });
      setGuests(1);
      setDetails({ name: '', email: '' });
      setIsAvailable(null);
    }
  }, [isOpen, room.id]);

  useEffect(() => {
    checkAvailability();
  }, [dates.checkIn, dates.checkOut]);

  const checkAvailability = () => {
    if (!dates.checkIn || !dates.checkOut) {
      setIsAvailable(null);
      return;
    }

    const start = new Date(dates.checkIn);
    const end = new Date(dates.checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Basic validation
    if (start < today || start >= end) {
      setIsAvailable(false);
      return;
    }

    const hasConflict = existingBookings.some(booking => {
      // Filter for this room and active bookings
      if (booking.roomId !== room.id || booking.status === BookingStatus.CANCELLED) return false;
      
      const bStart = new Date(booking.checkIn);
      const bEnd = new Date(booking.checkOut);

      // Check for overlap
      // Range 1 (User): start to end
      // Range 2 (Existing): bStart to bEnd
      // Overlap if: start < bEnd AND end > bStart
      return start < bEnd && end > bStart;
    });

    setIsAvailable(!hasConflict);
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAvailable === false) return;

    // Simple day calculation
    const start = new Date(dates.checkIn);
    const end = new Date(dates.checkOut);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
    const totalPrice = diffDays * room.price;

    onConfirm({
      ...details,
      ...dates,
      guests,
      roomId: room.id,
      totalPrice,
      roomName: room.name
    });
    onClose();
  };

  const getDays = () => {
    if (!dates.checkIn || !dates.checkOut) return 0;
    const start = new Date(dates.checkIn);
    const end = new Date(dates.checkOut);
    if (start >= end) return 0;
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 3600 * 24));
  };

  const days = getDays();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="bg-brand-600 p-6 flex justify-between items-center text-white">
          <h3 className="text-xl font-serif font-bold">Book {room.name}</h3>
          <button onClick={onClose} className="hover:bg-brand-700 p-1 rounded"><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <User size={16} /> Guest Details
            </label>
            <input
              required
              type="text"
              placeholder="Full Name"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none"
              value={details.name}
              onChange={e => setDetails({...details, name: e.target.value})}
            />
            <input
              required
              type="email"
              placeholder="Email Address"
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none"
              value={details.email}
              onChange={e => setDetails({...details, email: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Check In</label>
              <div className="relative">
                <Calendar className="absolute left-2 top-2.5 text-gray-400" size={16} />
                <input
                  required
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full pl-8 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  value={dates.checkIn}
                  onChange={e => setDates({...dates, checkIn: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase">Check Out</label>
              <div className="relative">
                <Calendar className="absolute left-2 top-2.5 text-gray-400" size={16} />
                <input
                  required
                  type="date"
                  min={dates.checkIn || new Date().toISOString().split('T')[0]}
                  className="w-full pl-8 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  value={dates.checkOut}
                  onChange={e => setDates({...dates, checkOut: e.target.value})}
                />
              </div>
            </div>
          </div>

          {/* Availability Status */}
          {dates.checkIn && dates.checkOut && (
            <div className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium ${
              isAvailable 
                ? 'bg-green-50 text-green-700 border border-green-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {isAvailable ? (
                <>
                  <CheckCircle size={16} />
                  <span>Dates are available!</span>
                </>
              ) : (
                <>
                  <AlertCircle size={16} />
                  <span>Room is not available for these dates.</span>
                </>
              )}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">Guests</label>
            <select 
              value={guests} 
              onChange={e => setGuests(Number(e.target.value))}
              className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500"
            >
              {[...Array(room.capacity)].map((_, i) => (
                <option key={i} value={i + 1}>{i + 1} Guest{i > 0 ? 's' : ''}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">Total Estimate</p>
              <p className="text-lg font-bold text-brand-700">
                ${days > 0 ? days * room.price : 0}
              </p>
            </div>
            <button 
              type="submit"
              disabled={!isAvailable}
              className={`px-6 py-2 rounded-lg font-medium transition shadow-lg transform hover:-translate-y-0.5 ${
                isAvailable 
                  ? 'bg-brand-600 text-white hover:bg-brand-700 hover:shadow-xl' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none hover:translate-y-0'
              }`}
            >
              Request to Book
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};