/**
 * Not Found page for debug routes
 */

export default function DebugNotFound() {
  return (
    <div style={{ padding: '2rem', fontFamily: 'monospace', maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>404 - Debug Route Not Found</h1>
      <p>The debug route you&apos;re looking for doesn&apos;t exist.</p>
      <p style={{ fontSize: '0.9em', color: '#666' }}>
        Available debug routes:
        <br />
        • <code>/[locale]/debug/atlantico</code>
      </p>
    </div>
  )
}



