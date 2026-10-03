export default function Skeleton() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', padding: '1rem' }}>
      {[1, 2, 3].map((n) => (
        <div key={n} style={{ height: 200, background: '#e0e0e0', borderRadius: 8 }} />
      ))}
    </div>
  );
}