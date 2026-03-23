import { useState } from "react";
import dayjs from "dayjs";

// Color scale for minutes studied
const colorScale = [
	"#2d2d2d", // 0 mins (grey)
	"#a7f3d0", // 1-30 mins (light green)
	"#34d399", // 31-60 mins (medium green)
	"#059669", // 61-120 mins (dark green)
	"#065f46", // 120+ mins (deep green)
];

// Helper to get color index
function getColorIdx(mins: number) {
	if (mins === -1) return -1; // blank day
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

		const rand = Math.random();
		let mins: number;
		
		// 45% completely blank days (more inconsistency)
		if (rand < 0.45) {
		  mins = -1;
		}
		// 15% very low activity
		else if (rand < 0.6) {
		  mins = 0;
		}
		// 25% medium activity
		else if (rand < 0.85) {
		  mins = Math.floor(Math.random() * 60) + 1;
		}
		// 15% high activity
		else {
		  mins = Math.floor(Math.random() * 180) + 60;
		}

		days.push({ date: date.format("YYYY-MM-DD"), mins });
	}
}

// Calculate streaks (ignore blank days)
function calcStreaks(days: { date: string; mins: number }[]) {
	let current = 0,
		longest = 0,
		total = 0;
	let streak = 0;

	for (let i = days.length - 1; i >= 0; i--) {
		if (days[i].mins > 0) {
			streak++;
			total++;
			if (streak > longest) longest = streak;
		} else if (days[i].mins === 0) {
			if (i === days.length - 1) current = streak;
			streak = 0;
		}
		// mins === -1 → ignore (no reset)
	}

	if (current === 0 && days[days.length - 1].mins > 0) {
		current = streak;
	}

	return { current, longest, total };
}

const streaks = calcStreaks(days);

const cellSize = 14;
const cellGap = 3;

export default function ActivityHeatmap() {
	const [hovered, setHovered] = useState<null | { date: string; mins: number }>(null);

	return (
		<div className="mb-8">
			<h2 className="text-xl font-semibold text-white mb-4">Study Activity</h2>

			<div className="flex items-center">
				<svg width={52 * (cellSize + cellGap)} height={7 * (cellSize + cellGap)}>
					{days.map((day, idx) => {
						const x = Math.floor(idx / 7);
						const y = idx % 7;
						const colorIdx = getColorIdx(day.mins);

						return (
							<rect
								key={day.date}
								x={x * (cellSize + cellGap)}
								y={y * (cellSize + cellGap)}
								width={cellSize}
								height={cellSize}
								rx={3}
								fill={colorIdx === -1 ? "#1f2937" : colorScale[colorIdx]}
								className="cursor-pointer transition duration-150"
								onMouseEnter={() => setHovered(day)}
								onMouseLeave={() => setHovered(null)}
							/>
						);
					})}
				</svg>

				{/* Legend */}
				<div className="ml-8 flex items-center">
					<span className="text-gray-400 text-xs mr-2">Less</span>
					{colorScale.map((color, i) => (
						<div key={i} className="w-5 h-5 mx-1 rounded bg-white/10 flex items-center justify-center">
							<div
								style={{
									background: color,
									width: 16,
									height: 16,
									borderRadius: 4,
								}}
							></div>
						</div>
					))}
					<span className="text-gray-400 text-xs ml-2">More</span>
				</div>
			</div>

			{/* Tooltip */}
			{hovered && (
				<div className="mt-2 px-4 py-2 bg-black/80 rounded shadow-lg inline-block text-white text-xs">
					<span>{hovered.date}</span> —{" "}
					<span>
						{hovered.mins === -1
							? "No data"
							: `${hovered.mins} mins studied`}
					</span>
				</div>
			)}

			{/* Streak stats */}
			<div className="mt-4 flex space-x-6 text-white text-sm">
				<div>
					Current streak:{" "}
					<span className="font-bold">{streaks.current}</span> days
				</div>
				<div>
					Longest streak:{" "}
					<span className="font-bold">{streaks.longest}</span> days
				</div>
				<div>
					Total active days:{" "}
					<span className="font-bold">{streaks.total}</span>
				</div>
			</div>
		</div>
	);
}