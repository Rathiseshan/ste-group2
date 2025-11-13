import db, { holidayDB } from '../lib/db';

const singaporeHolidays2025 = [
  { date: '2025-01-01', name: "New Year's Day" },
  { date: '2025-01-29', name: 'Chinese New Year' },
  { date: '2025-01-30', name: 'Chinese New Year' },
  { date: '2025-04-18', name: 'Good Friday' },
  { date: '2025-05-01', name: 'Labour Day' },
  { date: '2025-05-12', name: 'Vesak Day' },
  { date: '2025-06-06', name: 'Hari Raya Puasa' },
  { date: '2025-08-09', name: 'National Day' },
  { date: '2025-08-13', name: 'Hari Raya Haji' },
  { date: '2025-10-20', name: 'Deepavali' },
  { date: '2025-12-25', name: 'Christmas Day' },
];

console.log('Seeding Singapore public holidays for 2025...');

for (const holiday of singaporeHolidays2025) {
  try {
    holidayDB.create(holiday.date, holiday.name, 'SG');
    console.log(`✓ Added: ${holiday.date} - ${holiday.name}`);
  } catch (error: any) {
    if (error.message && error.message.includes('UNIQUE')) {
      console.log(`  Skipped (already exists): ${holiday.date} - ${holiday.name}`);
    } else {
      console.error(`✗ Error adding ${holiday.date}:`, error.message);
    }
  }
}

console.log('\n✅ Singapore holidays seeded successfully!');
console.log(`Total holidays: ${holidayDB.getAll().length}`);
