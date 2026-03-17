import { db } from "@workspace/db";
import {
  complexesTable,
  unitsTable,
  invoicesTable,
  maintenanceRequestsTable,
  communicationsTable,
  documentsTable,
} from "@workspace/db";

async function seed() {
  console.log("Seeding database...");

  const [c1] = await db
    .insert(complexesTable)
    .values({
      name: "Sunset Ridge Estate",
      type: "Sectional Title",
      registrationNumber: "ST-2019-00142",
      address: "12 Sunset Drive, Cape Town, 8001",
      numberOfUnits: 24,
      agentName: "Jane Nkosi",
      agentEmail: "jane.nkosi@propmanage.co.za",
      agentPhone: "+27 21 555 0100",
    })
    .returning();

  const [c2] = await db
    .insert(complexesTable)
    .values({
      name: "Greenfield HOA",
      type: "HOA",
      registrationNumber: "HOA-2021-00078",
      address: "45 Greenfield Road, Sandton, 2196",
      numberOfUnits: 36,
      agentName: "Mark van der Berg",
      agentEmail: "mark@greenfieldhoa.co.za",
      agentPhone: "+27 11 555 0200",
    })
    .returning();

  const [c3] = await db
    .insert(complexesTable)
    .values({
      name: "The Palms Commercial Park",
      type: "Commercial",
      registrationNumber: "COM-2020-00231",
      address: "88 Palm Street, Durban, 4001",
      numberOfUnits: 12,
      agentName: "Priya Pillay",
      agentEmail: "priya@palmspark.co.za",
      agentPhone: "+27 31 555 0300",
    })
    .returning();

  const unitData = [
    { unitNumber: "101", floor: "1", size: 72, status: "Occupied", ownerName: "Thabo Molefe", ownerEmail: "thabo@email.com", ownerPhone: "+27 82 100 0001", tenantName: "Thabo Molefe", monthlyLevy: 1850, outstandingBalance: 0 },
    { unitNumber: "102", floor: "1", size: 68, status: "Occupied", ownerName: "Sarah Johnson", ownerEmail: "sarah@email.com", ownerPhone: "+27 82 100 0002", tenantName: "Tenant A", monthlyLevy: 1750, outstandingBalance: 1750 },
    { unitNumber: "103", floor: "1", size: 85, status: "Vacant", ownerName: "David Khumalo", ownerEmail: "david@email.com", ownerPhone: "+27 82 100 0003", monthlyLevy: 2100, outstandingBalance: 4200 },
    { unitNumber: "201", floor: "2", size: 72, status: "Occupied", ownerName: "Amanda Visser", ownerEmail: "amanda@email.com", ownerPhone: "+27 82 100 0004", tenantName: "Tenant B", monthlyLevy: 1850, outstandingBalance: 0 },
    { unitNumber: "202", floor: "2", size: 90, status: "Occupied", ownerName: "Sipho Dlamini", ownerEmail: "sipho@email.com", ownerPhone: "+27 82 100 0005", tenantName: "Sipho Dlamini", monthlyLevy: 2250, outstandingBalance: 2250 },
    { unitNumber: "203", floor: "2", size: 68, status: "Under Maintenance", ownerName: "Fatima Ahmed", ownerEmail: "fatima@email.com", ownerPhone: "+27 82 100 0006", monthlyLevy: 1750, outstandingBalance: 0 },
  ];

  const c1Units = await db.insert(unitsTable).values(unitData.map(u => ({ ...u, complexId: c1.id }))).returning();

  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  await db.insert(invoicesTable).values([
    { complexId: c1.id, unitId: c1Units[0].id, type: "Levy", amount: 1850, status: "Paid", dueDate: lastMonth, paidDate: new Date(lastMonth.getTime() + 5 * 86400000), description: "Monthly Levy - Feb 2025" },
    { complexId: c1.id, unitId: c1Units[1].id, type: "Levy", amount: 1750, status: "Overdue", dueDate: lastMonth, description: "Monthly Levy - Feb 2025" },
    { complexId: c1.id, unitId: c1Units[2].id, type: "Levy", amount: 2100, status: "Overdue", dueDate: lastMonth, description: "Monthly Levy - Feb 2025" },
    { complexId: c1.id, unitId: c1Units[3].id, type: "Levy", amount: 1850, status: "Paid", dueDate: lastMonth, paidDate: new Date(lastMonth.getTime() + 2 * 86400000), description: "Monthly Levy - Feb 2025" },
    { complexId: c1.id, unitId: c1Units[4].id, type: "Levy", amount: 2250, status: "Pending", dueDate: nextMonth, description: "Monthly Levy - Apr 2025" },
    { complexId: c1.id, unitId: c1Units[5].id, type: "Special Assessment", amount: 5000, status: "Pending", dueDate: nextMonth, description: "Plumbing Repairs Assessment" },
  ]);

  await db.insert(maintenanceRequestsTable).values([
    { complexId: c1.id, unitId: c1Units[2].id, title: "Burst pipe in bathroom", description: "Water leaking from burst pipe under bathroom basin", category: "Plumbing", priority: "Urgent", status: "In Progress", assignedTo: "Bob's Plumbing Co.", notes: "Technician on site" },
    { complexId: c1.id, unitId: c1Units[0].id, title: "Broken light fitting", description: "Light in lounge stopped working", category: "Electrical", priority: "Medium", status: "Open", assignedTo: "" },
    { complexId: c1.id, unitId: c1Units[4].id, title: "Garage door not opening", description: "Electric motor of garage door faulty", category: "Structural", priority: "High", status: "Open", assignedTo: "GaragePro" },
    { complexId: c1.id, unitId: c1Units[1].id, title: "Garden maintenance", description: "Common area garden needs trimming", category: "Landscaping", priority: "Low", status: "Completed", assignedTo: "Green Thumb Services", resolvedAt: new Date(Date.now() - 7 * 86400000) },
  ]);

  await db.insert(communicationsTable).values([
    { complexId: c1.id, subject: "Monthly Newsletter - March 2025", body: "Dear Residents,\n\nWelcome to our monthly newsletter. We would like to remind all residents that levies are due by the 1st of each month...", type: "Newsletter", sentTo: "All Units", recipientCount: 6, sentAt: new Date(Date.now() - 14 * 86400000) },
    { complexId: c1.id, subject: "Water Outage Notice", body: "Please be advised that there will be a scheduled water outage on Thursday 20 March from 09:00 to 13:00 for maintenance.", type: "Notice", sentTo: "All Units", recipientCount: 6, sentAt: new Date(Date.now() - 7 * 86400000) },
    { complexId: c1.id, subject: "AGM Reminder - April 15", body: "This is a reminder that the Annual General Meeting will be held on April 15 at 18:00 in the community hall..", type: "Reminder", sentTo: "All Units", recipientCount: 6, sentAt: new Date(Date.now() - 2 * 86400000) },
  ]);

  await db.insert(documentsTable).values([
    { complexId: c1.id, name: "Conduct Rules 2024", category: "Rules", fileUrl: "#", fileSize: "245 KB" },
    { complexId: c1.id, name: "Insurance Certificate 2025", category: "Insurance", fileUrl: "#", fileSize: "1.2 MB" },
    { complexId: c1.id, name: "Financial Statements Q4 2024", category: "Financial", fileUrl: "#", fileSize: "890 KB" },
    { complexId: c1.id, name: "Management Agreement", category: "Contract", fileUrl: "#", fileSize: "340 KB" },
    { complexId: c1.id, unitId: c1Units[0].id, name: "Lease Agreement - Unit 101", category: "Contract", fileUrl: "#", fileSize: "280 KB" },
  ]);

  const c2UnitData = Array.from({ length: 8 }, (_, i) => ({
    complexId: c2.id,
    unitNumber: `${Math.floor(i / 4) + 1}${String(i % 4 + 1).padStart(2, "0")}`,
    floor: String(Math.floor(i / 4) + 1),
    size: 120 + i * 10,
    status: i % 3 === 0 ? "Vacant" : "Occupied",
    ownerName: `Owner ${i + 1}`,
    ownerEmail: `owner${i + 1}@greenfield.co.za`,
    monthlyLevy: 3500 + i * 100,
    outstandingBalance: i % 3 === 0 ? 3500 : 0,
  }));

  await db.insert(unitsTable).values(c2UnitData);

  const c3UnitData = Array.from({ length: 4 }, (_, i) => ({
    complexId: c3.id,
    unitNumber: `Shop ${i + 1}`,
    floor: "Ground",
    size: 200 + i * 50,
    status: i === 2 ? "Vacant" : "Occupied",
    ownerName: `Business Owner ${i + 1}`,
    monthlyLevy: 8000 + i * 500,
    outstandingBalance: i === 2 ? 8000 : 0,
  }));

  await db.insert(unitsTable).values(c3UnitData);

  console.log("Seed complete! Created:");
  console.log("- 3 complexes");
  console.log("- " + (unitData.length + c2UnitData.length + c3UnitData.length) + " units");
  console.log("- 6 invoices");
  console.log("- 4 maintenance requests");
  console.log("- 3 communications");
  console.log("- 5 documents");
}

seed().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
