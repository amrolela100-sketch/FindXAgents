import { hashPassword } from "../artifacts/api-server/src/lib/auth";
import { db, users } from "../lib/db/src/index";

async function seedUser() {
  const email = "test@example.com";
  const password = "Password123!";
  const passwordHash = await hashPassword(password);

  try {
    await db.insert(users).values({
      email: email.toLowerCase(),
      passwordHash,
      role: "user"
    });
    console.log(`User ${email} created successfully!`);
  } catch (err: any) {
    console.error("Error seeding user:", err.message);
  } finally {
    process.exit(0);
  }
}

seedUser();
