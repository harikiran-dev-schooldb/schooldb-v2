import "dotenv/config";
import { clerkClient } from "@clerk/nextjs/server";

async function main() {
  const KEEP_CLERK_USER_ID = process.env.KEEP_CLERK_USER_ID;
  const secretKey = process.env.CLERK_SECRET_KEY;

  if (!KEEP_CLERK_USER_ID) {
    throw new Error("KEEP_CLERK_USER_ID is required.");
  }

  if (!secretKey?.startsWith("sk_live_")) {
    throw new Error("ABORTED: CLERK_SECRET_KEY is not a production Clerk key.");
  }

  console.log("Environment: PRODUCTION");
  console.log(`Protected Clerk user: ${KEEP_CLERK_USER_ID}`);

  const client = await clerkClient();

  const users: { id: string }[] = [];

  let offset = 0;
  const limit = 500;

  /*
   * STEP 1
   * Read every production Clerk user BEFORE deleting anything.
   */
  while (true) {
    const response = await client.users.getUserList({
      limit,
      offset,
    });

    users.push(
      ...response.data.map((user) => ({
        id: user.id,
      })),
    );

    offset += response.data.length;

    console.log(
      `Loaded ${users.length}/${response.totalCount} production users`,
    );

    if (response.data.length === 0 || offset >= response.totalCount) {
      break;
    }
  }

  /*
   * STEP 2
   * Verify the protected SUPER_ADMIN account actually exists.
   */
  const protectedUserExists = users.some(
    (user) => user.id === KEEP_CLERK_USER_ID,
  );

  if (!protectedUserExists) {
    throw new Error(
      `ABORTED: Protected SUPER_ADMIN ${KEEP_CLERK_USER_ID} was not found in this production Clerk instance.`,
    );
  }

  const toDelete = users.filter((user) => user.id !== KEEP_CLERK_USER_ID);

  console.log("");
  console.log("Deletion summary");
  console.log("----------------");
  console.log(`Production users found: ${users.length}`);
  console.log(`Keeping: ${KEEP_CLERK_USER_ID}`);
  console.log(`Deleting: ${toDelete.length}`);
  console.log("");

  /*
   * Additional sanity check.
   *
   * Your expected state is:
   * 3066 total users
   * 1 SUPER_ADMIN retained
   * 3065 deleted
   */
  if (users.length < 2) {
    throw new Error("ABORTED: Unexpectedly small production user count.");
  }

  /*
   * STEP 3
   * Delete only after the complete list has been captured.
   */
  let deleted = 0;
  const failed: Array<{
    userId: string;
    error: string;
  }> = [];

  for (const user of toDelete) {
    try {
      await client.users.deleteUser(user.id);
      deleted += 1;

      if (deleted % 50 === 0 || deleted === toDelete.length) {
        console.log(`Deleted ${deleted}/${toDelete.length}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      failed.push({
        userId: user.id,
        error: message,
      });

      console.error(`Failed deleting ${user.id}: ${message}`);
    }
  }

  console.log("");
  console.log("Finished.");
  console.log(`Successfully deleted: ${deleted}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Protected: ${KEEP_CLERK_USER_ID}`);

  if (failed.length) {
    console.error("");
    console.error("Failed Clerk users:");

    for (const item of failed) {
      console.error(`${item.userId}: ${item.error}`);
    }

    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
