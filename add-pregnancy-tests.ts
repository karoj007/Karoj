import { db } from '../server/db';
import { tests } from '../shared/schema';
import { randomUUID } from 'crypto';

const pregnancyTests = [
  { name: "Pt Urine", unit: "", normalRange: "Positive/Negative", price: 5 },
  { name: "Pt Serum", unit: "", normalRange: "Positive/Negative", price: 5 },
];

async function addPregnancyTests() {
  try {
    console.log("🚀 Adding pregnancy tests...");
    
    for (const test of pregnancyTests) {
      await db.insert(tests).values({
        id: randomUUID(),
        name: test.name,
        unit: test.unit || undefined,
        normalRange: test.normalRange || undefined,
        price: test.price,
      });
      console.log(`✅ Added: ${test.name}`);
    }
    
    console.log(`\n✅ Successfully added ${pregnancyTests.length} pregnancy tests!`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding pregnancy tests:", error);
    process.exit(1);
  }
}

addPregnancyTests();
