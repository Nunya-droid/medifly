import type { User } from '@/types';
import { demoDigest } from '@/utils/id';
import { DEMO_PASSWORD } from '@/constants/catalog';

/** All people are fictional. Phone numbers use Ghanaian formatting but are not real contacts. */
export function seedUsers(now: number): User[] {
  const digest = demoDigest(DEMO_PASSWORD);
  const days = (n: number) => new Date(now - n * 86400000).toISOString();
  return [
    {
      id: 'usr-customer-ama',
      role: 'customer',
      name: 'Ama Mensah',
      email: 'customer@medifly.demo',
      phone: '+233 24 555 0142',
      passwordDigest: digest,
      createdAt: days(160),
      isDemoAccount: true,
      addresses: [
        { id: 'addr-ama-home', label: 'Home', recipientName: 'Ama Mensah', phone: '+233 24 555 0142', region: 'Greater Accra', city: 'Accra', serviceAreaId: 'sa-madina', area: 'Madina Estates, House 12', landmark: 'Behind Madina Polyclinic', instructions: 'Blue gate. Call on arrival.', isDefault: true },
        { id: 'addr-ama-mum', label: "Mum's house", recipientName: 'Grace Mensah', phone: '+233 20 555 0177', region: 'Greater Accra', city: 'Accra', serviceAreaId: 'sa-east-legon', area: 'East Legon, Mensah Close 4', landmark: 'Near American House junction', instructions: 'Hand to Grace or the caretaker.' },
        { id: 'addr-ama-office', label: 'Office', recipientName: 'Ama Mensah', phone: '+233 24 555 0142', region: 'Greater Accra', city: 'Accra', serviceAreaId: 'sa-airport', area: 'Airport Residential, Liberation Link Office Park', landmark: 'Reception, Block B' },
      ],
    },
    { id: 'usr-customer-kofi', role: 'customer', name: 'Kofi Owusu', email: 'kofi.owusu@example.demo', phone: '+233 27 555 0198', passwordDigest: digest, createdAt: days(120), addresses: [{ id: 'addr-kofi-1', label: 'Home', recipientName: 'Kofi Owusu', phone: '+233 27 555 0198', region: 'Greater Accra', city: 'Accra', serviceAreaId: 'sa-adenta', area: 'Adenta SSNIT Flats, Block 7', landmark: 'Adenta Barrier', isDefault: true }] },
    { id: 'usr-customer-efe', role: 'customer', name: 'Efe Agyeman', email: 'efe.agyeman@example.demo', phone: '+233 54 555 0123', passwordDigest: digest, createdAt: days(95), addresses: [{ id: 'addr-efe-1', label: 'Hostel', recipientName: 'Efe Agyeman', phone: '+233 54 555 0123', region: 'Greater Accra', city: 'Accra', serviceAreaId: 'sa-legon', area: 'Legon, Volta Hall Annex', landmark: 'Main porters lodge', isDefault: true }] },
    { id: 'usr-customer-yaa', role: 'customer', name: 'Yaa Darko', email: 'yaa.darko@example.demo', phone: '+233 26 555 0164', passwordDigest: digest, createdAt: days(80), addresses: [{ id: 'addr-yaa-1', label: 'Home', recipientName: 'Yaa Darko', phone: '+233 26 555 0164', region: 'Greater Accra', city: 'Accra', serviceAreaId: 'sa-east-legon', area: 'East Legon, Boundary Road 18', landmark: 'Opposite the fuel station', isDefault: true }] },
    { id: 'usr-customer-nii', role: 'customer', name: 'Nii Armah', email: 'nii.armah@example.demo', phone: '+233 50 555 0109', passwordDigest: digest, createdAt: days(60), addresses: [{ id: 'addr-nii-1', label: 'Home', recipientName: 'Nii Armah', phone: '+233 50 555 0109', region: 'Greater Accra', city: 'Accra', serviceAreaId: 'sa-osu', area: 'Osu, 9th Lane', landmark: 'Behind the Osu Castle road', isDefault: true }] },
    { id: 'usr-customer-akua', role: 'customer', name: 'Akua Boateng', email: 'akua.boateng@example.demo', phone: '+233 24 555 0186', passwordDigest: digest, createdAt: days(35), addresses: [{ id: 'addr-akua-1', label: 'Home', recipientName: 'Akua Boateng', phone: '+233 24 555 0186', region: 'Greater Accra', city: 'Accra', serviceAreaId: 'sa-madina', area: 'Madina, Social Welfare Road 3', landmark: 'Near Zongo Junction', isDefault: true }] },
    { id: 'usr-pharmacy-kwame', role: 'pharmacy', name: 'Kwame Asante', title: 'Superintendent pharmacist (fictional)', email: 'pharmacy@medifly.demo', phone: '+233 30 250 1001', passwordDigest: digest, createdAt: days(210), pharmacyId: 'ph-community', isDemoAccount: true },
    { id: 'usr-pharmacy-akosua', role: 'pharmacy', name: 'Akosua Ofori', title: 'Pharmacist (fictional)', email: 'madinacare.staff@example.demo', phone: '+233 30 250 1002', passwordDigest: digest, createdAt: days(180), pharmacyId: 'ph-madina-care' },
    { id: 'usr-courier-yaw', role: 'courier', name: 'Yaw Boateng', email: 'courier@medifly.demo', phone: '+233 24 555 0311', passwordDigest: digest, createdAt: days(140), courierId: 'cr-yaw', isDemoAccount: true },
    { id: 'usr-admin-efua', role: 'admin', name: 'Efua Sarpong', title: 'Operations lead', email: 'admin@medifly.demo', phone: '+233 30 250 0000', passwordDigest: digest, createdAt: days(220), isDemoAccount: true },
  ];
}
