import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type GradeChartDatum = { grade: string; count: number };

// Bar chart of how many products landed in each grade.
// The aria/role pair plus the hidden summary keep it readable for screen readers.
export default function GradeChart({ data, summary }: { data: GradeChartDatum[]; summary: string }) {
  return (
    <>
      <div className="chart" role="img" aria-label={summary}>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="grade" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#0f6e6e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="visually-hidden">{summary}</p>
    </>
  );
}
