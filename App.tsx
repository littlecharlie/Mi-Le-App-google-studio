import React, { useState, useEffect } from 'react';
import { UserRole, Room, Booking, RoomType, BookingStatus } from './types';
import { INITIAL_ROOMS, MOCK_BOOKINGS } from './constants';
import { generateRoomDescription, generateMarketingContent, analyzePricing } from './services/geminiService';
import { BookingModal } from './components/BookingModal';
import { WhatsAppButton } from './components/WhatsAppButton';
import { ImageCarousel } from './components/ImageCarousel';
import { 
  Building, 
  Users, 
  Settings, 
  LogOut, 
  LogIn,
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
  Sparkles,
  Compass,
  LayoutDashboard,
  List,
  Megaphone,
  TrendingUp,
  DollarSign,
  CalendarCheck,
  Edit,
  Trash2,
  ChevronRight,
  ArrowLeft,
  Moon,
  Sun,
  Upload,
  Image as ImageIcon,
  Bell,
  BedDouble,
  Phone
} from 'lucide-react';

const App = () => {
  const [role, setRole] = useState<UserRole>(UserRole.CUSTOMER);
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS as any);
  
  // Theme State
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('theme') === 'dark' || 
        (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    }
    return false;
  });

  // Admin State
  const [adminTab, setAdminTab] = useState<'dashboard' | 'inventory' | 'marketing'>('dashboard');
  const [isRoomFormOpen, setIsRoomFormOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [newRoom, setNewRoom] = useState<Partial<Room>>({
    name: '', type: RoomType.ROOM, price: 0, weekendPrice: 0, amenities: [], description: '', imageUrl: '', manualPricing: false, capacity: 2
  });
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  
  // Admin Marketing State
  const [marketingRoomId, setMarketingRoomId] = useState<string>('');
  const [marketingResult, setMarketingResult] = useState<{content: string, type: 'social' | 'price' | null}>({ content: '', type: null });
  const [isMarketingLoading, setIsMarketingLoading] = useState(false);

  // Staff State
  const [staffFilter, setStaffFilter] = useState<'all' | 'arrivals' | 'departures' | 'in_house' | 'pending'>('all');
  const [staffSearch, setStaffSearch] = useState('');

  // Customer State
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [filterType, setFilterType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Success Modal State
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successBookingDetails, setSuccessBookingDetails] = useState<any>(null);

  // --- Effects ---
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // --- Actions ---

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewRoom({ ...newRoom, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const primaryImage = newRoom.imageUrl || `https://picsum.photos/800/600?random=${rooms.length + 1}`;
    
    // Process amenities (string to array)
    const amenitiesArray = Array.isArray(newRoom.amenities) 
      ? newRoom.amenities 
      : (newRoom.amenities as unknown as string).split(',').map(s => s.trim()).filter(s => s.length > 0);

    if (editingRoomId) {
      // Update existing room
      setRooms(rooms.map(r => r.id === editingRoomId ? {
        ...r,
        ...newRoom,
        price: Number(newRoom.price),
        weekendPrice: newRoom.weekendPrice ? Number(newRoom.weekendPrice) : undefined,
        amenities: amenitiesArray,
        images: r.images, // Keep existing images array for now or simple update
        capacity: Number(newRoom.capacity) || 2
      } as Room : r));
      alert("Room updated successfully!");
    } else {
      // Create new room
      const room: Room = {
        id: Date.now().toString(),
        name: newRoom.name!,
        type: newRoom.type as RoomType,
        price: Number(newRoom.price),
        weekendPrice: newRoom.weekendPrice ? Number(newRoom.weekendPrice) : undefined,
        description: newRoom.description || 'No description provided.',
        imageUrl: primaryImage,
        images: [primaryImage],
        amenities: amenitiesArray,
        capacity: Number(newRoom.capacity) || 2,
        manualPricing: newRoom.manualPricing
      };
      setRooms([...rooms, room]);
      alert("Room created successfully!");
    }
    
    resetRoomForm();
  };

  const resetRoomForm = () => {
    setNewRoom({ name: '', type: RoomType.ROOM, price: 0, weekendPrice: 0, amenities: [], description: '', imageUrl: '', manualPricing: false, capacity: 2 });
    setEditingRoomId(null);
    setIsRoomFormOpen(false);
  };

  const handleEditRoom = (room: Room) => {
    setNewRoom({
      name: room.name,
      type: room.type,
      price: room.price,
      weekendPrice: room.weekendPrice,
      amenities: room.amenities,
      description: room.description,
      imageUrl: room.imageUrl,
      manualPricing: room.manualPricing,
      capacity: room.capacity
    });
    setEditingRoomId(room.id);
    setIsRoomFormOpen(true);
  };

  const handleDeleteRoom = (id: string) => {
    if (window.confirm("Are you sure you want to delete this room? This action cannot be undone.")) {
      setRooms(rooms.filter(r => r.id !== id));
    }
  };

  const handleGenerateDescription = async () => {
    if (!newRoom.name || !newRoom.type) {
      alert("Please enter a name and type first.");
      return;
    }
    setIsGeneratingDesc(true);
    const amenitiesList = Array.isArray(newRoom.amenities) ? newRoom.amenities : (newRoom.amenities as unknown as string || '').split(',');
    const desc = await generateRoomDescription(newRoom.name, newRoom.type as string, amenitiesList);
    setNewRoom(prev => ({ ...prev, description: desc }));
    setIsGeneratingDesc(false);
  };

  const handleMarketingGenerate = async (type: 'social' | 'price') => {
    if (!marketingRoomId) return;
    const room = rooms.find(r => r.id === marketingRoomId);
    if (!room) return;

    setIsMarketingLoading(true);
    setMarketingResult({ content: '', type });
    
    let result = '';
    if (type === 'social') {
      result = await generateMarketingContent(room);
    } else {
      result = await analyzePricing(room);
    }
    
    setMarketingResult({ content: result, type });
    setIsMarketingLoading(false);
  };

  const handleBookingCreate = (details: any) => {
    const booking: Booking = {
      id: Date.now().toString(),
      roomId: details.roomId,
      customerName: details.name,
      customerEmail: details.email,
      customerPhone: details.phone,
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
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-serif font-bold">L</div>
            <span className="font-serif text-xl font-bold text-gray-900 dark:text-white tracking-tight">LuxStay</span>
          </div>
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {Object.values(UserRole).map((r) => (
                <button
                  key={r}
                  onClick={() => { setRole(r); if(r === UserRole.ADMIN) setAdminTab('dashboard'); }}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    role === r 
                    ? 'bg-white dark:bg-gray-600 text-brand-600 dark:text-brand-300 shadow-sm' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {r.charAt(0) + r.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors"
              title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>

            <button className="md:hidden p-2 text-gray-500 dark:text-gray-400"><Settings size={20} /></button>
          </div>
        </div>
      </div>
    </nav>
  );

  const renderSuccessModal = () => {
    if (!successModalOpen || !successBookingDetails) return null;

    return (
      <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up text-center p-6 relative">
          <button 
            onClick={() => setSuccessModalOpen(false)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XCircle size={20} />
          </button>
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 dark:text-green-400">
            <CheckCircle size={32} />
          </div>
          <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-2">Booking Confirmed!</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
            Thank you, {successBookingDetails.customerName}. Your reservation request has been received.
          </p>
          
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6 text-left space-y-3 text-sm">
            <div className="flex justify-between items-start">
              <span className="text-gray-500 dark:text-gray-400">Room</span>
              <span className="font-semibold text-gray-900 dark:text-white text-right max-w-[60%]">{successBookingDetails.roomName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 dark:text-gray-400">Dates</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {new Date(successBookingDetails.checkIn).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - {new Date(successBookingDetails.checkOut).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between pt-3 border-t border-gray-200 dark:border-gray-600">
              <span className="font-medium text-gray-900 dark:text-white">Total Price</span>
              <span className="font-bold text-brand-600 dark:text-brand-400 text-lg">${successBookingDetails.totalPrice}</span>
            </div>
          </div>

          <button 
            onClick={() => setSuccessModalOpen(false)}
            className="w-full bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white py-3 rounded-lg font-medium transition shadow-md"
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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 transition-colors">
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
              <h2 className="text-2xl font-serif font-bold text-gray-900 dark:text-white whitespace-nowrap">Our Accommodations</h2>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  placeholder="Search rooms & suites..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm transition-all text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
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
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-400'
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
                <div key={room.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 group overflow-hidden border border-gray-100 dark:border-gray-700 flex flex-col h-full">
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
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white leading-tight group-hover:text-brand-600 dark:group-hover:text-brand-400 transition">{room.name}</h3>
                      <div className="flex flex-col items-end">
                        <span className="text-lg font-bold text-brand-600 dark:text-brand-400">${room.price}</span>
                        {room.type === RoomType.RESORT ? (
                           <>
                             <span className="text-xs text-gray-500 dark:text-gray-400">per pax / night</span>
                           </>
                        ) : (
                           <>
                            {room.weekendPrice && <span className="text-xs text-gray-500 dark:text-gray-400">Weekday</span>}
                            {!room.weekendPrice && <span className="text-xs text-gray-400 dark:text-gray-500">/ night</span>}
                           </>
                        )}
                        
                        {room.weekendPrice && room.type !== RoomType.RESORT && (
                           <div className="text-right">
                              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">${room.weekendPrice}</span>
                              <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">Weekend</span>
                           </div>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-3 flex-1">{room.description}</p>
                    
                    <div className="flex flex-wrap gap-2 mb-6">
                      {room.amenities.slice(0, 3).map((a, i) => (
                        <span key={i} className="text-xs bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-md border border-gray-100 dark:border-gray-600">{a}</span>
                      ))}
                      {room.amenities.length > 3 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 px-2 py-1">+ {room.amenities.length - 3} more</span>
                      )}
                    </div>

                    <button 
                      onClick={() => { setSelectedRoom(room); setBookingModalOpen(true); }}
                      className="w-full bg-gray-900 dark:bg-gray-700 text-white py-3 rounded-lg font-medium hover:bg-brand-600 dark:hover:bg-brand-500 transition-colors flex items-center justify-center gap-2"
                    >
                      <Compass size={18} /> Explore
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-16 text-center">
                <div className="bg-gray-50 dark:bg-gray-800 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                  <Search className="text-gray-400" size={32} />
                </div>
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">No rooms found</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  We couldn't find any rooms matching "{searchQuery}" in {filterType === 'All' ? 'our inventory' : `the ${filterType} category`}.
                </p>
                <button 
                  onClick={() => {setSearchQuery(''); setFilterType('All');}}
                  className="mt-4 text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 dark:hover:text-brand-300 hover:underline"
                >
                  View all rooms
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Floating WhatsApp Button */}
        <WhatsAppButton />
        
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
    // Staff Dashboard Logic
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate Stats
    const arrivalsToday = bookings.filter(b => b.checkIn === today && b.status === BookingStatus.CONFIRMED).length;
    const departuresToday = bookings.filter(b => b.checkOut === today && b.status === BookingStatus.CHECKED_IN).length;
    const inHouse = bookings.filter(b => b.status === BookingStatus.CHECKED_IN).length;
    const pendingRequests = bookings.filter(b => b.status === BookingStatus.PENDING).length;

    // Filter Logic
    const filteredBookings = bookings.filter(b => {
      // 1. Text Search
      const matchesSearch = b.customerName.toLowerCase().includes(staffSearch.toLowerCase()) || 
                            b.id.includes(staffSearch.toLowerCase()) ||
                            b.customerPhone?.includes(staffSearch);
      
      // 2. Tab Filter
      let matchesTab = true;
      if (staffFilter === 'arrivals') {
        matchesTab = b.checkIn === today && b.status === BookingStatus.CONFIRMED;
      } else if (staffFilter === 'departures') {
        matchesTab = b.checkOut === today && b.status === BookingStatus.CHECKED_IN;
      } else if (staffFilter === 'in_house') {
        matchesTab = b.status === BookingStatus.CHECKED_IN;
      } else if (staffFilter === 'pending') {
        matchesTab = b.status === BookingStatus.PENDING;
      }

      return matchesSearch && matchesTab;
    });

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <LayoutDashboard className="text-brand-600 dark:text-brand-400" />
              Front Desk Operations
            </h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Manage daily arrivals, departures, and guest requests.</p>
          </div>
          
          <div className="relative w-full md:w-72">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               type="text" 
               placeholder="Search guest name or ID..." 
               value={staffSearch}
               onChange={(e) => setStaffSearch(e.target.value)}
               className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
             />
          </div>
        </div>

        {/* Stats / Quick Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
           <button 
             onClick={() => setStaffFilter(staffFilter === 'arrivals' ? 'all' : 'arrivals')}
             className={`p-4 rounded-xl border transition-all text-left group ${staffFilter === 'arrivals' ? 'bg-brand-50 border-brand-200 ring-2 ring-brand-500 dark:bg-brand-900/20 dark:border-brand-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700'}`}
           >
              <div className="flex justify-between items-start mb-2">
                 <div className="p-2 rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400 group-hover:scale-110 transition-transform">
                    <LogIn size={20} />
                 </div>
                 <span className="text-2xl font-bold text-gray-900 dark:text-white">{arrivalsToday}</span>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Arrivals Today</p>
           </button>

           <button 
             onClick={() => setStaffFilter(staffFilter === 'departures' ? 'all' : 'departures')}
             className={`p-4 rounded-xl border transition-all text-left group ${staffFilter === 'departures' ? 'bg-brand-50 border-brand-200 ring-2 ring-brand-500 dark:bg-brand-900/20 dark:border-brand-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700'}`}
           >
              <div className="flex justify-between items-start mb-2">
                 <div className="p-2 rounded-lg bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 group-hover:scale-110 transition-transform">
                    <LogOut size={20} />
                 </div>
                 <span className="text-2xl font-bold text-gray-900 dark:text-white">{departuresToday}</span>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Departures Today</p>
           </button>

           <button 
             onClick={() => setStaffFilter(staffFilter === 'in_house' ? 'all' : 'in_house')}
             className={`p-4 rounded-xl border transition-all text-left group ${staffFilter === 'in_house' ? 'bg-brand-50 border-brand-200 ring-2 ring-brand-500 dark:bg-brand-900/20 dark:border-brand-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700'}`}
           >
              <div className="flex justify-between items-start mb-2">
                 <div className="p-2 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 group-hover:scale-110 transition-transform">
                    <BedDouble size={20} />
                 </div>
                 <span className="text-2xl font-bold text-gray-900 dark:text-white">{inHouse}</span>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">In House</p>
           </button>

           <button 
             onClick={() => setStaffFilter(staffFilter === 'pending' ? 'all' : 'pending')}
             className={`p-4 rounded-xl border transition-all text-left group ${staffFilter === 'pending' ? 'bg-brand-50 border-brand-200 ring-2 ring-brand-500 dark:bg-brand-900/20 dark:border-brand-700' : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-brand-300 dark:hover:border-brand-700'}`}
           >
              <div className="flex justify-between items-start mb-2">
                 <div className="p-2 rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 group-hover:scale-110 transition-transform">
                    <Bell size={20} />
                 </div>
                 <span className="text-2xl font-bold text-gray-900 dark:text-white">{pendingRequests}</span>
              </div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending Approval</p>
           </button>
        </div>

        {/* Filters Status Display */}
        {staffFilter !== 'all' && (
           <div className="mb-4 flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Filtering by:</span>
              <span className="px-3 py-1 bg-brand-100 dark:bg-brand-900 text-brand-800 dark:text-brand-200 text-xs font-bold rounded-full uppercase flex items-center gap-2">
                 {staffFilter.replace('_', ' ')}
                 <button onClick={() => setStaffFilter('all')} className="hover:text-brand-600"><XCircle size={14}/></button>
              </span>
           </div>
        )}

        {/* Table */}
        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Guest</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Room Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Schedule</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredBookings.length > 0 ? (
                  filteredBookings.map(booking => {
                    const room = rooms.find(r => r.id === booking.roomId);
                    return (
                      <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 rounded-full bg-brand-100 dark:bg-brand-900 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold shrink-0">
                              {booking.customerName.charAt(0)}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{booking.customerName}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{booking.customerEmail}</div>
                              {booking.customerPhone && (
                                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                                   <Phone size={12} /> {booking.customerPhone}
                                </div>
                              )}
                              <div className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{booking.guests} Guests</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white font-medium">{room?.name || 'Unknown Room'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{room?.type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                             <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-white">
                                <LogIn size={14} className="text-green-500" />
                                <span>{new Date(booking.checkIn).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                             </div>
                             <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                                <LogOut size={14} className="text-orange-500" />
                                <span>{new Date(booking.checkOut).toLocaleDateString(undefined, {month: 'short', day: 'numeric'})}</span>
                             </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                            booking.status === BookingStatus.CONFIRMED ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' :
                            booking.status === BookingStatus.PENDING ? 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800' :
                            booking.status === BookingStatus.CHECKED_IN ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' :
                            booking.status === BookingStatus.CANCELLED ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' :
                            'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          }`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {booking.status === BookingStatus.PENDING && (
                            <button 
                              onClick={() => updateBookingStatus(booking.id, BookingStatus.CONFIRMED)}
                              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 mr-4 flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-md transition hover:bg-green-100 dark:hover:bg-green-900/40"
                            >
                              <CheckCircle size={14} /> Approve
                            </button>
                          )}
                          {booking.status === BookingStatus.CONFIRMED && (
                            <button 
                              onClick={() => updateBookingStatus(booking.id, BookingStatus.CHECKED_IN)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 mr-4 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-md transition hover:bg-blue-100 dark:hover:bg-blue-900/40"
                            >
                              <LogIn size={14} /> Check In
                            </button>
                          )}
                           {booking.status === BookingStatus.CHECKED_IN && (
                            <button 
                              onClick={() => updateBookingStatus(booking.id, BookingStatus.CHECKED_OUT)}
                              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mr-4 flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-md transition hover:bg-gray-200 dark:hover:bg-gray-600"
                            >
                              <LogOut size={14} /> Check Out
                            </button>
                          )}
                          {(booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED) && (
                             <button 
                               onClick={() => updateBookingStatus(booking.id, BookingStatus.CANCELLED)}
                               className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1 mt-2 md:mt-0 text-xs"
                             >
                               Cancel
                             </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                       <div className="flex flex-col items-center justify-center">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-3">
                             <List size={24} className="opacity-50" />
                          </div>
                          <p className="font-medium">No bookings found</p>
                          <p className="text-sm mt-1">Try adjusting your filters or search.</p>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderAdminDashboard = () => {
    const totalRevenue = bookings
      .filter(b => b.status !== BookingStatus.CANCELLED)
      .reduce((acc, curr) => acc + curr.totalPrice, 0);
    
    const activeBookings = bookings.filter(b => 
      [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN, BookingStatus.PENDING].includes(b.status)
    ).length;

    // Mock bar chart data
    const chartData = [65, 45, 75, 50, 85, 60, 90]; 

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className="p-4 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full">
              <DollarSign size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Total Revenue</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">${totalRevenue.toLocaleString()}</h3>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full">
              <CalendarCheck size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Active Bookings</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{activeBookings}</h3>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center gap-4">
            <div className="p-4 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full">
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Occupancy Rate</p>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">78%</h3>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Revenue Trend (7 Days)</h3>
            <div className="flex items-end justify-between h-48 gap-2">
              {chartData.map((value, idx) => (
                <div key={idx} className="w-full bg-gray-100 dark:bg-gray-700 rounded-t-lg relative group">
                   <div 
                      className="absolute bottom-0 w-full bg-brand-500 rounded-t-lg transition-all duration-500 group-hover:bg-brand-600"
                      style={{ height: `${value}%` }}
                   ></div>
                   <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 dark:bg-gray-700 text-white text-xs py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition">
                      ${value * 100}
                   </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-4 text-xs text-gray-500 dark:text-gray-400">
               <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
             <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
             <div className="space-y-4">
                {bookings.slice(-4).reverse().map(b => (
                   <div key={b.id} className="flex gap-3 items-start pb-3 border-b border-gray-50 dark:border-gray-700 last:border-0">
                      <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 shrink-0">
                         {b.customerName.charAt(0)}
                      </div>
                      <div>
                         <p className="text-sm font-medium text-gray-900 dark:text-white">
                            New booking by <span className="font-bold">{b.customerName}</span>
                         </p>
                         <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(b.createdAt).toLocaleDateString()}</p>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAdminInventory = () => {
    if (isRoomFormOpen) {
      return (
        <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-brand-700 dark:text-brand-400 flex items-center gap-2">
              {editingRoomId ? <Edit size={20} /> : <PlusCircle size={20} />} 
              {editingRoomId ? 'Edit Accommodation' : 'Add New Accommodation'}
            </h2>
            <button 
              onClick={resetRoomForm}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 flex items-center gap-1 text-sm font-medium"
            >
              <ArrowLeft size={16} /> Back to List
            </button>
          </div>
          
          <form onSubmit={handleSaveRoom} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
                <input
                  required
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={newRoom.name}
                  onChange={e => setNewRoom({...newRoom, name: e.target.value})}
                  placeholder="e.g. Sunset Royal Suite"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
                <select 
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-brand-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={newRoom.type}
                  onChange={e => setNewRoom({...newRoom, type: e.target.value as RoomType})}
                >
                  {Object.values(RoomType).map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              {/* Price Fields with Manual Override Logic */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {newRoom.type === RoomType.RESORT ? 'Weekday Price per Pax ($)' : 'Weekday Price ($)'}
                </label>
                <input
                  required={!newRoom.manualPricing}
                  type="number"
                  min="0"
                  disabled={!!newRoom.manualPricing}
                  className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${newRoom.manualPricing ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`}
                  value={newRoom.price}
                  onChange={e => setNewRoom({...newRoom, price: Number(e.target.value)})}
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {newRoom.type === RoomType.RESORT ? 'Weekend Price per Pax ($)' : 'Weekend Price ($)'}
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={!!newRoom.manualPricing}
                  className={`w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${newRoom.manualPricing ? 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800' : ''}`}
                  value={newRoom.weekendPrice || ''}
                  onChange={e => setNewRoom({...newRoom, weekendPrice: Number(e.target.value)})}
                  placeholder="Optional"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Max Capacity (Guests)</label>
                <input
                  type="number"
                  min="1"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  value={newRoom.capacity}
                  onChange={e => setNewRoom({...newRoom, capacity: parseInt(e.target.value)})}
                />
              </div>

              {/* Resort Manual Pricing Checkbox */}
              {newRoom.type === RoomType.RESORT && (
                <div className="col-span-1 md:col-span-2 flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                   <input 
                     type="checkbox" 
                     id="manualPricing"
                     checked={!!newRoom.manualPricing}
                     onChange={e => setNewRoom({...newRoom, manualPricing: e.target.checked})}
                     className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 border-gray-300 dark:border-gray-600 dark:bg-gray-700"
                   />
                   <label htmlFor="manualPricing" className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                     Count price manually (Quote based on request)
                   </label>
                </div>
              )}
              
              {/* Image Upload Section */}
              <div className="space-y-2 col-span-1 md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Room Image</label>
                
                {/* File Upload Area */}
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                     <div className="relative border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors text-center cursor-pointer group">
                        <input 
                           type="file" 
                           accept="image/*" 
                           onChange={handleFileUpload} 
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className="flex flex-col items-center justify-center space-y-2">
                           <div className="p-3 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-full group-hover:scale-110 transition-transform">
                              <Upload size={24} />
                           </div>
                           <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Click to upload or drag image here
                           </p>
                           <p className="text-xs text-gray-500 dark:text-gray-400">
                              SVG, PNG, JPG or GIF
                           </p>
                        </div>
                     </div>
                     <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-1 font-medium uppercase">Or enter direct URL</p>
                        <input
                           type="text"
                           className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                           value={newRoom.imageUrl}
                           onChange={e => setNewRoom({...newRoom, imageUrl: e.target.value})}
                           placeholder="https://example.com/image.jpg"
                        />
                     </div>
                  </div>

                  {/* Image Preview */}
                  <div className="w-full md:w-1/3 aspect-video bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 flex items-center justify-center relative">
                     {newRoom.imageUrl ? (
                        <img src={newRoom.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                     ) : (
                        <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
                           <ImageIcon size={32} />
                           <span className="text-xs mt-1">No image selected</span>
                        </div>
                     )}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Amenities (comma separated)</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="WiFi, Pool, Balcony..."
                value={Array.isArray(newRoom.amenities) ? newRoom.amenities.join(', ') : newRoom.amenities}
                onChange={e => setNewRoom({...newRoom, amenities: e.target.value as any})} 
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description</label>
                <button
                  type="button"
                  onClick={handleGenerateDescription}
                  disabled={isGeneratingDesc}
                  className="text-xs bg-brand-100 dark:bg-brand-900 text-brand-700 dark:text-brand-300 px-3 py-1 rounded-full hover:bg-brand-200 dark:hover:bg-brand-800 flex items-center gap-1 transition"
                >
                  <Sparkles size={12} /> {isGeneratingDesc ? 'Generating...' : 'Generate with AI'}
                </button>
              </div>
              <textarea
                required
                rows={4}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                value={newRoom.description}
                onChange={e => setNewRoom({...newRoom, description: e.target.value})}
                placeholder="Enter room description..."
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white font-bold py-3 rounded-lg transition shadow-md"
              >
                {editingRoomId ? 'Update Room' : 'Add Room'}
              </button>
              <button
                type="button"
                onClick={resetRoomForm}
                className="px-6 py-3 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      );
    }

    const filteredRooms = rooms.filter(r => 
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      r.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex justify-between items-center">
          <div className="relative w-72">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
             <input 
               type="text" 
               placeholder="Search inventory..." 
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
             />
          </div>
          <button 
             onClick={() => { resetRoomForm(); setIsRoomFormOpen(true); }}
             className="bg-brand-600 hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 text-white px-4 py-2 rounded-lg transition flex items-center gap-2 font-medium shadow-sm"
          >
             <PlusCircle size={18} /> Add Room
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow-sm rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
             <thead className="bg-gray-50 dark:bg-gray-700">
               <tr>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Room</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price (WD/WE)</th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Amenities</th>
                 <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
               </tr>
             </thead>
             <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredRooms.map(room => (
                   <tr key={room.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition">
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center">
                            <img src={room.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover bg-gray-200 dark:bg-gray-600" />
                            <div className="ml-4 font-medium text-gray-900 dark:text-white">{room.name}</div>
                         </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                         <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                            {room.type}
                         </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                         {room.manualPricing ? (
                             <span className="text-orange-600 dark:text-orange-400 font-medium text-xs">Quote Only</span>
                         ) : (
                             <>${room.price} <span className="text-gray-400">/</span> {room.weekendPrice ? `$${room.weekendPrice}` : '-'}</>
                         )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                         {room.amenities.join(', ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                         <button 
                            onClick={() => handleEditRoom(room)}
                            className="text-brand-600 dark:text-brand-400 hover:text-brand-900 dark:hover:text-brand-200 mr-4"
                         >
                            <Edit size={18} />
                         </button>
                         <button 
                            onClick={() => handleDeleteRoom(room.id)}
                            className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                         >
                            <Trash2 size={18} />
                         </button>
                      </td>
                   </tr>
                ))}
             </tbody>
          </table>
          {filteredRooms.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
               No rooms found matching your search.
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAdminMarketing = () => {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-in">
         <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI Marketing Assistant</h2>
            <p className="text-gray-500 dark:text-gray-400">Generate social content or analyze pricing for your inventory.</p>
         </div>

         <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm space-y-6">
            <div className="space-y-2">
               <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Room</label>
               <select 
                 className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-500 focus:outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                 value={marketingRoomId}
                 onChange={(e) => setMarketingRoomId(e.target.value)}
               >
                 <option value="">-- Choose an accommodation --</option>
                 {rooms.map(r => (
                   <option key={r.id} value={r.id}>{r.name} ({r.type})</option>
                 ))}
               </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
               <button 
                 onClick={() => handleMarketingGenerate('social')}
                 disabled={!marketingRoomId || isMarketingLoading}
                 className="flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-brand-50 dark:hover:bg-gray-700 hover:border-brand-200 transition disabled:opacity-50 disabled:cursor-not-allowed group bg-white dark:bg-gray-800"
               >
                  <div className="w-10 h-10 bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition">
                     <Megaphone size={20} />
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Social Post</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Generate Instagram Caption</span>
               </button>
               <button 
                 onClick={() => handleMarketingGenerate('price')}
                 disabled={!marketingRoomId || isMarketingLoading}
                 className="flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-brand-50 dark:hover:bg-gray-700 hover:border-brand-200 transition disabled:opacity-50 disabled:cursor-not-allowed group bg-white dark:bg-gray-800"
               >
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-2 group-hover:scale-110 transition">
                     <TrendingUp size={20} />
                  </div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Price Advisor</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Analyze Competitiveness</span>
               </button>
            </div>
         </div>

         {/* Result Area */}
         {(marketingResult.content || isMarketingLoading) && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-brand-100 dark:border-brand-900 shadow-md relative overflow-hidden">
               {isMarketingLoading ? (
                  <div className="flex flex-col items-center justify-center py-8 space-y-3">
                     <Sparkles className="text-brand-500 animate-spin" size={32} />
                     <p className="text-sm text-gray-500 dark:text-gray-400">Consulting AI experts...</p>
                  </div>
               ) : (
                  <>
                    <div className="flex items-center gap-2 mb-4 text-brand-700 dark:text-brand-400 font-bold border-b border-brand-50 dark:border-brand-900 pb-2">
                       {marketingResult.type === 'social' ? <Megaphone size={18} /> : <TrendingUp size={18} />}
                       {marketingResult.type === 'social' ? 'Generated Content' : 'Pricing Analysis'}
                    </div>
                    <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300 whitespace-pre-line">
                       {marketingResult.content}
                    </div>
                    <button 
                       onClick={() => {navigator.clipboard.writeText(marketingResult.content); alert('Copied to clipboard!')}}
                       className="mt-4 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-200 flex items-center gap-1"
                    >
                       <Edit size={12} /> Copy to Clipboard
                    </button>
                  </>
               )}
            </div>
         )}
      </div>
    );
  };

  const renderAdminView = () => {
    return (
      <div className="flex min-h-[calc(100vh-64px)] bg-gray-50 dark:bg-gray-900 transition-colors">
         {/* Sidebar Navigation */}
         <div className="w-20 lg:w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col sticky top-16 h-[calc(100vh-64px)]">
            <div className="p-4 space-y-2">
               <button 
                 onClick={() => { setAdminTab('dashboard'); setIsRoomFormOpen(false); }}
                 className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    adminTab === 'dashboard' ? 'bg-brand-50 dark:bg-gray-700 text-brand-700 dark:text-brand-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                 }`}
               >
                  <LayoutDashboard size={20} />
                  <span className="hidden lg:block font-medium">Dashboard</span>
               </button>
               <button 
                 onClick={() => setAdminTab('inventory')}
                 className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    adminTab === 'inventory' ? 'bg-brand-50 dark:bg-gray-700 text-brand-700 dark:text-brand-300' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                 }`}
               >
                  <List size={20} />
                  <span className="hidden lg:block font-medium">Inventory</span>
               </button>
            </div>
            <div className="mt-auto p-4 border-t border-gray-100 dark:border-gray-700">
               <div className="flex items-center gap-3 p-2 text-gray-500 dark:text-gray-400">
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center font-bold text-gray-600 dark:text-gray-300">
                     A
                  </div>
                  <div className="hidden lg:block">
                     <p className="text-sm font-bold text-gray-900 dark:text-white">Admin User</p>
                     <p className="text-xs">Manager</p>
                  </div>
               </div>
            </div>
         </div>

         {/* Main Content Area */}
         <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
               <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 capitalize">{adminTab}</h1>
               <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">
                  {adminTab === 'dashboard' && 'Overview of your property performance.'}
                  {adminTab === 'inventory' && 'Manage rooms, suites, and pricing.'}
               </p>
               
               {adminTab === 'dashboard' && renderAdminDashboard()}
               {adminTab === 'inventory' && renderAdminInventory()}
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen font-sans bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
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