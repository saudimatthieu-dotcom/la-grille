// A league member, as shown in the ranking
export type RankedMember = {
  userId: string;
  username: string;
  avatar?: string | null;
};

// Sorts the members by points and marks the leader and the last place (lanterne rouge)
export function buildRanking(members: RankedMember[], pointsByUser: Record<string, number>) {
  const rows = members
    .map((member) => ({ ...member, points: pointsByUser[member.userId] ?? 0 }))
    .sort((a, b) => b.points - a.points);

  const maxPoints = rows[0]?.points ?? 0;
  const minPoints = rows[rows.length - 1]?.points ?? 0;

  // Everyone tied (e.g. 0 pts at the start): no crown and no lanterne rouge
  const hasGap = maxPoints > minPoints;

  return rows.map((row) => ({
    ...row,
    rank: rows.filter((other) => other.points > row.points).length + 1,
    isLeader: hasGap && row.points === maxPoints,
    isLastPlace: hasGap && row.points === minPoints,
  }));
}
