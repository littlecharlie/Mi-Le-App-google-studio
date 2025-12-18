import React, { useState, useEffect, useRef } from 'react';
import { UserRole, Room, Booking, RoomType, BookingStatus } from './types';
import { generateRoomDescription, generateMarketingContent, analyzePricing } from './services/geminiService';
import { 
  subscribeToRooms, 
  subscribeToBookings, 
  addRoomToFirebase, 
  updateRoomInFirebase, 
  deleteRoomFromFirebase, 
  addBookingToFirebase, 
  updateBookingStatusInFirebase,
  seedDatabase
} from './services/firebaseService';
import { isConfigured } from './firebaseConfig';
import { BookingModal } from './components/BookingModal';
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
  Phone,
  Database,
  AlertTriangle,
  Lock,
  WifiOff,
  RotateCcw,
  RefreshCw,
  MessageCircle,
  ExternalLink,
  Mail
} from 'lucide-react';

const App = () => {
  const [role, setRole] = useState<UserRole>(UserRole.CUSTOMER);
  const [customerSubView, setCustomerSubView] = useState<'home' | 'contact'>('home');
  
  // Data State
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  
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

  // Demo/Offline Mode State
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Error Modal State
  const [permissionErrorOpen, setPermissionErrorOpen] = useState(false);
  const errorModalShownRef = useRef(false);

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

  // Subscribe to Firebase Data
  useEffect(() => {
    if (!isConfigured) {
        setLoading(false);
        return;
    }

    setLoading(true);
    
    // Subscribe Rooms with error handling
    const unsubscribeRooms = subscribeToRooms(
      (fetchedRooms) => {
        setRooms(fetchedRooms);
        setLoading(false);
      },
      (error) => {
        console.error("Rooms subscription error:", error);
        setLoading(false);
        setIsOfflineMode(true);
        if (!errorModalShownRef.current) {
            setPermissionErrorOpen(true);
            errorModalShownRef.current = true;
        }
      }
    );

    // Subscribe Bookings with error handling
    const unsubscribeBookings = subscribeToBookings(
      (fetchedBookings) => {
        setBookings(fetchedBookings);
      },
      (error) => {
        console.error("Bookings subscription error:", error);
        setIsOfflineMode(true);
        if (!errorModalShownRef.current) {
            setPermissionErrorOpen(true);
            errorModalShownRef.current = true;
        }
      }
    );

    return () => {
      unsubscribeRooms();
      unsubscribeBookings();
    };
  }, []);

  // --- Helper: Action Handler with Fallback ---
  const performAction = async (
    actionName: string,
    firebaseAction: () => Promise<any>,
    localFallback: () => void
  ) => {
    try {
      await firebaseAction();
    } catch (error: any) {
      console.warn(`${actionName} failed on server, falling back to local:`, error);
      
      // If permission denied or other firebase error, switch to offline mode and do local update
      if (error.code === 'permission-denied' || error.message?.includes('permission')) {
        setIsOfflineMode(true);
        if (!errorModalShownRef.current) {
            setPermissionErrorOpen(true);
            errorModalShownRef.current = true;
        }
      }
      
      localFallback();
    }
  };

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
    if (!isConfigured) {
        alert("Firebase is not configured. Cannot save room.");
        return;
    }

    const primaryImage = newRoom.imageUrl || `https://picsum.photos/800/600?random=${rooms.length + 1}`;
    
    const amenitiesArray = Array.isArray(newRoom.amenities) 
      ? newRoom.amenities 
      : (newRoom.amenities as unknown as string).split(',').map(s => s.trim()).filter(s => s.length > 0);

    const roomData: any = {
      name: newRoom.name!,
      type: newRoom.type as RoomType,
      price: Number(newRoom.price),
      weekendPrice: newRoom.weekendPrice ? Number(newRoom.weekendPrice) : 0,
      description: newRoom.description || 'No description provided.',
      imageUrl: primaryImage,
      images: [primaryImage], 
      amenities: amenitiesArray,
      capacity: Number(newRoom.capacity) || 2,
      manualPricing: !!newRoom.manualPricing
    };

    if (editingRoomId) {
      // Edit Existing
      await performAction(
        'Update Room',
        () => updateRoomInFirebase(editingRoomId, roomData),
        () => {
          setRooms(prev => prev.map(r => r.id === editingRoomId ? { ...r, ...roomData } : r));
        }
      );
      alert("Room updated successfully!");
    } else {
      // Create New
      await performAction(
        'Create Room',
        () => addRoomToFirebase(roomData),
        () => {
          const newId = 'local_' + Date.now();
          setRooms(prev => [...prev, { ...roomData, id: newId }]);
        }
      );
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

  const handleDeleteRoom = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this room? This action cannot be undone.")) {
      await performAction(
        'Delete Room',
        () => deleteRoomFromFirebase(id),
        () => {
          setRooms(prev => prev.filter(r => r.id !== id));
        }
      );
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

  const handleBookingCreate = async (details: any) => {
    const newBooking = {
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

    await performAction(
      'Booking',
      () => isConfigured ? addBookingToFirebase(newBooking) : Promise.reject('No config'),
      () => {
        setBookings(prev => [{...newBooking, id: 'local_' + Date.now()} as Booking, ...prev]);
      }
    );

    setSuccessBookingDetails({ ...newBooking, roomName: details.roomName });
    setSuccessModalOpen(true);
  };

  const updateBookingStatus = async (id: string, status: BookingStatus) => {
    await performAction(
      'Update Status',
      () => updateBookingStatusInFirebase(id, status),
      () => {
        setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      }
    );
  };

  const handleSeedDatabase = async () => {
    try {
      await seedDatabase();
      alert("Database seeded successfully with initial rooms!");
    } catch (error) {
      console.warn("Seeding failed server-side, forcing refresh might be needed.");
      alert("Seeding failed (Database Locked). You can manually add rooms.");
    }
  };

  const handleSendStatusWhatsApp = (booking: Booking) => {
    const room = rooms.find(r => r.id === booking.roomId);
    const phone = booking.customerPhone.replace(/\D/g, ''); // Remove non-numeric chars
    
    let message = '';
    if (booking.status === BookingStatus.CONFIRMED) {
      message = `Hello ${booking.customerName}, your booking for ${room?.name || 'your room'} from ${booking.checkIn} to ${booking.checkOut} at Mi Le Garden has been confirmed. We look forward to seeing you!`;
    } else if (booking.status === BookingStatus.CANCELLED) {
      message = `Hello ${booking.customerName}, your booking for ${room?.name || 'your room'} from ${booking.checkIn} to ${booking.checkOut} at Mi Le Garden has been cancelled. Please contact us if you have any questions.`;
    }

    if (message) {
      const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(url, '_blank');
    }
  };

  // --- Views ---

  const renderConfigWarning = () => {
    if (isConfigured) return null;
    return (
      <div className="bg-red-600 text-white px-4 py-3 text-center font-bold sticky top-0 z-[60] flex items-center justify-center gap-2 shadow-md">
        <AlertTriangle size={20} />
        <span>Action Required: Update firebaseConfig.ts with your Firebase Project keys to enable database features.</span>
      </div>
    );
  };

  const renderOfflineWarning = () => {
    if (!isOfflineMode) return null;
    return (
      <div className="bg-orange-500 text-white px-4 py-2 text-sm text-center font-bold sticky top-0 z-[60] flex items-center justify-center gap-2 shadow-md">
        <WifiOff size={16} />
        <span>Demo Mode: Database is locked or disconnected. Changes are saved locally only.</span>
        <button onClick={() => window.location.reload()} className="bg-white/20 hover:bg-white/30 px-2 py-1 rounded text-xs ml-2 flex items-center gap-1">
            <RefreshCw size={12} /> Retry
        </button>
      </div>
    );
  };

  const renderPermissionErrorModal = () => {
    if (!permissionErrorOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
          <div className="bg-red-600 p-4 text-white flex items-center gap-2">
            <Lock size={24} />
            <h3 className="text-lg font-bold">Database Locked</h3>
          </div>
          <div className="p-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm leading-relaxed">
              Firebase is blocking read/write operations. If you just updated the rules to <code>allow read, write: if true;</code>, you need to refresh the page to clear the error cache.
            </p>
            <div className="bg-gray-100 dark:bg-gray-900 p-4 rounded-lg mb-6 text-xs font-mono overflow-x-auto">
               <div className="flex justify-between items-center mb-2">
                   <span className="text-gray-500 font-bold uppercase">Required Rules</span>
                   <span className="text-green-600 dark:text-green-400 text-[10px] bg-green-100 dark:bg-green-900/30 px-2 py-0.5 rounded">Security Rule</span>
               </div>
               <div className="text-blue-600 dark:text-blue-400">
                service cloud.firestore {'{'}<br/>
                &nbsp;&nbsp;match /databases/{'{'}database{'}'}/documents {'{'}<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;match /{'('}document=**{')'} {'{'}<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;allow read, write: if true;<br/>
                &nbsp;&nbsp;&nbsp;&nbsp;{'}'}<br/>
                &nbsp;&nbsp;{'}'}<br/>
                {'}'}
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
                 <button 
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
                >
                  <RefreshCw size={18} /> I Updated Rules, Refresh
                </button>
                <button 
                  onClick={() => setPermissionErrorOpen(false)}
                  className="px-4 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-100 dark:text-white dark:hover:bg-gray-700 dark:border-gray-600 transition text-sm text-center"
                >
                  Close & Use Demo Mode
                </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderNavbar = () => (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div 
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => { if(role === UserRole.CUSTOMER) setCustomerSubView('home'); }}
          >
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-serif font-bold">M</div>
            <span className="font-serif text-xl font-bold text-gray-900 dark:text-white tracking-tight">Mi Le Garden</span>
          </div>
          <div className="flex items-center space-x-4">
            {role === UserRole.CUSTOMER && (
              <div className="hidden sm:flex items-center space-x-4 mr-4">
                 <button 
                  onClick={() => setCustomerSubView('home')}
                  className={`text-sm font-medium transition-colors ${customerSubView === 'home' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                 >
                   Rooms
                 </button>
                 <button 
                  onClick={() => setCustomerSubView('contact')}
                  className={`text-sm font-medium transition-colors ${customerSubView === 'contact' ? 'text-brand-600 dark:text-brand-400' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                 >
                   Contact Us
                 </button>
              </div>
            )}

            <div className="hidden md:flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              {Object.values(UserRole).map((r) => (
                <button
                  key={r}
                  onClick={() => { 
                    setRole(r); 
                    if(r === UserRole.ADMIN) setAdminTab('dashboard');
                    if(r === UserRole.CUSTOMER) setCustomerSubView('home');
                  }}
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
          </div>
        </div>
      </div>
    </nav>
  );

  const renderFooter = () => (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-6 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
          MI LE GARDEN SDN. BHD. (1533440-V)
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Copyright &copy; {new Date().getFullYear()} All Rights Reserved.
        </p>
      </div>
    </footer>
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
          <div className="w-16 h-16 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-brand-600 dark:text-brand-400">
            <Clock size={32} />
          </div>
          <h3 className="text-xl font-serif font-bold text-gray-900 dark:text-white mb-2">Waiting for Confirmation</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
            Thank you, {successBookingDetails.customerName}. Your reservation request has been received. We will WhatsApp once booking is confirmed.
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
              <span className="font-bold text-brand-600 dark:text-brand-400 text-lg">RM{successBookingDetails.totalPrice}</span>
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
    if (customerSubView === 'contact') {
      return (
        <div className="flex-1 bg-gray-50 dark:bg-gray-900 min-h-screen animate-fade-in transition-colors">
          <div className="max-w-4xl mx-auto px-4 py-16">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-white mb-4">Get in Touch</h1>
              <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
                We're here to help you plan your perfect getaway. Reach out to us through any of the channels below.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Contact Cards */}
               <div className="space-y-6">
                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-start gap-4">
                     <div className="p-3 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-xl">
                        <Phone size={24} />
                     </div>
                     <div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1">Phone & WhatsApp</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">016-2157028</p>
                        <a 
                          href="https://wa.me/60162157028" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-brand-600 dark:text-brand-400 text-sm font-bold flex items-center gap-1 hover:underline"
                        >
                           <MessageCircle size={14} /> Message on WhatsApp
                        </a>
                     </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-start gap-4">
                     <div className="p-3 bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 rounded-xl">
                        <MapPin size={24} />
                     </div>
                     <div>
                        <h3 className="font-bold text-gray-900 dark:text-white mb-1">Our Location</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed mb-3">
                           Lot 10197, Jalan Parit 5, Sawah Site B,<br />
                           45400 Sekinchan, Selangor
                        </p>
                        <a 
                          href="https://maps.app.goo.gl/4GnCLHS1tYWKdh1C6" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-brand-600 dark:text-brand-400 text-sm font-bold flex items-center gap-1 hover:underline"
                        >
                           <ExternalLink size={14} /> View on Google Maps
                        </a>
                     </div>
                  </div>
               </div>

               {/* Map Placeholder or Visual */}
               <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl overflow-hidden shadow-inner border border-gray-200 dark:border-gray-700 relative min-h-[300px] group">
                  <img 
                    src="https://picsum.photos/800/600?nature" 
                    alt="Sekinchan" 
                    className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition duration-700"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-black/20">
                     <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl max-w-xs">
                        <MapPin className="text-brand-600 dark:text-brand-400 mx-auto mb-4" size={40} />
                        <h4 className="font-bold text-gray-900 dark:text-white mb-2">Visit Sekinchan</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-6 italic">"Surrounded by beautiful paddy fields and serenity."</p>
                        <a 
                          href="https://maps.app.goo.gl/4GnCLHS1tYWKdh1C6" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full bg-brand-600 hover:bg-brand-700 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2"
                        >
                           Navigate Now
                        </a>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      );
    }

    const filteredRooms = rooms.filter(room => {
      const matchesType = filterType === 'All' || room.type === filterType;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = room.name.toLowerCase().includes(searchLower) || 
                          room.description.toLowerCase().includes(searchLower);
      return matchesType && matchesSearch;
    });

    return (
      <div className="flex-1 bg-gray-50 dark:bg-gray-900 pb-20 transition-colors">
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
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button 
                onClick={() => document.getElementById('rooms-grid')?.scrollIntoView({ behavior: 'smooth' })}
                className="bg-white text-brand-900 px-8 py-3 rounded-full font-medium hover:bg-brand-50 transition transform hover:-translate-y-1 shadow-xl"
              >
                Book Your Stay
              </button>
              <button 
                onClick={() => setCustomerSubView('contact')}
                className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-8 py-3 rounded-full font-medium hover:bg-white/20 transition transform hover:-translate-y-1"
              >
                Contact Us
              </button>
            </div>
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
            {loading && rooms.length === 0 ? (
              <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500">
                <div className="w-10 h-10 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mb-4"></div>
                <p>Loading accommodations...</p>
              </div>
            ) : filteredRooms.length > 0 ? (
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
                        <span className="text-lg font-bold text-brand-600 dark:text-brand-400">RM{room.price}</span>
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
                              <span className="text-sm font-semibold text-gray-500 dark:text-gray-400">RM{room.weekendPrice}</span>
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
                {isConfigured && (
                  <button 
                    onClick={handleSeedDatabase}
                    className="mt-4 text-brand-600 dark:text-brand-400 font-medium hover:text-brand-700 dark:hover:text-brand-300 hover:underline flex items-center justify-center w-full gap-2"
                  >
                    <Database size={16} /> Populate Sample Data
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

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
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white font-medium">{room?.name || 'Unknown Room'}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{room?.type}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1 text-sm">
                             <span>{booking.checkIn} - {booking.checkOut}</span>
                             <span className="text-xs text-gray-400">{booking.guests} Guests</span>
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
                          <div className="flex flex-col gap-2">
                             {booking.status === BookingStatus.PENDING && (
                               <button 
                                 onClick={() => updateBookingStatus(booking.id, BookingStatus.CONFIRMED)}
                                 className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-md transition hover:bg-green-100 dark:hover:bg-green-900/40"
                               >
                                 <CheckCircle size={14} /> Approve
                               </button>
                             )}
                             {booking.status === BookingStatus.CONFIRMED && (
                               <button 
                                 onClick={() => updateBookingStatus(booking.id, BookingStatus.CHECKED_IN)}
                                 className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-3 py-1.5 rounded-md transition hover:bg-blue-100 dark:hover:bg-blue-900/40"
                               >
                                 <LogIn size={14} /> Check In
                               </button>
                             )}
                              {booking.status === BookingStatus.CHECKED_IN && (
                               <button 
                                 onClick={() => updateBookingStatus(booking.id, BookingStatus.CHECKED_OUT)}
                                 className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white flex items-center gap-1 bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded-md transition hover:bg-gray-200 dark:hover:bg-gray-600"
                               >
                                 <LogOut size={14} /> Check Out
                               </button>
                             )}
                             {(booking.status === BookingStatus.CONFIRMED || booking.status === BookingStatus.CANCELLED) && (
                                <button 
                                  onClick={() => handleSendStatusWhatsApp(booking)}
                                  className="text-[#25D366] hover:text-[#128C7E] flex items-center gap-1 bg-green-50 dark:bg-green-900/20 px-3 py-1.5 rounded-md transition text-xs font-bold"
                                >
                                  <MessageCircle size={14} /> Notify Customer
                                </button>
                             )}
                             {(booking.status === BookingStatus.PENDING || booking.status === BookingStatus.CONFIRMED) && (
                                <button 
                                  onClick={() => updateBookingStatus(booking.id, BookingStatus.CANCELLED)}
                                  className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1 mt-1 text-[10px] uppercase font-bold px-3"
                                >
                                  Cancel Booking
                                </button>
                             )}
                          </div>
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
    // Calculate simple stats
    const totalRevenue = bookings.reduce((acc, curr) => {
        if (curr.status !== BookingStatus.CANCELLED) {
            return acc + curr.totalPrice;
        }
        return acc;
    }, 0);
    
    const activeBookings = bookings.filter(b => b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.CHECKED_IN).length;
    const pendingBookings = bookings.filter(b => b.status === BookingStatus.PENDING).length;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-lg">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</p>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">RM{totalRevenue.toLocaleString()}</h3>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                        <CalendarCheck size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Bookings</p>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{activeBookings}</h3>
                    </div>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-lg">
                        <Bell size={24} />
                    </div>
                    <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Requests</p>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{pendingBookings}</h3>
                    </div>
                </div>
            </div>
        </div>

        {/* Recent Bookings List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-gray-900 dark:text-white">Recent Bookings</h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {bookings.slice(0, 5).map(booking => {
                    const roomName = rooms.find(r => r.id === booking.roomId)?.name || 'Unknown Room';
                    return (
                        <div key={booking.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-900/50 flex items-center justify-center text-brand-700 dark:text-brand-300 font-bold">
                                    {booking.customerName.charAt(0)}
                                </div>
                                <div>
                                    <p className="font-medium text-gray-900 dark:text-white">{booking.customerName}</p>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">{roomName} • {new Date(booking.checkIn).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="font-medium text-gray-900 dark:text-white">RM{booking.totalPrice}</span>
                                <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                    booking.status === BookingStatus.CONFIRMED ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' :
                                    booking.status === BookingStatus.PENDING ? 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800' :
                                    'bg-gray-50 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700'
                                }`}>
                                    {booking.status}
                                </span>
                            </div>
                        </div>
                    );
                })}
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
                  {newRoom.type === RoomType.RESORT ? 'Weekday Price per Pax (RM)' : 'Weekday Price (RM)'}
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
                  {newRoom.type === RoomType.RESORT ? 'Weekend Price per Pax (RM)' : 'Weekend Price (RM)'}
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
                         RM{room.price} / {room.weekendPrice ? `RM${room.weekendPrice}` : '-'}
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
        </div>
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
         </div>

         {/* Main Content Area */}
         <div className="flex-1 p-6 lg:p-10 overflow-y-auto">
            <div className="max-w-6xl mx-auto">
               <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 capitalize">{adminTab}</h1>
               {adminTab === 'dashboard' && renderAdminDashboard()}
               {adminTab === 'inventory' && renderAdminInventory()}
            </div>
         </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
      {renderConfigWarning()}
      {renderOfflineWarning()}
      {renderNavbar()}
      <main className="flex-1 w-full">
        {role === UserRole.CUSTOMER && renderCustomerView()}
        {role === UserRole.STAFF && renderStaffView()}
        {role === UserRole.ADMIN && renderAdminView()}
      </main>
      {renderFooter()}
      {renderSuccessModal()}
      {renderPermissionErrorModal()}
    </div>
  );
};

export default App;