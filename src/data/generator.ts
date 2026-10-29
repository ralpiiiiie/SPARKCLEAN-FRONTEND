export function seededRandom(seed: number): () => number {
  let x = Math.sin(seed++) * 10000;
  return () => {
    x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  };
}

export const branches = [
  { id: 'BR001', name: 'Cebu City', city: 'Cebu City', lat: 10.3157, lng: 123.8854, manager: 'Maria Santos' },
  { id: 'BR002', name: 'Mandaue', city: 'Mandaue', lat: 10.3451, lng: 123.9454, manager: 'Juan Dela Cruz' },
  { id: 'BR003', name: 'Lapu-Lapu', city: 'Lapu-Lapu', lat: 10.3078, lng: 123.9387, manager: 'Ana Reyes' },
  { id: 'BR004', name: 'Talisay', city: 'Talisay', lat: 10.2876, lng: 123.8717, manager: 'Pedro Garcia' },
  { id: 'BR005', name: 'Consolacion', city: 'Consolacion', lat: 10.3833, lng: 123.9567, manager: 'Liza Mendoza' },
  { id: 'BR006', name: 'Minglanilla', city: 'Minglanilla', lat: 10.2478, lng: 123.8876, manager: 'Carlos Tan' },
];

export const plants = [
  { id: 'PL001', name: 'Cebu City Plant', city: 'Cebu City', monthlyCapacity: 2500, lat: 10.3200, lng: 123.8900 },
  { id: 'PL002', name: 'Mandaue Plant', city: 'Mandaue', monthlyCapacity: 2200, lat: 10.3500, lng: 123.9400 },
];

export const services = [
  { id: 'SV001', name: 'Wash & Fold', description: 'Standard wash and fold service', pricePerKg: 45, turnaroundHours: 24 },
  { id: 'SV002', name: 'Wash-Dry-Fold', description: 'Wash, dry and fold', pricePerKg: 55, turnaroundHours: 24 },
  { id: 'SV003', name: 'Dry Cleaning', description: 'Professional dry cleaning', pricePerKg: 120, turnaroundHours: 48 },
  { id: 'SV004', name: 'Comforter/Bedding', description: 'Large item cleaning', pricePerKg: 85, turnaroundHours: 36 },
  { id: 'SV005', name: 'Ironing Only', description: 'Professional ironing service', pricePerKg: 35, turnaroundHours: 12 },
  { id: 'SV006', name: 'Express 3-hour', description: 'Same day express service', pricePerKg: 95, turnaroundHours: 3 },
  { id: 'SV007', name: 'Wedding Gown', description: 'Special care for wedding gowns', pricePerKg: 250, turnaroundHours: 72 },
  { id: 'SV008', name: 'Curtains', description: 'Curtain cleaning service', pricePerKg: 75, turnaroundHours: 48 },
  { id: 'SV009', name: 'Carpet Cleaning', description: 'Carpet and rug cleaning', pricePerKg: 90, turnaroundHours: 48 },
  { id: 'SV010', name: 'Shoe Cleaning', description: 'Shoe and leather cleaning', pricePerKg: 65, turnaroundHours: 24 },
  { id: 'SV011', name: 'Mattress Cleaning', description: 'Mattress deep cleaning', pricePerKg: 110, turnaroundHours: 36 },
  { id: 'SV012', name: 'Laundry Subscription', description: 'Monthly laundry plan', pricePerKg: 38, turnaroundHours: 24 },
];

const cebuanoNames = [
  'Maria Santos', 'Juan Dela Cruz', 'Ana Reyes', 'Pedro Garcia', 'Liza Mendoza',
  'Carlos Tan', 'Elena Rodriguez', 'Miguel Aquino', 'Sofia Reyes', 'Jose Cruz',
  'Rosa Lim', 'Antonio Villanueva', 'Isabel Torres', 'Ramon Salas', 'Carmen Flores',
  'Fernando Lopez', 'Alma Garcia', 'Ricardo Santos', 'Margarita Cruz', 'Eduardo Reyes',
  'Patricia Lim', 'Roberto Tan', 'Lourdes Villanueva', 'Gabriel Aquino', 'Cecilia Morales',
  'Victor Reyes', 'Ruth Santos', 'Alberto Cruz', 'Monica Garcia', 'Ramon Lopez',
];

