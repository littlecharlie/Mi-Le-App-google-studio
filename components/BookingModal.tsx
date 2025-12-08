import React, { useState, useEffect } from 'react';
import { Room, Booking, BookingStatus, RoomType } from '../types';
import { X, Calendar, User, Mail, CheckCircle, AlertCircle, MessageCircle, Users } from 'lucide-react';

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
  const [adults, setAdults] = useState(1);
  const [kids, setKids] = useState(0);
  const [details, setDetails] = useState({ name: '', email: '' });
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);

  // Reset state when room changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setDates({ checkIn: '', checkOut: '' });
      setGuests(1);
      setAdults(1);
      setKids(0);
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

  const calculateTotal = () => {
    if (!dates.checkIn || !dates.checkOut) return 0;
    const start = new Date(dates.checkIn);
    const end = new Date(dates.checkOut);
    if (start >= end) return 0;

    let total = 0;
    let current = new Date(start);

    while (current < end) {
      const day = current.getDay();
      // Friday (5) and Saturday (6) are weekend nights
      const isWeekend = day === 5 || day === 6;
      
      if (isWeekend && room.weekendPrice) {
        total += room.weekendPrice;
      } else {
        total += room.price;
      }
      
      current.setDate(current.getDate() + 1);
    }

    // For Resorts, price is per pax
    if (room.type === RoomType.RESORT) {
      total = total * (adults + kids);
    }

    return total;
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAvailable === false) return;

    const totalPrice = calculateTotal();

    // If Resort, redirect to WhatsApp
    if (room.type === RoomType.RESORT) {
      const phoneNumber = "60162157028";
      const message = `Hello, I would like to request a quote for ${room.name} (Resort).
      
Name: ${details.name}
Dates: ${dates.checkIn} to ${dates.checkOut}
Guests: ${adults} Adults, ${kids} Kids
Estimated Quote: $${totalPrice}

Is this available?`;
      
      const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      onClose();
      return;
    }

    // Normal booking flow
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

  const totalEstimate = calculateTotal();
  const isResort = room.type === RoomType.RESORT;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="bg-brand-600 p-6 flex justify-between items-center text-white">
          <h3 className="text-xl font-serif font-bold">
            {isResort ? 'Get Quote for' : 'Book'} {room.name}
          </h3>
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

          {isResort ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Adults</label>
                <div className="relative">
                  <Users className="absolute left-2 top-2.5 text-gray-400" size={16} />
                  <input
                    type="number"
                    min="1"
                    className="w-full pl-8 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    value={adults}
                    onChange={e => setAdults(Math.max(1, parseInt(e.target.value) || 0))}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Kids</label>
                <div className="relative">
                  <Users className="absolute left-2 top-2.5 text-gray-400" size={16} />
                  <input
                    type="number"
                    min="0"
                    className="w-full pl-8 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none"
                    value={kids}
                    onChange={e => setKids(Math.max(0, parseInt(e.target.value) || 0))}
                  />
                </div>
              </div>
            </div>
          ) : (
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
          )}

          <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-500">
                {isResort ? 'Estimated Quote' : 'Total Estimate'}
              </p>
              <p className="text-lg font-bold text-brand-700">
                ${totalEstimate}
              </p>
            </div>
            <button 
              type="submit"
              disabled={!isAvailable}
              className={`px-6 py-2 rounded-lg font-medium transition shadow-lg transform hover:-translate-y-0.5 flex items-center gap-2 ${
                isAvailable 
                  ? isResort ? 'bg-[#25D366] text-white hover:bg-[#128C7E]' : 'bg-brand-600 text-white hover:bg-brand-700'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none hover:translate-y-0'
              }`}
            >
              {isResort ? (
                <>
                  <MessageCircle size={18} />
                  Request Quote via WhatsApp
                </>
              ) : (
                'Request to Book'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};