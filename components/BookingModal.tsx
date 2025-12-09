import React, { useState, useEffect } from 'react';
import { Room, Booking, BookingStatus, RoomType } from '../types';
import { X, Calendar, User, Mail, CheckCircle, AlertCircle, MessageCircle, Users, Check } from 'lucide-react';
import { ImageCarousel } from './ImageCarousel';

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

  // Helper for rendering Room Details (Shared between desktop left panel and mobile top section)
  const RoomDetailsContent = () => (
    <>
       <div className="mb-6">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-2">About this stay</h3>
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm md:text-base">
              {room.description}
            </p>
        </div>

        <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Amenities</h3>
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              {room.amenities.map((amenity, idx) => (
                <div key={idx} className="flex items-center gap-2 text-gray-600 dark:text-gray-300 text-sm">
                  <Check size={14} className="text-brand-600 dark:text-brand-400 shrink-0" />
                  <span>{amenity}</span>
                </div>
              ))}
            </div>
        </div>
    </>
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-0 md:p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 md:rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden animate-fade-in-up flex flex-col md:flex-row h-full md:h-auto md:max-h-[85vh]">
        
        {/* Left Panel: Room Details (Desktop Only) */}
        <div className="hidden md:flex md:w-1/2 bg-gray-50 dark:bg-gray-900 flex-col relative overflow-hidden">
            {/* Image Carousel */}
            <div className="h-64 md:h-80 w-full shrink-0 relative">
               <ImageCarousel images={room.images || [room.imageUrl]} alt={room.name} />
               <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-6 pt-12 text-white">
                  <h2 className="text-2xl font-serif font-bold">{room.name}</h2>
                  <div className="flex items-center gap-2 mt-2 text-sm opacity-90">
                     <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded-md">{room.type}</span>
                     <span>•</span>
                     <span>Max {room.capacity} Guests</span>
                  </div>
               </div>
            </div>

            {/* Scrollable Description */}
            <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                <RoomDetailsContent />
            </div>
        </div>

        {/* Right Panel: Booking Form (And Mobile Details) */}
        <div className="w-full md:w-1/2 flex flex-col bg-white dark:bg-gray-800 border-l border-gray-100 dark:border-gray-700 h-full">
          {/* Header */}
          <div className="p-4 md:p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-800 sticky top-0 z-20">
            <div>
              <h3 className="font-bold text-lg text-gray-800 dark:text-white">
                {isResort ? 'Request Quote' : 'Reserve Your Stay'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 hidden md:block">
                {isResort 
                  ? 'Get a personalized quote via WhatsApp' 
                  : 'Best rates guaranteed direct booking'}
              </p>
            </div>
            {/* Close button */}
            <button 
              onClick={onClose} 
              className="hover:bg-gray-100 dark:hover:bg-gray-700 p-2 rounded-full transition text-gray-500 dark:text-gray-400"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar relative">
             {/* Mobile Only: Room Details Section */}
             <div className="md:hidden pb-6">
                <div className="h-56 relative w-full">
                   <ImageCarousel images={room.images || [room.imageUrl]} alt={room.name} />
                   <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-4 pt-10 text-white">
                      <h2 className="text-xl font-serif font-bold">{room.name}</h2>
                      <div className="flex items-center gap-2 mt-1 text-xs opacity-90">
                         <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded">{room.type}</span>
                         <span>Max {room.capacity} Guests</span>
                      </div>
                   </div>
                </div>
                <div className="px-5 pt-5">
                   <RoomDetailsContent />
                </div>
                <div className="h-2 bg-gray-50 dark:bg-gray-700 mt-6 border-y border-gray-100 dark:border-gray-600" />
             </div>

            <form id="booking-form" onSubmit={handleSubmit} className="space-y-5 p-5 md:p-6">
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Check In</label>
                   <div className="relative">
                     <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                     <input
                       required
                       type="date"
                       min={new Date().toISOString().split('T')[0]}
                       className="w-full pl-10 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm text-gray-900 dark:text-white"
                       value={dates.checkIn}
                       onChange={e => setDates({...dates, checkIn: e.target.value})}
                     />
                   </div>
                 </div>
                 <div className="space-y-1.5">
                   <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Check Out</label>
                   <div className="relative">
                     <Calendar className="absolute left-3 top-3 text-gray-400" size={16} />
                     <input
                       required
                       type="date"
                       min={dates.checkIn || new Date().toISOString().split('T')[0]}
                       className="w-full pl-10 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm text-gray-900 dark:text-white"
                       value={dates.checkOut}
                       onChange={e => setDates({...dates, checkOut: e.target.value})}
                     />
                   </div>
                 </div>
               </div>

               {isResort ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Adults</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 text-gray-400" size={16} />
                      <input
                        type="number"
                        min="1"
                        className="w-full pl-10 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm text-gray-900 dark:text-white"
                        value={adults}
                        onChange={e => setAdults(Math.max(1, parseInt(e.target.value) || 0))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Kids</label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 text-gray-400" size={16} />
                      <input
                        type="number"
                        min="0"
                        className="w-full pl-10 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm text-gray-900 dark:text-white"
                        value={kids}
                        onChange={e => setKids(Math.max(0, parseInt(e.target.value) || 0))}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Guests</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-3 text-gray-400" size={16} />
                    <select 
                      value={guests} 
                      onChange={e => setGuests(Number(e.target.value))}
                      className="w-full pl-10 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm appearance-none text-gray-900 dark:text-white"
                    >
                      {[...Array(room.capacity)].map((_, i) => (
                        <option key={i} value={i + 1}>{i + 1} Guest{i > 0 ? 's' : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

               <div className="space-y-3 pt-2">
                 <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Contact Information</h4>
                 <div className="relative">
                    <User className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input
                      required
                      type="text"
                      placeholder="Full Name"
                      className="w-full pl-10 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      value={details.name}
                      onChange={e => setDetails({...details, name: e.target.value})}
                    />
                 </div>
                 <div className="relative">
                    <Mail className="absolute left-3 top-3 text-gray-400" size={16} />
                    <input
                      required
                      type="email"
                      placeholder="Email Address"
                      className="w-full pl-10 p-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                      value={details.email}
                      onChange={e => setDetails({...details, email: e.target.value})}
                    />
                 </div>
               </div>

               {/* Availability Status */}
               {dates.checkIn && dates.checkOut && (
                 <div className={`p-3 rounded-lg flex items-center gap-2 text-sm font-medium animate-fade-in ${
                   isAvailable 
                     ? 'bg-green-50 text-green-700 border border-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' 
                     : 'bg-red-50 text-red-700 border border-red-100 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                 }`}>
                   {isAvailable ? (
                     <>
                       <CheckCircle size={16} />
                       <span>Dates are available!</span>
                     </>
                   ) : (
                     <>
                       <AlertCircle size={16} />
                       <span>Not available for selected dates.</span>
                     </>
                   )}
                 </div>
               )}
            </form>
          </div>

          {/* Footer / Total Area (Fixed at bottom) */}
          <div className="p-4 md:p-5 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 z-20">
             <div className="flex justify-between items-end mb-3 md:mb-4">
                <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                   {isResort ? 'Estimated Quote' : 'Total Amount'}
                </span>
                <span className="text-2xl font-bold text-brand-700 dark:text-brand-400">
                   ${totalEstimate}
                </span>
             </div>
             <button 
               form="booking-form"
               type="submit"
               disabled={!isAvailable}
               className={`w-full py-3.5 rounded-xl font-bold text-white shadow-lg transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 ${
                 isAvailable 
                   ? isResort ? 'bg-[#25D366] hover:bg-[#128C7E] hover:shadow-green-200' : 'bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 hover:shadow-brand-200'
                   : 'bg-gray-300 text-gray-500 dark:bg-gray-700 dark:text-gray-500 cursor-not-allowed shadow-none hover:translate-y-0'
               }`}
             >
               {isResort ? (
                 <>
                   <MessageCircle size={20} />
                   Request Quote via WhatsApp
                 </>
               ) : (
                 'Request to Book'
               )}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};