import { Room, RoomType } from './types';

export const INITIAL_ROOMS: Room[] = [
  {
    id: '1',
    name: 'Oceanview Paradise Chalet',
    type: RoomType.CHALET,
    price: 450,
    weekendPrice: 550,
    description: 'Experience the ultimate luxury in our Oceanview Paradise Chalet. Perched above the turquoise waters, this chalet offers breathtaking panoramic views, a private infinity pool, and direct beach access. Inside, enjoy a spacious living area with modern amenities and a king-sized bed wrapped in premium linens.',
    imageUrl: 'https://picsum.photos/800/600?random=1',
    images: [
      'https://picsum.photos/800/600?random=1',
      'https://picsum.photos/800/600?random=11',
      'https://picsum.photos/800/600?random=12'
    ],
    amenities: ['Ocean View', 'Private Pool', 'WiFi', 'King Bed', 'Minibar'],
    capacity: 2
  },
  {
    id: '2',
    name: 'Alpine Retreat Suite',
    type: RoomType.SUITE,
    price: 320,
    weekendPrice: 380,
    description: 'Nestled in the quiet corner of our resort, the Alpine Retreat Suite offers a cozy yet sophisticated atmosphere. Featuring a stone fireplace, a large balcony overlooking the mountains, and a spa-inspired bathroom with a soaking tub.',
    imageUrl: 'https://picsum.photos/800/600?random=2',
    images: [
      'https://picsum.photos/800/600?random=2',
      'https://picsum.photos/800/600?random=21',
      'https://picsum.photos/800/600?random=22'
    ],
    amenities: ['Mountain View', 'Fireplace', 'Balcony', 'Soaking Tub', 'Room Service'],
    capacity: 4
  },
  {
    id: '3',
    name: 'Garden Deluxe Room',
    type: RoomType.ROOM,
    price: 180,
    weekendPrice: 220,
    description: 'Our Garden Deluxe Room is perfect for those seeking tranquility. Surrounded by lush tropical gardens, this room features a private patio, contemporary decor, and all the essentials for a comfortable stay.',
    imageUrl: 'https://picsum.photos/800/600?random=3',
    images: [
      'https://picsum.photos/800/600?random=3',
      'https://picsum.photos/800/600?random=31'
    ],
    amenities: ['Garden View', 'Patio', 'Smart TV', 'Coffee Maker'],
    capacity: 2
  },
  {
    id: '4',
    name: 'Royal Palms Resort Villa',
    type: RoomType.RESORT,
    price: 150, // Per pax weekday
    weekendPrice: 200, // Per pax weekend
    description: 'The crown jewel of our property, the Royal Palms Villa is a standalone sanctuary designed for families or groups. It boasts three bedrooms, a full gourmet kitchen, a private courtyard with a heated pool, and dedicated butler service.',
    imageUrl: 'https://picsum.photos/800/600?random=4',
    images: [
      'https://picsum.photos/800/600?random=4',
      'https://picsum.photos/800/600?random=41',
      'https://picsum.photos/800/600?random=42',
      'https://picsum.photos/800/600?random=43'
    ],
    amenities: ['3 Bedrooms', 'Private Kitchen', 'Heated Pool', 'Butler Service', 'Private Courtyard'],
    capacity: 8
  }
];

export const MOCK_BOOKINGS = [
  {
    id: 'b1',
    roomId: '1',
    customerName: 'Alice Johnson',
    customerEmail: 'alice@example.com',
    checkIn: '2023-11-01',
    checkOut: '2023-11-05',
    guests: 2,
    totalPrice: 1800,
    status: 'Confirmed',
    createdAt: new Date().toISOString()
  },
  {
    id: 'b2',
    roomId: '3',
    customerName: 'Bob Smith',
    customerEmail: 'bob@example.com',
    checkIn: '2023-11-10',
    checkOut: '2023-11-12',
    guests: 1,
    totalPrice: 360,
    status: 'Pending',
    createdAt: new Date().toISOString()
  }
];