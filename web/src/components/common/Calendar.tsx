import { useState, useEffect } from "react";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];

// Returns the day-of-week index (0=Mon..6=Sun) for the 1st of given month
function getFirstDayIndex(year: number, month: number) {
  const day = new Date(year, month, 1).getDay(); // 0=Sun
  return day === 0 ? 6 : day - 1; // shift so Mon=0
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];


interface CalendarProps {
  year?: number;
  month?: number;
  completed?: Set<number>;
  vacation?: Set<number>;
  selectedDate?: string;
  onSelectDate?: (dateStr: string) => void;
}

export default function Calendar({
  year: initialYear = 2026,
  month: initialMonth = 5, // 0-indexed, 5 = June
  completed: completedProp,
  vacation: vacationProp,
  selectedDate,
  onSelectDate,
}: CalendarProps) {
  const [year, setYear]   = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  // Sync state if selectedDate prop changes from external form
  useEffect(() => {
    if (selectedDate) {
      const parts = selectedDate.split('-');
      if (parts.length === 3) {
        setYear(parseInt(parts[0], 10));
        setMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [selectedDate]);

  const completed = completedProp ?? new Set();
  const vacation  = vacationProp  ?? new Set();

  const firstIdx   = getFirstDayIndex(year, month);
  const totalDays  = getDaysInMonth(year, month);

  const cells = [];
  for (let i = 0; i < firstIdx; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  const handleCellClick = (day: number | null) => {
    if (!day) return;
    const formattedDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (onSelectDate) {
      onSelectDate(formattedDate);
    }
  };

  return (
    <div style={s.wrapper}>
      {/* Header */}
      <div style={s.header}>
        <span style={s.headerTitle}>CHOOSE DATE</span>
      </div>

      {/* Month nav */}
      <div style={s.monthNav}>
        <button type="button" style={s.navBtn} onClick={prevMonth}>‹</button>
        <span style={s.monthLabel}>{MONTH_NAMES[month]} {year}</span>
        <button type="button" style={s.navBtn} onClick={nextMonth}>›</button>
      </div>

      {/* Calendar grid */}
      <div style={s.grid}>
        {/* Day headers */}
        {DAYS.map((d, i) => (
          <div key={i} style={s.dayHeader}>{d}</div>
        ))}

        {/* Date cells */}
        {cells.map((day, i) => {
          if (!day) return <div key={`e-${i}`} style={s.emptyCell} />;

          const isComplete = completed.has(day);
          const isVacation = vacation.has(day);
          
          const formattedCellDate = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const isSelected = selectedDate === formattedCellDate;

          const cellStyle = {
            ...s.cell,
            ...(isComplete ? s.cellComplete : {}),
            ...(isVacation ? s.cellVacation : {}),
            ...(isSelected ? s.cellSelected : {}),
            cursor: "pointer",
          };
          const numStyle = {
            ...s.cellNum,
            ...(isComplete || isVacation || isSelected ? s.cellNumActive : {}),
          };

          return (
            <div 
              key={day} 
              style={cellStyle}
              onClick={() => handleCellClick(day)}
            >
              <span style={numStyle}>{day}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Styles ── */
const s = {
  wrapper: {
    fontFamily: "'Inter', 'Helvetica Neue', Arial, sans-serif",
    background: "#fff",
    border: "1px solid #d0d0d0",
    borderRadius: 4,
    maxWidth: 380,
    margin: "0 auto",
    overflow: "hidden",
    userSelect: "none",
  },
  header: {
    padding: "18px 18px 10px",
    borderBottom: "1px solid #d0d0d0",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 900,
    letterSpacing: "-0.5px",
    color: "#111",
    textTransform: "uppercase",
    fontStyle: "italic",
  },

  /* Stats */
  stats: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    borderBottom: "1px solid #d0d0d0",
  },
  statCell: {
    padding: "10px 14px",
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#888",
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontWeight: 500,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 700,
    color: "#111",
    textAlign: "right",
    display: "block",
  },
  dot: {
    display: "inline-block",
    width: 9,
    height: 9,
    borderRadius: 2,
    flexShrink: 0,
  },

  /* Month nav */
  monthNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 14px",
    borderBottom: "1px solid #eee",
  },
  navBtn: {
    background: "none",
    border: "none",
    fontSize: 20,
    cursor: "pointer",
    color: "#555",
    padding: "0 6px",
    lineHeight: 1,
  },
  monthLabel: {
    fontSize: 13,
    fontWeight: 600,
    color: "#333",
  },

  /* Grid */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    borderTop: "1px solid #d0d0d0",
    borderLeft: "1px solid #d0d0d0",
  },
  dayHeader: {
    fontSize: 11,
    fontWeight: 700,
    color: "#888",
    textAlign: "center",
    padding: "8px 0",
    borderRight: "1px solid #d0d0d0",
    borderBottom: "1px solid #d0d0d0",
    background: "#fafafa",
    letterSpacing: "0.03em",
  },
  emptyCell: {
    borderRight: "1px solid #d0d0d0",
    borderBottom: "1px solid #d0d0d0",
    height: 44,
  },
  cell: {
    borderRight: "1px solid #d0d0d0",
    borderBottom: "1px solid #d0d0d0",
    height: 44,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "default",
    background: "#fff",
    transition: "background 0.1s",
  },
  cellComplete: {
    background: "#3ecf7e",
  },
  cellVacation: {
    background: "#7ecef4",
  },
  cellSelected: {
    background: "#000000",
  },
  cellNum: {
    fontSize: 13,
    fontWeight: 500,
    color: "#333",
  },
  cellNumActive: {
    color: "#fff",
    fontWeight: 700,
  },

  /* Legend */
  legend: {
    display: "flex",
    gap: 16,
    padding: "10px 14px",
    borderTop: "1px solid #eee",
  },
  legendItem: {
    fontSize: 12,
    color: "#666",
    display: "flex",
    alignItems: "center",
    gap: 5,
  },
} as const;