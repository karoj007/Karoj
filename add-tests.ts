import { db } from '../server/db';
import { tests } from '../shared/schema';
import { randomUUID } from 'crypto';

const testData = [
  { name: "Glucose (Fasting)", unit: "mg/dL", normalRange: "70-100", price: 3 },
  { name: "BUN", unit: "mg/dL", normalRange: "7-20", price: 4 },
  { name: "Creatinine", unit: "mg/dL", normalRange: "0.6-1.3", price: 4 },
  { name: "Uric Acid", unit: "mg/dL", normalRange: "3.5-7.2", price: 4 },
  { name: "Total Cholesterol", unit: "mg/dL", normalRange: "<200", price: 5 },
  { name: "Triglycerides", unit: "mg/dL", normalRange: "<150", price: 5 },
  { name: "HDL Cholesterol", unit: "mg/dL", normalRange: ">40", price: 4 },
  { name: "LDL Cholesterol", unit: "mg/dL", normalRange: "<130", price: 5 },
  { name: "Calcium", unit: "mg/dL", normalRange: "8.5-10.2", price: 4 },
  { name: "Sodium", unit: "mmol/L", normalRange: "135-145", price: 3 },
  { name: "Potassium", unit: "mmol/L", normalRange: "3.5-5.1", price: 3 },
  { name: "Chloride", unit: "mmol/L", normalRange: "98-107", price: 3 },
  { name: "ALT (SGPT)", unit: "U/L", normalRange: "7-56", price: 5 },
  { name: "AST (SGOT)", unit: "U/L", normalRange: "10-40", price: 5 },
  { name: "Alkaline Phosphatase", unit: "U/L", normalRange: "44-147", price: 6 },
  { name: "Total Protein", unit: "g/dL", normalRange: "6-8.3", price: 4 },
  { name: "Albumin", unit: "g/dL", normalRange: "3.5-5", price: 4 },
  { name: "Total Bilirubin", unit: "mg/dL", normalRange: "0.1-1.2", price: 5 },
  { name: "Direct Bilirubin", unit: "mg/dL", normalRange: "0-0.3", price: 5 },
  { name: "LDH", unit: "U/L", normalRange: "140-280", price: 6 },
  { name: "CK", unit: "U/L", normalRange: "30-200", price: 5 },
  { name: "CK-MB", unit: "ng/mL", normalRange: "<5", price: 7 },
  { name: "Amylase", unit: "U/L", normalRange: "30-110", price: 5 },
  { name: "Lipase", unit: "U/L", normalRange: "10-140", price: 5 },
  { name: "Magnesium", unit: "mg/dL", normalRange: "1.7-2.2", price: 4 },
  { name: "Phosphorus", unit: "mg/dL", normalRange: "2.5-4.5", price: 4 },
  { name: "Iron", unit: "µg/dL", normalRange: "60-170", price: 5 },
  { name: "Ferritin", unit: "ng/mL", normalRange: "24-336 (M)/11-307 (F)", price: 10 },
  { name: "Transferrin", unit: "mg/dL", normalRange: "200-360", price: 6 },
  { name: "GGT", unit: "U/L", normalRange: "8-61 (M)/5-36 (F)", price: 6 },
  { name: "Total CO2", unit: "mmol/L", normalRange: "23-29", price: 3 },
  { name: "Prolactin", unit: "ng/mL", normalRange: "4-15.2 (M)/4.8-23.3 (F)", price: 10 },
  { name: "FSH", unit: "mIU/mL", normalRange: "1.5-12.4 (M)/3.5-12.5 (F)", price: 12 },
  { name: "LH", unit: "mIU/mL", normalRange: "1.7-8.6 (M)/2.4-12.6 (F)", price: 12 },
  { name: "Estradiol (E2)", unit: "pg/mL", normalRange: "10-40 (M)/30-400 (F)", price: 15 },
  { name: "Progesterone", unit: "ng/mL", normalRange: "0.2-1.4 (F Follicular)/3.3-26 (F Luteal)", price: 12 },
  { name: "Testosterone", unit: "ng/dL", normalRange: "300-1000 (M)/15-70 (F)", price: 12 },
  { name: "Cortisol (AM)", unit: "µg/dL", normalRange: "5-25", price: 10 },
  { name: "Cortisol (PM)", unit: "µg/dL", normalRange: "2-14", price: 10 },
  { name: "Insulin", unit: "µIU/mL", normalRange: "2-25", price: 15 },
  { name: "Vitamin D", unit: "ng/mL", normalRange: "30-100", price: 20 },
  { name: "PTH", unit: "pg/mL", normalRange: "10-65", price: 20 },
  { name: "Free T3", unit: "pg/mL", normalRange: "2.3-4.2", price: 12 },
  { name: "Free T4", unit: "ng/dL", normalRange: "0.8-1.8", price: 12 },
  { name: "Thyroglobulin", unit: "ng/mL", normalRange: "1.4-78", price: 12 },
  { name: "TPO-Ab", unit: "IU/mL", normalRange: "<35", price: 15 },
  { name: "Beta-hCG", unit: "mIU/mL", normalRange: "<5", price: 10 },
  { name: "HBsAg", unit: "", normalRange: "Negative", price: 12 },
  { name: "Anti-HBs", unit: "", normalRange: "Negative/Positive", price: 12 },
  { name: "Anti-HCV", unit: "", normalRange: "Negative", price: 12 },
  { name: "HIV 1/2", unit: "", normalRange: "Negative", price: 15 },
  { name: "VDRL", unit: "", normalRange: "Non-reactive", price: 8 },
  { name: "ASO", unit: "IU/mL", normalRange: "<200", price: 10 },
  { name: "RF", unit: "IU/mL", normalRange: "<14", price: 10 },
  { name: "CRP", unit: "mg/L", normalRange: "<5", price: 6 },
  { name: "Widal Test", unit: "", normalRange: "Negative", price: 8 },
  { name: "Toxoplasma IgG", unit: "IU/mL", normalRange: "<6/>10", price: 10 },
  { name: "Toxoplasma IgM", unit: "IU/mL", normalRange: "<0.6/>1.1", price: 10 },
  { name: "Rubella IgG", unit: "IU/mL", normalRange: "<10/>10", price: 10 },
  { name: "Rubella IgM", unit: "IU/mL", normalRange: "<0.8/>1.1", price: 10 },
  { name: "CMV IgG", unit: "IU/mL", normalRange: "<0.6/>1.0", price: 12 },
  { name: "CMV IgM", unit: "IU/mL", normalRange: "<0.6/>1.0", price: 12 },
  { name: "H. pylori Antibody", unit: "", normalRange: "Negative", price: 10 },
];

async function addTests() {
  try {
    console.log("🚀 Starting to add tests...");
    
    for (const test of testData) {
      await db.insert(tests).values({
        id: randomUUID(),
        name: test.name,
        unit: test.unit || undefined,
        normalRange: test.normalRange || undefined,
        price: test.price,
      });
      console.log(`✅ Added: ${test.name}`);
    }
    
    console.log(`\n✅ Successfully added ${testData.length} tests!`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Error adding tests:", error);
    process.exit(1);
  }
}

addTests();
