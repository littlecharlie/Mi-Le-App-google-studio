import React, { useState } from 'react';
import { Room } from '../types';
import { X, Calendar, User, Mail } from 'lucide-react';

interface BookingModalProps {
  room: Room;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (bookingDetails: any) => void;
}

export const BookingModal: React.FC<BookingModalProps> = ({ room, isOpen, onClose, onConfirm }) => {
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
  const [guests, setGuests] = useState(1);
  const [details, setDetails] = useState({ name: '', email: '' });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
                  className="w-full pl-8 p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  value={dates.checkOut}
                  onChange={e => setDates({...dates, checkOut: e.target.value})}
                />
              </div>
            </div>
          </div>

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
                ${dates.checkIn && dates.checkOut ? 
                  (Math.ceil(Math.abs(new Date(dates.checkOut).getTime() - new Date(dates.checkIn).getTime()) / (1000 * 3600 * 24)) * room.price) : 0}
              </p>
            </div>
            <button 
              type="submit"
              className="bg-brand-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-brand-700 transition shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Confirm Booking
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