const cebuanoSurnames = ['Santos', 'Cruz', 'Reyes', 'Garcia', 'Mendoza', 'Tan', 'Rodriguez', 'Aquino', 'Lim', 'Villanueva', 'Torres', 'Salas', 'Flores', 'Lopez', 'Morales'];

const customerTypes = ['Individual', 'Condo', 'Dormitory', 'Hotel', 'Restaurant', 'Clinic'] as const;
const loyaltyTiers = ['Bronze', 'Silver', 'Gold', 'Platinum'] as const;

export function generateMockData() {
  const rand = seededRandom(42);
  
  // Generate customers
  const customers = Array.from({ length: 150 }, (_, i) => {
    const firstName = cebuanoNames[Math.floor(rand() * cebuanoNames.length)].split(' ')[0];
    const lastName = cebuanoSurnames[Math.floor(rand() * cebuanoSurnames.length)];
    const branch = branches[Math.floor(rand() * branches.length)].name;
    const type = customerTypes[Math.floor(rand() * customerTypes.length)];
    
    return {
      id: `CUS${String(i + 1).padStart(4, '0')}`,
      name: `${firstName} ${lastName}`,
      phone: `09${Math.floor(100000000 + rand() * 900000000)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
      address: `${Math.floor(rand() * 500) + 1} ${['B', 'P', 'Tingub', 'Fuentes', 'Parian', 'Carbon'][Math.floor(rand() * 6)]} ${branch}`,
      branch,
      type,
      joinDate: new Date(2022 + Math.floor(rand() * 3), Math.floor(rand() * 12), Math.floor(rand() * 28) + 1).toISOString().split('T')[0],
      loyaltyTier: loyaltyTiers[Math.floor(rand() * loyaltyTiers.length)],
    };
  });

  // Generate branch monthly demand (162 rows = 6 branches x 27 months)
  const branchMonthlyDemand: any[] = [];

  for (let month = 1; month <= 27; month++) {
    branches.forEach((branch) => {
      let baseLoads = 800;
      
      if (branch.name === 'Mandaue') {
        // Almost perfectly linear growth
        baseLoads = 400 + month * 35 + (rand() - 0.5) * 20;
      } else if (branch.name === 'Talisay') {
        // Almost perfectly linear decline
        baseLoads = 1400 - month * 25 + (rand() - 0.5) * 30;
      } else if (branch.name === 'Lapu-Lapu') {
        // Bell-shaped quadratic
        baseLoads = 600 + 1200 * Math.exp(-0.02 * Math.pow(month - 14, 2)) + (rand() - 0.5) * 40;
      } else if (branch.name === 'Minglanilla') {
        // Bell-shaped cubic
        const x = (month - 14) / 7;
        baseLoads = 500 + 1000 * (1 - Math.pow(x, 2)) * Math.exp(-0.1 * x * x) + (rand() - 0.5) * 35;
      } else if (branch.name === 'Cebu City') {
        // Very noisy with seasonal variation
        baseLoads = 900 + Math.sin(month * 0.5) * 200 + (rand() - 0.5) * 150 + Math.sin(month * 0.1) * 100;
      } else if (branch.name === 'Consolacion') {
        // Very noisy/random
        baseLoads = 700 + (rand() - 0.5) * 300 + Math.sin(month * 0.3) * 150;
      }

      branchMonthlyDemand.push({
        branch: branch.name,
        monthNo: month,
        loads: Math.max(100, Math.round(baseLoads)),
        monthLabel: `2022-${String(((month - 1) % 12) + 1).padStart(2, '0')}`,
      });
    });
  }

  // Generate orders (600)
  const orders = Array.from({ length: 600 }, (_, i) => {
    const customer = customers[Math.floor(rand() * customers.length)];
    const service = services[Math.floor(rand() * services.length)];
    const kg = Math.floor(3 + rand() * 15);
    const loads = Math.ceil(kg / 8);
    const amount = kg * service.pricePerKg;
    
    return {
      id: `ORD${String(i + 1).padStart(5, '0')}`,
      customerId: customer.id,
      branch: customer.branch,
      serviceId: service.id,
      kg,
      loads,
      amount,
      paymentMethod: ['Cash', 'GCash', 'Maya', 'Card'][Math.floor(rand() * 4)],
      status: ['Received', 'Washing', 'Ready', 'Delivered', 'Cancelled'][Math.floor(rand() * 5)],
      orderDate: new Date(2022 + Math.floor(rand() * 3), Math.floor(rand() * 12), Math.floor(rand() * 28) + 1).toISOString().split('T')[0],
      isPickup: rand() > 0.5,
    };
  });

  // Generate marketing campaigns (60)
  const campaignChannels = ['Facebook', 'TikTok', 'Flyers', 'Referral', 'Radio', 'Promo Code'] as const;
  const marketingCampaigns = Array.from({ length: 60 }, (_, i) => {
    const channel = campaignChannels[Math.floor(rand() * campaignChannels.length)];
    const branch = branches[Math.floor(rand() * branches.length)].name;
    const startMonth = Math.floor(rand() * 24) + 1;
    const duration = Math.floor(Math.random() * 3) + 1;
    
    const budget = Math.floor(5000 + rand() * 25000);
    const newCustomers = Math.floor(budget / 100 * (0.5 + rand() * 1.5));
    const revenueGenerated = newCustomers * 1500 * (0.8 + rand() * 0.4);
    
    return {
      id: `CMP${String(i + 1).padStart(4, '0')}`,
      name: `${channel} Campaign ${i + 1}`,
      channel,
      branch,
      startDate: new Date(2022 + Math.floor(startMonth / 12), startMonth % 12, 1).toISOString().split('T')[0],
      endDate: new Date(2022 + Math.floor((startMonth + duration) / 12), (startMonth + duration) % 12, 1).toISOString().split('T')[0],
      budget,
      newCustomers,
      revenueGenerated,
    };
  });

  // Generate plant deliveries (120)
  const plantDeliveries = Array.from({ length: 120 }, (_, i) => {
    const plant = plants[Math.floor(rand() * plants.length)].name;
    const branch = branches[Math.floor(rand() * branches.length)].name;
    const loads = Math.floor(50 + rand() * 200);
    const costPerLoad = 3 + rand() * 15;
    
    return {
      id: `DEL${String(i + 1).padStart(4, '0')}`,
      plant,
      branch,
      date: new Date(2023 + Math.floor(rand() * 2), Math.floor(rand() * 12), Math.floor(rand() * 28) + 1).toISOString().split('T')[0],
      loads,
      cost: Math.round(loads * costPerLoad),
      status: (['Completed', 'In Transit', 'Delayed'] as const)[Math.floor(rand() * 3)],
    };
  });

  // Generate delivery cost matrix
  const deliveryCostMatrix = branches.flatMap(branch => 
    plants.map(plant => {
      const distance = Math.sqrt(
        Math.pow(branch.lat - plant.lat, 2) + 
        Math.pow(branch.lng - plant.lng, 2)
      ) * 100;
      const costPerLoad = Math.round(3 + distance * 0.8 + (rand() - 0.5) * 2);
      
      return {
        plant: plant.name,
        branch: branch.name,
        costPerLoad: Math.max(3, Math.min(18, costPerLoad)),
        distanceKm: Math.round(distance),
      };
    })
  );

  return {
    customers,
    orders,
    branchMonthlyDemand,
    marketingCampaigns,
    plantDeliveries,
    branches,
    plants,
    services,
    deliveryCostMatrix,
  };
}
