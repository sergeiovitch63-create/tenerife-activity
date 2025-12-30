import '../ui/styles/globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="relative z-10 min-h-screen">{children}</div>
      </body>
    </html>
  )
}
