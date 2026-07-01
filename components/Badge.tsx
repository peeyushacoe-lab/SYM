export default function Badge({
  children,
  tone = 'gray',
}: {
  children: React.ReactNode;
  tone?: 'blue' | 'green' | 'red' | 'amber' | 'gray';
}) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}
