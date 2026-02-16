export default function MaintenancePage() {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Maintenance - Atlantico Excursiones</title>
        <style dangerouslySetInnerHTML={{
          __html: `
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
              padding: 20px;
              color: #333;
            }
            .container {
              background: white;
              border-radius: 16px;
              padding: 48px 32px;
              max-width: 600px;
              width: 100%;
              box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
              text-align: center;
            }
            h1 {
              font-size: 32px;
              font-weight: 700;
              margin-bottom: 24px;
              color: #1a1a1a;
            }
            p {
              font-size: 18px;
              line-height: 1.6;
              margin-bottom: 16px;
              color: #555;
            }
            .cta-button {
              display: inline-block;
              margin-top: 32px;
              padding: 16px 32px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              text-decoration: none;
              border-radius: 8px;
              font-size: 18px;
              font-weight: 600;
              transition: transform 0.2s, box-shadow 0.2s;
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            }
            .cta-button:hover {
              transform: translateY(-2px);
              box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
            }
            .cta-button:active {
              transform: translateY(0);
            }
            @media (max-width: 640px) {
              .container {
                padding: 32px 24px;
              }
              h1 {
                font-size: 28px;
              }
              p {
                font-size: 16px;
              }
              .cta-button {
                padding: 14px 28px;
                font-size: 16px;
              }
            }
          `
        }} />
      </head>
      <body>
        <div className="container">
          <h1>Our website is currently under maintenance.</h1>
          <p>We are working on improvements to provide you with a better experience.</p>
          <p>In the meantime, we invite you to join the Tenerife Activity adventures via the link below:</p>
          <p>👉 <a href="https://en.atlanticoexcursiones.com/index.php?afId=3645" style={{ color: '#667eea', textDecoration: 'none' }}>https://en.atlanticoexcursiones.com/index.php?afId=3645</a></p>
          <p>Thank you for your understanding.</p>
          <a 
            href="https://en.atlanticoexcursiones.com/index.php?afId=3645" 
            target="_blank" 
            rel="noopener noreferrer"
            className="cta-button"
          >
            Discover Tenerife Activity
          </a>
        </div>
      </body>
    </html>
  )
}









