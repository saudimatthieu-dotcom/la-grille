import express from "express";
import League from "../models/League.js";
import checkAuth from "../middlewares/auth.js";

const router = express.Router();

const CODE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

const generateCode = () => {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
};

router.get("/", checkAuth, async (req, res) => {
  const leagues = await League.find({ "members.user": req.userId });

  const result = leagues.map((league) => {
    const sorted = [...league.members].sort((a, b) => b.points - a.points);
    const rank = sorted.findIndex((m) => m.user.toString() === req.userId) + 1;
    return {
      _id: league._id,
      name: league.name,
      code: league.code,
      gridType: league.gridType,
      isPublic: league.isPublic,
      memberCount: league.members.length,
      rank,
    };
  });

  res.json({ result: true, leagues: result });
});

router.post("/", checkAuth, async (req, res) => {
  const { name, gridType } = req.body;
  if (!name) {
    return res.json({ result: false, error: "Missing parameters" });
  }

  let code;
  let existing;
  do {
    code = generateCode();
    existing = await League.findOne({ code });
  } while (existing);

  const league = await League.create({
    name,
    code,
    gridType,
    owner: req.userId,
    members: [{ user: req.userId, points: 0 }],
  });

  res.json({ result: true, league });
});

router.post("/join", checkAuth, async (req, res) => {
  const { code } = req.body;
  const league = await League.findOne({ code });
  if (!league) {
    return res.json({ result: false, error: "League not found" });
  }

  const alreadyMember = league.members.some((m) => m.user.toString() === req.userId);
  if (alreadyMember) {
    return res.json({ result: false, error: "ALREADY_MEMBER" });
  }

  league.members.push({ user: req.userId, points: 0 });
  await league.save();

  res.json({ result: true, league });
});

router.get("/:id", checkAuth, async (req, res) => {
  const league = await League.findById(req.params.id)
    .populate("owner", "username")
    .populate("members.user", "username avatar");

  if (!league) {
    return res.json({ result: false, error: "League not found" });
  }

  res.json({ result: true, league });
});

router.get("/:id/ranking", checkAuth, async (req, res) => {
  const league = await League.findById(req.params.id).populate("members.user", "username avatar");
  if (!league) {
    return res.json({ result: false, error: "League not found" });
  }

  const sorted = [...league.members].sort((a, b) => b.points - a.points);
  const ranking = sorted.map((member, index) => ({
    rank: index + 1,
    user: member.user,
    points: member.points,
    isLeader: index === 0,
    isLastPlace: index === sorted.length - 1,
  }));

  res.json({ result: true, ranking });
});

router.delete("/:id/leave", checkAuth, async (req, res) => {
  const league = await League.findById(req.params.id);
  if (!league) {
    return res.json({ result: false, error: "League not found" });
  }

  league.members = league.members.filter((m) => m.user.toString() !== req.userId);
  await league.save();

  res.json({ result: true });
});

export default router;
