import React, { useState } from 'react';
import { UserRole, Room, Booking, RoomType, BookingStatus } from './types';
import { INITIAL_ROOMS, MOCK_BOOKINGS } from './constants';
import { generateRoomDescription } from './services/geminiService';
import { BookingModal } from './components/BookingModal';
import { ConciergeChat } from './components/ConciergeChat';
import { ImageCarousel } from './components/ImageCarousel';
import { 
  Building, 
  Users, 
  Settings, 
  LogOut, 
  PlusCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search,
  Star,
  MapPin,
  Wifi,
  Coffee,
  Bed,
  Sparkles
} from 'lucide-react';

const App = () => {
  const [role, setRole] = useState<UserRole>(UserRole.CUSTOMER);
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS as any); // Cast for mock data compatibility
  
  // Admin State
  const [newRoom, setNewRoom] = useState<Partial<Room>>({
    name: '', type: RoomType.ROOM, price: 0, amenities: [], description: '', imageUrl: ''
  });
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);

  // Customer State
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Success Modal State
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successBookingDetails, setSuccessBookingDetails] = useState<any>(null);

  // --- Actions ---

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const primaryImage = newRoom.imageUrl || `https://picsum.photos/800/600?random=${rooms.length + 1}`;
    
    const room: Room = {
      id: Date.now().toString(),
      name: newRoom.name!,
      type: newRoom.type as RoomType,
      price: Number(newRoom.price),
      description: newRoom.description || 'No description provided.',
      imageUrl: primaryImage,
      images: [primaryImage], // Initialize images array with the single image provided
      amenities: newRoom.amenities as string[] || [],
      capacity: 2 // Defaulting for simplicity
    };
    setRooms([...rooms, room]);
    setNewRoom({ name: '', type: RoomType.ROOM, price: 0, amenities: [], description: '', imageUrl: '' });
    alert("Room created successfully!");
  };

  const handleGenerateDescription = async () => {
    if (!newRoom.name || !newRoom.type) {
      alert("Please enter a name and type first.");
      return;
    }
    setIsGeneratingDesc(true);
    const desc = await generateRoomDescription(newRoom.name, newRoom.type as string, newRoom.amenities as string[] || []);
    setNewRoom(prev => ({ ...prev, description: desc }));
    setIsGeneratingDesc(false);
  };

  const handleBookingCreate = (details: any) => {
    const booking: Booking = {
      id: Date.now().toString(),
      roomId: details.roomId,
      customerName: details.name,
      customerEmail: details.email,
      checkIn: details.checkIn,
      checkOut: details.checkOut,
      guests: details.guests,
      totalPrice: details.totalPrice,
      status: BookingStatus.PENDING,
      createdAt: new Date().toISOString()
    };
    setBookings([...bookings, booking]);
    
    // Set success details and open modal
    setSuccessBookingDetails({ ...booking, roomName: details.roomName });
    setSuccessModalOpen(true);
  };

  const updateBookingStatus = (id: string, status: BookingStatus) => {
    setBookings(bookings.map(b => b.id === id ? { ...b, status } : b));
  };

  // --- Views ---

  const renderNavbar = () => (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-serif font-bold">L</div>
            <span className="font-serif text-xl font-bold text-gray-900 tracking-tight">LuxStay</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex bg-gray-100 rounded-lg p-1">
              {Object.values(UserRole).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    role === r 
                    ? 'bg-white text-brand-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            <button className="md:hidden p-2 text-gray-500"><Settings size={20} /></button>
          </div>
        </div>
      </div>
    </nav>
  );

  const renderSuccessModal = () => {
    if (!successModalOpen || !successBookingDetails) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up text-center p-6 relative">
          <button 
            onClick={() => setSuccessModalOpen(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <XCircle size={20} />
          </button>
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">Booking Confirmed!</h3>
          <p className="text-gray-500 mb-6 text-sm">
            Thank you, {successBookingDetails.customerName}. Your reservation request has been received.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left space-y-3 text-sm">
            <div className="flex justify-between items-start">
              <span className="text-gray-500">Room</span>
              <span className="font-semibold text-gray-900 text-right max-w-[60%]">{successBookingDetails.roomName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Dates</span>
              <span className="font-semibold text-gray-900">
                {new Date(successBookingDetails.checkIn).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(successBookingDetails.checkOut).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t border-gray-200">
              <span className="font-medium text-gray-900">Total Price</span>
              <span className="font-bold text-brand-600 text-lg">${successBookingDetails.totalPrice}</span>
            </div>
          </div>

          <button 
            onClick={() => setSuccessModalOpen(false)}
            className="w-full bg-brand-600 text-white py-3 rounded-lg font-medium hover:bg-brand-700 transition shadow-md"
          >
            Done
          </button>
        </div>
      </div>
    );
  };

  const renderCustomerView = () => {
    const filteredRooms = rooms.filter(room => {
      const matchesType = filterType === 'All' || room.type === filterType;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = room.name.toLowerCase().includes(searchLower) || 
                          room.description.toLowerCase().includes(searchLower);
      return matchesType && matchesSearch;
    });

    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        {/* Hero */}
        <div className="relative h-[50vh] bg-gray-900 flex items-center justify-center overflow-hidden">
          <img 
            src="https://picsum.photos/1920/1080?blur=2" 
            className="absolute inset-0 w-full h-full object-cover opacity-60" 
            alt="Hero"
          />
          <div className="relative z-10 text-center text-white px-4">
            <h1 className="text-4xl md:text-6xl font-serif font-bold mb-4 drop-shadow-lg">Experience the Extraordinary</h1>
            <p className="text-lg md:text-xl font-light opacity-90 mb-8 max-w-2xl mx-auto">
              Sanctuary for the senses. Luxury for the soul.
            </p>
            <button 
              onClick={() => document.getElementById('rooms-grid')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-white text-brand-900 px-8 py-3 rounded-full font-medium hover:bg-brand-50 transition transform hover:-translate-y-1"
            >
              Book Your Stay
            </button>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" id="rooms-grid">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 w-full lg:w-auto">
              <h2 className="text-2xl font-serif font-bold text-gray-900 whitespace-nowrap">Our Accommodations</h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search rooms & suites..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm transition-shadow"
                />
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 lg:pb-0 w-full lg:w-auto no-scrollbar">
              {['All', ...Object.values(RoomType)].map(t => (
                <button
                  key={t}
                  onClick={() => setFilterType(t)}
                  className={`px-4 py-2 rounded-full text-sm whitespace-nowrap border transition ${
                    filterType === t 
                    ? 'bg-brand-600 text-white border-brand-600 shadow-md' 
                    : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-600'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredRooms.length > 0 ? (
              filteredRooms.map(room => (
                <div key={room.id} className="bg-white rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden border border-gray-100 flex flex-col h-full">
                  <div className="relative h-64 overflow-hidden">
                    <ImageCarousel 
                      images={room.images && room.images.length > 0 ? room.images : [room.imageUrl]} 
                      alt={room.name} 
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-brand-800 uppercase tracking-wide z-20">
                      {room.type}
                    </div>
                  </div>
                  <div className="p-6 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-xl font-bold text-gray-900 leading-tight group-hover:text-brand-600 transition">{room.name}</h3>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-bold text-brand-600">${room.price}</span>
                        <span className="text-xs text-gray-400">/ night</span>
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3 flex-1">{room.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      {room.amenities.slice(0, 3).map((a, i) => (
                        <span key={i} className="text-xs bg-gray-50 text-gray-600 px-2 py-1 rounded-md border border-gray-100">{a}</span>
                      ))}
                      {room.amenities.length > 3 && (
                        <span className="text-xs text-gray-400 px-2 py-1">+ {room.amenities.length - 3} more</span>
                      )}
                    </div>

                    <button 
                      onClick={() => { setSelectedRoom(room); setBookingModalOpen(true); }}
                      className="w-full bg-gray-900 text-white py-3 rounded-lg font-medium hover:bg-brand-600 transition-colors flex items-center justify-center gap-2"
                    >
                      Check Availability
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-16 text-center">
                <div className="bg-gray-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Search className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-medium text-gray-900">No rooms found</h3>
                <p className="text-gray-500 mt-1">
                  We couldn't find any rooms matching "{searchQuery}" in {filterType === 'All' ? 'our inventory' : `the ${filterType} category`}.
                </p>
                <button 
                  onClick={() => {setSearchQuery(''); setFilterType('All');}}
                  className="mt-4 text-brand-600 font-medium hover:text-brand-700 hover:underline"
                >
                  View all rooms
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Floating Chat */}
        <ConciergeChat rooms={rooms} />
        
        {/* Booking Modal */}
        {selectedRoom && (
          <BookingModal 
            room={selectedRoom} 
            isOpen={bookingModalOpen} 
            onClose={() => setBookingModalOpen(false)} 
            onConfirm={handleBookingCreate}
            existingBookings={bookings}
          />
        )}
      </div>
    );
  };

  const renderStaffView = () => {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Management</h1>
            <p className="text-gray-500 text-sm">Manage guest reservations and statuses</p>
          </div>
          <div className="flex gap-4">
             <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center min-w-[100px]">
                <span className="text-xs text-gray-500 uppercase font-semibold">Total</span>
                <span className="text-xl font-bold text-brand-600">{bookings.length}</span>
             </div>
             <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-col items-center min-w-[100px]">
                <span className="text-xs text-gray-500 uppercase font-semibold">Pending</span>
                <span className="text-xl font-bold text-orange-500">{bookings.filter(b => b.status === BookingStatus.PENDING).length}</span>
             </div>
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Room</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bookings.map(booking => {
                  const room = rooms.find(r => r.id === booking.roomId);
                  return (
                    <tr key={booking.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold">
                            {booking.customerName.charAt(0)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{booking.customerName}</div>
                            <div className="text-sm text-gray-500">{booking.customerEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{room?.name || 'Unknown Room'}</div>
                        <div className="text-xs text-gray-500">{room?.type}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center gap-1">
                           <CalendarIcon size={14} /> {new Date(booking.checkIn).toLocaleDateString()}
                        </div>
                        <div className="text-xs text-gray-500 ml-5">to {new Date(booking.checkOut).toLocaleDateString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          booking.status === BookingStatus.CONFIRMED ? 'bg-green-100 text-green-800' :
                          booking.status === BookingStatus.PENDING ? 'bg-orange-100 text-orange-800' :
                          booking.status === BookingStatus.CHECKED_IN ? 'bg-blue-100 text-blue-800' :
                          booking.status === BookingStatus.CANCELLED ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {booking.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {booking.status === BookingStatus.PENDING && (
                          <button 
                            onClick={() => updateBookingStatus(booking.id, BookingStatus.CONFIRMED)}
                            className="text-green-600 hover:text-green-900 mr-4 flex items-center gap-1"
                          >
                            <CheckCircle size={16} /> Confirm
                          </button>
                        )}
                        {booking.status === BookingStatus.CONFIRMED && (
                          <button 
                            onClick={() => updateBookingStatus(booking.id, BookingStatus.CHECKED_IN)}
                            className="text-blue-600 hover:text-blue-900 mr-4 flex items-center gap-1"
                          >
                            <LogOut size={16} className="rotate-90" /> Check In
                          </button>
                        )}
                         {booking.status === BookingStatus.CHECKED_IN && (
                          <button 
                            onClick={() => updateBookingStatus(booking.id, BookingStatus.CHECKED_OUT)}
                            className="text-gray-600 hover:text-gray-900 mr-4 flex items-center gap-1"
                          >
                            <LogOut size={16} /> Check Out
                          </button>
                        )}
                        {(booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED) && (
                           <button 
                             onClick={() => updateBookingStatus(booking.id, BookingStatus.CANCELLED)}
                             className="text-red-600 hover:text-red-900 flex items-center gap-1"
                           >
                             <XCircle size={16} /> Cancel
                           </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderAdminView = () => {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Property Management</h1>
        <p className="text-gray-500 mb-8">Add new inventory to the hotel database.</p>

        <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
          <h2 className="text-xl font-bold text-brand-700 mb-6 flex items-center gap-2">
            <PlusCircle /> Add New Accommodation
          </h2>
          <form onSubmit={handleCreateRoom} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  required
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  value={newRoom.name}
                  onChange={e => setNewRoom({...newRoom, name: e.target.value})}
                  placeholder="e.g. Sunset Royal Suite"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Type</label>
                <select 
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500"
                  value={newRoom.type}
                  onChange={e => setNewRoom({...newRoom, type: e.target.value as RoomType})}
                >
                  {Object.values(RoomType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Price per Night ($)</label>
                <input
                  required
                  type="number"
                  min="0"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  value={newRoom.price}
                  onChange={e => setNewRoom({...newRoom, price: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Image URL</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none"
                  value={newRoom.imageUrl}
                  onChange={e => setNewRoom({...newRoom, imageUrl: e.target.value})}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Amenities (comma separated)</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none"
                placeholder="WiFi, Pool, Balcony..."
                value={newRoom.amenities?.join(', ')}
                onChange={e => setNewRoom({...newRoom, amenities: e.target.value.split(',').map(s => s.trim())})}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDesc}
                  className="text-xs bg-brand-100 text-brand-700 px-3 py-1 rounded-full hover:bg-brand-200 flex items-center gap-1 transition"
                >
                  <Sparkles size={12} /> {isGeneratingDesc ? 'Generating...' : 'Generate with AI'}
                </button>
              </div>
              <textarea
                required
                rows={4}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none"
                value={newRoom.description}
                onChange={e => setNewRoom({...newRoom, description: e.target.value})}
                placeholder="Enter room description..."
              />
            </div>

            <button
              type="submit"
              className="w-full bg-brand-600 text-white font-bold py-3 rounded-lg hover:bg-brand-700 transition shadow-md"
            >
              Add Room
            </button>
          </form>
        </div>

        {/* List of current rooms for reference */}
        <div className="mt-12">
            <h3 className="text-xl font-bold mb-4">Inventory Overview</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               {rooms.map(r => (
                 <div key={r.id} className="bg-gray-50 p-4 rounded-lg flex gap-4 items-center border border-gray-200">
                    <img src={r.imageUrl} alt={r.name} className="w-16 h-16 rounded object-cover bg-gray-200" />
                    <div>
                      <p className="font-bold text-sm">{r.name}</p>
                      <p className="text-xs text-gray-500">{r.type} • ${r.price}</p>
                    </div>
                 </div>
               ))}
            </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen font-sans">
      {renderNavbar()}
      <main>
        {role === UserRole.CUSTOMER && renderCustomerView()}
        {role === UserRole.STAFF && renderStaffView()}
        {role === UserRole.ADMIN && renderAdminView()}
      </main>
      {renderSuccessModal()}
    </div>
  );
};

// Helper for staff view
const CalendarIcon = ({size}: {size: number}) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
);

export default App;