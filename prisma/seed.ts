/**
 * Prisma Seed Script for Smart Order Management System (SOMS)
 * Seeds default Super Admin, cancellation reasons, and initial WooCommerce sample orders.
 */
import bcrypt from 'bcryptjs';

export async function getSeedData() {
  const superAdminPasswordHash = await bcrypt.hash('Rakib@@3236', 10);
  const moderatorPasswordHash = await bcrypt.hash('Moderator@@2026', 10);

  return {
    superAdmin: {
      id: 'usr_superadmin_01',
      name: 'MI Rakib',
      email: 'mirakib2246@gmail.com',
      password_hash: superAdminPasswordHash,
      role: 'super_admin' as const,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    sampleModerator: {
      id: 'usr_moderator_01',
      name: 'Tariq Hasan',
      email: 'tariq.moderator@soms.internal',
      password_hash: moderatorPasswordHash,
      role: 'moderator' as const,
      status: 'active' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    cancelReasons: [
      { id: 'cr_01', reason_text: 'Customer changed mind', is_active: true },
      { id: 'cr_02', reason_text: 'Duplicate order placed', is_active: true },
      { id: 'cr_03', reason_text: 'Price dispute / Found cheaper elsewhere', is_active: true },
      { id: 'cr_04', reason_text: 'Delivery time exceeds customer expectation', is_active: true },
      { id: 'cr_05', reason_text: 'Unreachable / Phone switched off', is_active: true },
      { id: 'cr_06', reason_text: 'Fake or invalid contact details', is_active: true },
      { id: 'cr_07', reason_text: 'Out of courier delivery coverage', is_active: true },
    ],
    initialSettings: {
      id: 'settings_global_01',
      wc_store_url: 'https://shop.example.com',
      wc_consumer_key: 'ck_7b9d62f8319f39e334a123456789abcdef012345',
      wc_consumer_secret: 'cs_8a2b53e7428c28d223b987654321fedcba543210',
      wc_webhook_secret: 'whsec_9876543210abcdeffedcba0987654321',
    },
  };
}

export default getSeedData;
