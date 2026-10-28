import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RecipientChartDatum } from '../../domain/calculations/dashboard';
import type { AppSettings } from '../../domain/entities';
import { formatMoney } from '../../domain/money';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../../components/ui/Table';
import styles from './BudgetActualChart.module.css';

interface BudgetActualChartProps {
  data: readonly RecipientChartDatum[];
  settings: AppSettings;
}

export function BudgetActualChart({ data, settings }: BudgetActualChartProps) {
  const moneyOptions = {
    fractionDigits: settings.fractionDigits,
    currencySymbol: settings.currencySymbol,
    locale: settings.locale,
  };
  const chartHeight = Math.max(260, data.length * 52 + 80);
  const formatTick = (value: number | string) => formatMoney(Number(value), moneyOptions);
  const formatValue = (value: number | string | readonly (number | string)[] | undefined) => {
    const first = Array.isArray(value) ? value[0] : value;
    return formatMoney(first === undefined ? null : Number(first), moneyOptions);
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.chartFrame} aria-hidden="true">
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 24, bottom: 8, left: 8 }}
            barGap={4}
            accessibilityLayer={false}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
            <XAxis
              type="number"
              tickFormatter={formatTick}
              tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }}
              stroke="var(--color-border-strong)"
            />
            <YAxis
              type="category"
              dataKey="name"
              width={112}
              tick={{ fontSize: 12, fill: 'var(--color-text-soft)' }}
              stroke="var(--color-border-strong)"
            />
            <Tooltip formatter={formatValue} />
            <Legend wrapperStyle={{ fontSize: '0.78rem' }} />
            <Bar
              dataKey="plannedMinor"
              name="Planned"
              fill="var(--color-gold-500)"
              radius={[0, 4, 4, 0]}
              maxBarSize={14}
            />
            <Bar
              dataKey="actualMinor"
              name="Actual"
              fill="var(--color-evergreen-600)"
              radius={[0, 4, 4, 0]}
              maxBarSize={14}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <details className={styles.details} open>
        <summary>Chart data as a table</summary>
        <Table label="Budget versus actual spending by recipient">
          <TableHead>
            <TableRow>
              <TableHeaderCell>Recipient</TableHeaderCell>
              <TableHeaderCell>Planned</TableHeaderCell>
              <TableHeaderCell>Actual</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.recipientId}>
                <TableCell>{row.name}</TableCell>
                <TableCell>{formatMoney(row.plannedMinor, moneyOptions)}</TableCell>
                <TableCell>{formatMoney(row.actualMinor, moneyOptions)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </details>
    </div>
  );
}
