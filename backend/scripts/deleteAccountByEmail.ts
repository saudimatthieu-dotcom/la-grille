import "dotenv/config";
import "../models/connection";
import User from "../models/users";
import { deleteUserData } from "../modules/deleteAccount";

const email = process.argv[2];
const confirmed = process.argv[3] === "--yes";

async function main() {
    if (!email) {
        console.log("Usage: npx tsx scripts/deleteAccountByEmail.ts <email> [--yes]");
        return;
    }

    // Collation strength 2 = ignores upper/lower case, so "Marie@Gmail.com" finds "marie@gmail.com"
    const user = await User.findOne({ email: email.trim() }).collation({ locale: "en", strength: 2 });

    if (!user) {
        console.log("No user with this email");
        return;
    }

    console.log(`Found: ${user.username} (${user._id})`);
    if (!confirmed) {
        console.log("Nothing deleted. Run again with --yes to delete.");
        return;
    }

    await deleteUserData(user._id);
    await User.deleteOne({ _id: user._id });
    console.log("Deleted");
}

    main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => process.exit());