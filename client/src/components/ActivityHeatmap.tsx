import { useState } from "react";
import dayjs from "dayjs";

// Color scale using violet/cyan theme
const colorScale = [
	"#1a1a1a", // 0 mins (dark)
	"#c4b5fd", // 1-30 mins (light violet)
	"#8b5cf6", // 31-60 mins (violet)
	"#7c3aed", // 61-120 mins (dark violet)
	"#5b21b6", // 120+ mins (deep violet)
];

// Helper to get color index
function getColorIdx(mins: number) {
	if (mins === 0) return 0;
	if (mins <= 30) return 1;
	if (mins <= 60) return 2;
	if (mins <= 120) return 3;
	return 4;
}

// Generate mock data: 1 year, 52 weeks x 7 days
const today = dayjs();
const days: { date: string; mins: number }[] = [];
for (let w = 0; w < 52; w++) {
	for (let d = 0; d < 7; d++) {
		const date = today.subtract(52 * 7 - (w * 7 + d), "day");
		// Random study minutes for demo
		const mins = Math.random() < 0.2 ? 0 : Math.floor(Math.random() * 180);
		days.push({ date: date.format("YYYY-MM-DD"), mins });
	}
}

// Calculate streaks
function calcStreaks(days: { date: string; mins: number }[]) {
	let current = 0, longest = 0, total = 0;
	let streak = 0;
	for (let i = days.length - 1; i >= 0; i--) {
		if (days[i].mins > 0) {
			streak++;
			total++;
			if (streak > longest) longest = streak;
		} else {
			if (i === days.length - 1) current = streak;
			streak = 0;
		}
	}
	if (current === 0 && days[days.length - 1].mins > 0) current = streak;
	return { current, longest, total };
}

const streaks = calcStreaks(days);

const cellSize = 14;
const cellGap = 3;

export default function ActivityHeatmap() {
	const [hovered, setHovered] = useState<null | { date: string; mins: number }>(null);

	return (
		<div className="mb-8">
			<h2 className="font-serif text-xl text-white mb-4">Study Activity</h2>
			<div className="flex items-center">
				<svg width={52 * (cellSize + cellGap)} height={7 * (cellSize + cellGap)}>
					{days.map((day, idx) => {
						const x = Math.floor(idx / 7);
						const y = idx % 7;
						return (
							<rect
								key={day.date}
								x={x * (cellSize + cellGap)}
								y={y * (cellSize + cellGap)}
								width={cellSize}
								height={cellSize}
								rx={3}
								fill={colorScale[getColorIdx(day.mins)]}
								className="cursor-pointer transition-all duration-300 hover:brightness-125"
								onMouseEnter={() => setHovered(day)}
								onMouseLeave={() => setHovered(null)}
							/>
						);
					})}
				</svg>
				{/* Legend */}
				<div className="ml-8 flex items-center">
					<span className="text-neutral-600 text-xs mr-2">Less</span>
					{colorScale.map((color, i) => (
						<div key={i} className="w-5 h-5 mx-0.5 rounded" style={{ background: color }}></div>
					))}
					<span className="text-neutral-600 text-xs ml-2">More</span>
				</div>
			</div>
			{/* Tooltip */}
			{hovered && (
				<div className="mt-2 px-4 py-2 glass rounded-lg inline-block text-white text-xs">
					<span className="text-neutral-400">{hovered.date}</span> — <span>{hovered.mins} mins studied</span>
				</div>
			)}
			{/* Streak stats */}
			<div className="mt-4 flex space-x-6 text-neutral-400 text-sm">
				<div>Current streak: <span className="font-bold text-violet-300">{streaks.current}</span> days</div>
				<div>Longest streak: <span className="font-bold text-cyan-300">{streaks.longest}</span> days</div>
				<div>Total active days: <span className="font-bold text-white">{streaks.total}</span></div>
			</div>
		</div>
	);
}