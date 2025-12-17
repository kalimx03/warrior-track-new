import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Run `refreshActiveTheoryCodes` every minute to check for expired PINs
crons.interval(
  "refresh theory codes",
  { minutes: 5 },
  internal.sessions.refreshActiveTheoryCodes,
  {}
);

export default crons;
